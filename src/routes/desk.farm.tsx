import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, Download, Pencil, Plus, RotateCcw, Sprout } from "lucide-react";
import { Card, Field, inputClass, Page, Primary, TopBar, ugx } from "@/components/chrome";
import {
  createInventoryItem,
  getFarmWorkspace,
  recordStockMovement,
  saveFarm,
  saveFarmEntry,
  setEntryArchived,
  setFarmArchived,
  type Farm,
  type FarmEntry,
  type InventoryItem,
  type StockMovement,
} from "@/lib/farm.functions";
import {
  displayDate, entryModules, financeTotals, moduleLabels, todayInUganda,
  type EntryModule,
} from "@/lib/farm-entry-rules";
import { defaultCategory, recordChoices, recordUnits, type RecordCategory } from "@/lib/record-catalog";
import { useDesk } from "@/lib/use-desk";

export const Route = createFileRoute("/desk/farm")({ component: FarmPage });

const PAGE_SIZE = 10;

type EntryFormState = {
  id?: number;
  module: EntryModule;
  name: string;
  detail: string;
  status: string;
  quantity: string;
  unit: string;
  amount: string;
  date: string;
};

function emptyEntry(module: EntryModule): EntryFormState {
  const category = defaultCategory(module);
  const name = recordChoices(category, module)[0] ?? "";
  return {
    module,
    name,
    detail: "",
    status: module === "finance" ? "Income" : "Active",
    quantity: "1",
    unit: recordUnits(category, name, module)[0] ?? "",
    amount: "0",
    date: todayInUganda(),
  };
}

function exportEntriesCsv(entries: FarmEntry[], farmName: string) {
  const quote = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [
    ["Module", "Name", "Details", "Status", "Quantity", "Unit", "Amount (UGX)", "Date"],
    ...entries.map((e) => [moduleLabels[e.module], e.name, e.detail, e.status, e.quantity, e.unit, e.amountUgx, displayDate(e.recordDate)]),
  ].map((row) => row.map(quote).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `farm-records-${farmName.toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function RecordFields({ form, setForm, module }: {
  form: EntryFormState;
  setForm: (next: EntryFormState) => void;
  module: EntryModule;
}) {
  const suggested = defaultCategory(module);
  const initialCategory = form.name && !recordChoices(suggested, module).includes(form.name) ? "custom" : suggested;
  const [category, setCategory] = useState<RecordCategory>(initialCategory);
  const choices = recordChoices(category, module);
  const units = recordUnits(category, form.name, module);

  function changeCategory(next: RecordCategory) {
    const nextName = recordChoices(next, module)[0] ?? "";
    setForm({
      ...form,
      name: nextName,
      unit: recordUnits(next, nextName, module)[0] ?? "",
    });
    setCategory(next);
  }

  return (
    <>
      <Field label="Record type">
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: "crops", label: "Crops" },
            { value: "animals", label: "Animals" },
            { value: "custom", label: "Custom" },
          ] as const).map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={category === c.value}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${category === c.value ? "border-moss bg-moss text-surface" : "border-line bg-paper"}`}
              onClick={() => changeCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label={category === "crops" ? "Crop" : category === "animals" ? "Animal" : "Name"}>
        {category === "custom" ? (
          <input
            className={inputClass}
            value={form.name}
            maxLength={150}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        ) : (
          <select
            className={inputClass}
            aria-label={category === "crops" ? "Crop" : "Animal"}
            value={choices.includes(form.name) ? form.name : choices[0] ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value, unit: recordUnits(category, e.target.value, module)[0] ?? "" })}
          >
            {choices.map((n) => <option key={n}>{n}</option>)}
          </select>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity">
          <input className={inputClass} type="number" min="0" step="0.001" value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </Field>
        <Field label="Unit">
          <select className={inputClass} aria-label="Unit" value={units.includes(form.unit) ? form.unit : units[0] ?? ""}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            {[...new Set([...units, ...(form.unit ? [form.unit] : [])])].map((u) => <option key={u}>{u}</option>)}
          </select>
        </Field>
      </div>
    </>
  );
}

function FarmPage() {
  const { profile, isPending } = useDesk();
  const [data, setData] = useState<Awaited<ReturnType<typeof getFarmWorkspace>> | null>(null);
  const [farmId, setFarmId] = useState("");
  const [module, setModule] = useState<EntryModule>("crops");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [entryForm, setEntryForm] = useState<EntryFormState | null>(null);
  const [farmForm, setFarmForm] = useState<Partial<Farm> | null>(null);
  const [itemForm, setItemForm] = useState<{ name: string; unit: string; minimum: string } | null>(null);
  const [movement, setMovement] = useState<InventoryItem | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    void getFarmWorkspace()
      .then(setData)
      .catch((err: unknown) => setMessage(err instanceof Error ? err.message : "Could not load your farm."));
  }

  useEffect(() => {
    if (profile) load();
  }, [profile]);

  const farms = data?.farms ?? [];
  const activeFarm = farms.find((f) => String(f.id) === farmId) ?? farms.find((f) => !f.archived) ?? farms[0];
  const entries = data?.entries ?? [];
  const items = useMemo(
    () => (data?.items ?? []).filter((i) => !activeFarm || i.farmId === activeFarm.id),
    [data, activeFarm],
  );
  const movements = useMemo(
    () => (data?.movements ?? []).filter((m) => items.some((i) => i.id === m.itemId)),
    [data, items],
  );

  const rows = useMemo(() => {
    if (!activeFarm) return [];
    return entries.filter((e) =>
      e.farmId === activeFarm.id
      && e.module === module
      && (!!e.archivedAt === showArchived)
      && (!search
        || e.name.toLowerCase().includes(search.toLowerCase())
        || e.detail.toLowerCase().includes(search.toLowerCase())
        || e.status.toLowerCase().includes(search.toLowerCase())),
    );
  }, [entries, activeFarm, module, search, showArchived]);

  useEffect(() => {
    setPage(1);
  }, [module, search, showArchived, farmId]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = useMemo(
    () => rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    [rows, current],
  );
  const rangeStart = rows.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(current * PAGE_SIZE, rows.length);

  const totals = financeTotals(entries.map((e) => ({
    module: e.module, status: e.status, amountUgx: e.amountUgx, archivedAt: e.archivedAt,
  })));

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeFarm || !entryForm) return;
    setBusy(true);
    setMessage("");
    try {
      await saveFarmEntry({
        data: {
          ...(entryForm.id ? { id: entryForm.id } : {}),
          farmId: activeFarm.id,
          module: entryForm.module,
          name: entryForm.name,
          detail: entryForm.detail,
          status: entryForm.status,
          quantity: Number(entryForm.quantity),
          unit: entryForm.unit,
          amount: Number(entryForm.amount || 0),
          date: entryForm.date,
        },
      });
      setEntryForm(null);
      load();
      setMessage("Record saved to your farm.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to save this record.");
    } finally {
      setBusy(false);
    }
  }

  async function submitFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(event.currentTarget);
    try {
      const result = await saveFarm({
        data: {
          ...(farmForm?.id ? { id: farmForm.id } : {}),
          name: String(f.get("name") ?? ""),
          district: String(f.get("district") ?? ""),
          village: String(f.get("village") ?? ""),
          sizeAcres: Number(f.get("size") ?? 0),
          soilType: String(f.get("soil") ?? ""),
          waterSource: String(f.get("water") ?? ""),
          farmType: String(f.get("type") ?? ""),
        },
      });
      setFarmForm(null);
      load();
      setMessage(farmForm?.id ? "Farm updated." : "Farm created.");
      if (!farmForm?.id && result.id) setFarmId(String(result.id));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to save the farm.");
    } finally {
      setBusy(false);
    }
  }

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeFarm || !itemForm) return;
    setBusy(true);
    setMessage("");
    try {
      await createInventoryItem({
        data: {
          farmId: activeFarm.id,
          name: itemForm.name,
          unit: itemForm.unit,
          minimum: Number(itemForm.minimum || 0),
        },
      });
      setItemForm(null);
      load();
      setMessage("Stock item saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to save the stock item.");
    } finally {
      setBusy(false);
    }
  }

  async function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeFarm || !movement) return;
    setBusy(true);
    setMessage("");
    const f = new FormData(event.currentTarget);
    try {
      await recordStockMovement({
        data: {
          itemId: movement.id,
          farmId: activeFarm.id,
          quantity: Number(f.get("quantity")) * (f.get("direction") === "out" ? -1 : 1),
          reason: String(f.get("reason") ?? ""),
          date: String(f.get("date") ?? ""),
        },
      });
      setMovement(null);
      load();
      setMessage("Stock movement recorded.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to record the movement.");
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return (
      <>
        <TopBar />
        <Page><p>Loading your farm…</p></Page>
      </>
    );
  }
  if (!profile) return null;

  return (
    <>
      <TopBar profile={profile} />
      <Page>
        <h1 className="font-display text-4xl text-moss-deep">Farm records</h1>
        <p className="mt-2 text-muted">
          Crops, livestock, poultry, produce, money and store records for your farms. Records stay private to your account.
        </p>

        {!farms.length ? (
          <Card className="mt-6">
            <Sprout className="size-8 text-moss" />
            <h2 className="mt-3 font-display text-2xl">Add your first farm</h2>
            <p className="mt-1 text-sm text-muted">A farm holds your records, stock items and the store ledger.</p>
          </Card>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <select
            className={`${inputClass} max-w-72`}
            aria-label="Choose farm"
            value={activeFarm ? String(activeFarm.id) : ""}
            onChange={(e) => setFarmId(e.target.value)}
          >
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}{f.archived ? " (archived)" : ""} · {f.district || "no district"}
              </option>
            ))}
          </select>
          <button type="button" className="rounded-full border border-line bg-surface px-4 py-3 text-sm font-semibold"
            onClick={() => setFarmForm({})}>
            <Plus className="mr-1 inline size-4" /> New farm
          </button>
          {activeFarm ? (
            <>
              <button type="button" className="rounded-full border border-line bg-surface px-4 py-3 text-sm font-semibold"
                onClick={() => setFarmForm(activeFarm)}>
                <Pencil className="mr-1 inline size-4" /> Edit farm
              </button>
              <button type="button" className="rounded-full border border-line bg-surface px-4 py-3 text-sm font-semibold"
                onClick={() => void setFarmArchived({ data: { id: activeFarm.id, archived: !activeFarm.archived } }).then(load)}>
                {activeFarm.archived
                  ? <><RotateCcw className="mr-1 inline size-4" /> Restore farm</>
                  : <><Archive className="mr-1 inline size-4" /> Archive farm</>}
              </button>
              <button type="button" className="rounded-full border border-line bg-surface px-4 py-3 text-sm font-semibold"
                onClick={() => exportEntriesCsv(entries.filter((e) => e.farmId === activeFarm.id && !e.archivedAt), activeFarm.name)}>
                <Download className="mr-1 inline size-4" /> Export CSV
              </button>
            </>
          ) : null}
        </div>

        {activeFarm ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Card><p className="text-sm text-muted">Farm income</p><p className="font-display text-2xl">{ugx(totals.income)}</p></Card>
            <Card><p className="text-sm text-muted">Farm expenses</p><p className="font-display text-2xl">{ugx(totals.expense)}</p></Card>
            <Card><p className="text-sm text-muted">Net profit</p><p className="font-display text-2xl text-moss-deep">{ugx(totals.profit)}</p></Card>
          </div>
        ) : null}

        {farmForm !== null ? (
          <Card className="mt-4">
            <h2 className="font-display text-2xl">{farmForm.id ? "Edit farm" : "New farm"}</h2>
            <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={submitFarm}>
              <Field label="Farm name"><input className={inputClass} name="name" required maxLength={150} defaultValue={farmForm.name ?? ""} /></Field>
              <Field label="District"><input className={inputClass} name="district" defaultValue={farmForm.district ?? ""} /></Field>
              <Field label="Village"><input className={inputClass} name="village" defaultValue={farmForm.village ?? ""} /></Field>
              <Field label="Size (acres)"><input className={inputClass} name="size" type="number" min="0" step="0.1" defaultValue={farmForm.sizeAcres ?? 0} /></Field>
              <Field label="Soil type"><input className={inputClass} name="soil" defaultValue={farmForm.soilType ?? ""} /></Field>
              <Field label="Water source"><input className={inputClass} name="water" defaultValue={farmForm.waterSource ?? ""} /></Field>
              <Field label="Farm type">
                <select className={inputClass} name="type" defaultValue={farmForm.farmType ?? "Mixed farming"}>
                  <option>Mixed farming</option><option>Crops</option><option>Livestock</option>
                  <option>Poultry</option><option>Dairy</option>
                </select>
              </Field>
              <div className="flex gap-2 md:col-span-2">
                <Primary type="submit" disabled={busy}>Save farm</Primary>
                <button type="button" className="rounded-full px-4 py-3 text-sm font-semibold text-muted" onClick={() => setFarmForm(null)}>Cancel</button>
              </div>
            </form>
          </Card>
        ) : null}

        {activeFarm ? (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-2">
              {entryModules.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setModule(m); setShowArchived(false); }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${module === m ? "bg-moss text-surface" : "border border-line bg-surface text-ink"}`}
                >
                  {moduleLabels[m]}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                className={`${inputClass} max-w-64`}
                placeholder="Search records"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                Show archived
              </label>
              <button type="button" className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-surface"
                onClick={() => setEntryForm(emptyEntry(module))}>
                <Plus className="mr-1 inline size-4" /> Add {moduleLabels[module].toLowerCase()} record
              </button>
            </div>

            {message ? <p className="mt-3 text-sm font-semibold text-clay">{message}</p> : null}

            <ul className="mt-4 divide-y divide-line rounded-card border border-line bg-surface">
              {visible.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {r.name}
                      {r.archivedAt ? <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-xs uppercase text-muted">Archived</span> : null}
                    </p>
                    {r.detail ? <p className="mt-1 text-muted">{r.detail}</p> : null}
                    <p className="mt-1 text-muted">
                      {r.status} · {displayDate(r.recordDate)} · {r.quantity} {r.unit}
                      {r.amountUgx > 0 ? ` · ${ugx(r.amountUgx)}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" aria-label={`Edit ${r.name}`} className="rounded-full border border-line px-3 py-2"
                      disabled={activeFarm.archived}
                      onClick={() => setEntryForm({
                        id: r.id, module: r.module, name: r.name, detail: r.detail, status: r.status,
                        quantity: String(r.quantity), unit: r.unit, amount: String(r.amountUgx), date: r.recordDate,
                      })}>
                      <Pencil className="size-4" />
                    </button>
                    <button type="button" aria-label={`${r.archivedAt ? "Restore" : "Archive"} ${r.name}`}
                      className="rounded-full border border-line px-3 py-2"
                      onClick={() => void setEntryArchived({ data: { id: r.id, farmId: r.farmId, restore: !!r.archivedAt } }).then(load)}>
                      {r.archivedAt ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}
                    </button>
                  </div>
                </li>
              ))}
              {!rows.length ? <li className="px-4 py-8 text-center text-muted">No {moduleLabels[module].toLowerCase()} records{showArchived ? " in the archive" : ""}.</li> : null}
            </ul>

            {rows.length > PAGE_SIZE ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted">Showing {rangeStart}–{rangeEnd} of {rows.length}</span>
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded-full border border-line bg-surface px-3 py-2 font-semibold disabled:opacity-40"
                    disabled={current <= 1} onClick={() => setPage(current - 1)}>
                    Previous
                  </button>
                  <span className="font-semibold">Page {current} of {totalPages}</span>
                  <button type="button" className="rounded-full border border-line bg-surface px-3 py-2 font-semibold disabled:opacity-40"
                    disabled={current >= totalPages} onClick={() => setPage(current + 1)}>
                    Next
                  </button>
                </div>
              </div>
            ) : null}

            {entryForm ? (
              <Card className="mt-4">
                <h2 className="font-display text-2xl">{entryForm.id ? "Edit record" : `New ${moduleLabels[entryForm.module].toLowerCase()} record`}</h2>
                <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={submitEntry}>
                  <RecordFields form={entryForm} setForm={setEntryForm} module={entryForm.module} />
                  <Field label="Details"><input className={inputClass} value={entryForm.detail} maxLength={2000}
                    onChange={(e) => setEntryForm({ ...entryForm, detail: e.target.value })} /></Field>
                  <Field label="Date"><input className={inputClass} type="date" value={entryForm.date}
                    onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })} /></Field>
                  {entryForm.module === "finance" ? (
                    <>
                      <Field label="Type">
                        <select className={inputClass} value={entryForm.status}
                          onChange={(e) => setEntryForm({ ...entryForm, status: e.target.value })}>
                          <option>Income</option><option>Expense</option>
                        </select>
                      </Field>
                      <Field label="Amount (UGX)"><input className={inputClass} type="number" min="0" step="1" value={entryForm.amount}
                        onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })} /></Field>
                    </>
                  ) : (
                    <Field label="Status">
                      <select className={inputClass} value={entryForm.status}
                        onChange={(e) => setEntryForm({ ...entryForm, status: e.target.value })}>
                        <option>Active</option><option>Growing</option><option>Harvesting</option>
                        <option>Planned</option><option>Healthy</option>
                      </select>
                    </Field>
                  )}
                  <div className="flex gap-2 md:col-span-2">
                    <Primary type="submit" disabled={busy}>Save record</Primary>
                    <button type="button" className="rounded-full px-4 py-3 text-sm font-semibold text-muted" onClick={() => setEntryForm(null)}>Cancel</button>
                  </div>
                </form>
              </Card>
            ) : null}

            <h2 className="mt-10 font-display text-2xl">Store ledger</h2>
            <p className="mt-1 text-sm text-muted">
              Items and an append-only stock ledger. The ledger refuses movements that would leave negative stock.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold"
                onClick={() => setItemForm({ name: "", unit: "kg", minimum: "0" })}>
                <Plus className="mr-1 inline size-4" /> New stock item
              </button>
            </div>
            <div className="mt-4 overflow-x-auto rounded-card border border-line bg-surface">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Minimum</th>
                    <th className="px-4 py-3">Movement</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-semibold">
                        {i.name}
                        {i.archivedAt ? <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-xs uppercase text-muted">Archived</span> : null}
                        {i.balance < i.minimumStock ? <span className="ml-2 rounded-full bg-clay/10 px-2 py-0.5 text-xs font-semibold text-clay">Low</span> : null}
                      </td>
                      <td className="px-4 py-3">{i.balance} {i.unit}</td>
                      <td className="px-4 py-3">{i.minimumStock} {i.unit}</td>
                      <td className="px-4 py-3">
                        <button type="button" disabled={!!i.archivedAt || activeFarm.archived}
                          className="rounded-full bg-moss px-3 py-2 text-xs font-semibold text-surface disabled:opacity-50"
                          onClick={() => setMovement(i)}>
                          Record movement
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!items.length ? <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No stock items yet.</td></tr> : null}
                </tbody>
              </table>
            </div>

            {itemForm ? (
              <Card className="mt-4">
                <h3 className="font-display text-xl">New stock item</h3>
                <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={submitItem}>
                  <Field label="Item name"><input className={inputClass} value={itemForm.name} maxLength={150}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></Field>
                  <Field label="Unit"><input className={inputClass} value={itemForm.unit} maxLength={30}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} /></Field>
                  <Field label="Minimum stock"><input className={inputClass} type="number" min="0" step="0.001" value={itemForm.minimum}
                    onChange={(e) => setItemForm({ ...itemForm, minimum: e.target.value })} /></Field>
                  <div className="flex gap-2 md:col-span-3">
                    <Primary type="submit" disabled={busy}>Save item</Primary>
                    <button type="button" className="rounded-full px-4 py-3 text-sm font-semibold text-muted" onClick={() => setItemForm(null)}>Cancel</button>
                  </div>
                </form>
              </Card>
            ) : null}

            {movement ? (
              <Card className="mt-4">
                <h3 className="font-display text-xl">Move stock · {movement.name}</h3>
                <p className="mt-1 text-sm text-muted">Current balance {movement.balance} {movement.unit}. Movements are permanent once recorded.</p>
                <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={submitMovement}>
                  <Field label="Direction">
                    <select className={inputClass} name="direction" defaultValue="in">
                      <option value="in">Received (in)</option>
                      <option value="out">Issued (out)</option>
                    </select>
                  </Field>
                  <Field label={`Quantity (${movement.unit})`}><input className={inputClass} name="quantity" type="number" min="0.001" step="0.001" required /></Field>
                  <Field label="Reason"><input className={inputClass} name="reason" required maxLength={500} /></Field>
                  <Field label="Date"><input className={inputClass} name="date" type="date" defaultValue={todayInUganda()} required /></Field>
                  <div className="flex gap-2 md:col-span-2">
                    <Primary type="submit" disabled={busy}>Record movement</Primary>
                    <button type="button" className="rounded-full px-4 py-3 text-sm font-semibold text-muted" onClick={() => setMovement(null)}>Cancel</button>
                  </div>
                </form>
              </Card>
            ) : null}

            {movements.length ? (
              <>
                <h3 className="mt-6 font-display text-xl">Recent movements</h3>
                <ul className="mt-2 divide-y divide-line rounded-card border border-line bg-surface">
                  {movements.slice(0, 12).map((m) => (
                    <li key={m.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                      <span>
                        <span className={m.quantity > 0 ? "font-semibold text-moss-deep" : "font-semibold text-clay"}>
                          {m.quantity > 0 ? "+" : ""}{m.quantity}
                        </span>{" "}
                        {m.itemName} · {m.reason}
                      </span>
                      <span className="text-muted">{displayDate(m.recordDate)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : null}
      </Page>
    </>
  );
}
