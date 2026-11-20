import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, Download, Pencil, Plus, RotateCcw, Sprout, Tractor } from "lucide-react";
import { toast } from "sonner";
import { useDeskSession } from "@/components/desk-shell";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  StatCard,
  Table,
  TD,
  TH,
  Textarea,
} from "@/components/ui";
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
import { ugx } from "@/lib/utils";

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
      <Field label="Record type" htmlFor="rf-category">
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
              className={`rounded-md border px-3 py-2 text-[13px] font-semibold transition-colors ${
                category === c.value ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-line-strong"
              }`}
              onClick={() => changeCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label={category === "crops" ? "Crop" : category === "animals" ? "Animal" : "Name"} htmlFor="rf-name">
        {category === "custom" ? (
          <Input
            id="rf-name"
            value={form.name}
            maxLength={150}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        ) : (
          <Select
            aria-label={category === "crops" ? "Crop" : "Animal"}
            value={choices.includes(form.name) ? form.name : choices[0] ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value, unit: recordUnits(category, e.target.value, module)[0] ?? "" })}
          >
            {choices.map((n) => <option key={n}>{n}</option>)}
          </Select>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity" htmlFor="rf-qty">
          <Input id="rf-qty" type="number" min="0" step="0.001" value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </Field>
        <Field label="Unit" htmlFor="rf-unit">
          <Select aria-label="Unit" value={units.includes(form.unit) ? form.unit : units[0] ?? ""}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            {[...new Set([...units, ...(form.unit ? [form.unit] : [])])].map((u) => <option key={u}>{u}</option>)}
          </Select>
        </Field>
      </div>
    </>
  );
}

function FarmPage() {
  const { profile } = useDeskSession();
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
  const [busy, setBusy] = useState(false);

  function load() {
    void getFarmWorkspace()
      .then(setData)
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not load your farm."));
  }

  useEffect(() => {
    load();
  }, []);

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
      toast.success("Record saved to your farm.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save this record.");
    } finally {
      setBusy(false);
    }
  }

  async function submitFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
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
      toast.success(farmForm?.id ? "Farm updated." : "Farm created.");
      if (!farmForm?.id && result.id) setFarmId(String(result.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save the farm.");
    } finally {
      setBusy(false);
    }
  }

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeFarm || !itemForm) return;
    setBusy(true);
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
      toast.success("Stock item saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save the stock item.");
    } finally {
      setBusy(false);
    }
  }

  async function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeFarm || !movement) return;
    setBusy(true);
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
      toast.success("Stock movement recorded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to record the movement.");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`The farm · ${profile.farmName ?? profile.fullName}`}
        title="Farm records"
        description="Crops, livestock, poultry, produce, money and the store ledger for your farms. Records stay private to your account."
        actions={
          activeFarm ? (
            <>
              <Button variant="outline" size="sm" onClick={() => exportEntriesCsv(entries.filter((e) => e.farmId === activeFarm.id && !e.archivedAt), activeFarm.name)}>
                <Download className="size-3.5" /> Export CSV
              </Button>
              <Button size="sm" onClick={() => setEntryForm(emptyEntry(module))}>
                <Plus className="size-3.5" /> Add record
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setFarmForm({})}>
              <Plus className="size-3.5" /> New farm
            </Button>
          )
        }
      />

      {!farms.length ? (
        <Card>
          <EmptyState
            icon={Tractor}
            title="Add your first farm"
            body="A farm holds your records, stock items and the store ledger."
            action={<Button onClick={() => setFarmForm({})}><Plus className="size-4" /> New farm</Button>}
          />
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="w-64"
          aria-label="Choose farm"
          value={activeFarm ? String(activeFarm.id) : ""}
          onChange={(e) => setFarmId(e.target.value)}
        >
          {farms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}{f.archived ? " (archived)" : ""} · {f.district || "no district"}
            </option>
          ))}
        </Select>
        {farms.length ? (
          <Button variant="ghost" size="sm" onClick={() => setFarmForm({})}>
            <Plus className="size-3.5" /> New farm
          </Button>
        ) : null}
        {activeFarm ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => setFarmForm(activeFarm)}>
              <Pencil className="size-3.5" /> Edit farm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void setFarmArchived({ data: { id: activeFarm.id, archived: !activeFarm.archived } })
                  .then(() => {
                    toast.success(activeFarm.archived ? "Farm restored." : "Farm archived.");
                    load();
                  })
                  .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not update the farm."));
              }}
            >
              {activeFarm.archived ? <RotateCcw className="size-3.5" /> : <Archive className="size-3.5" />}
              {activeFarm.archived ? "Restore farm" : "Archive farm"}
            </Button>
          </>
        ) : null}
      </div>

      {activeFarm ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Farm income" value={ugx(totals.income)} hint="From finance records" tone="olive" />
          <StatCard label="Farm expenses" value={ugx(totals.expense)} hint="From finance records" tone="amber" />
          <StatCard label="Net profit" value={ugx(totals.profit)} hint="Income minus expenses" tone="rust" />
        </div>
      ) : null}

      {farmForm !== null ? (
        <Card>
          <CardHeader>
            <CardTitle>{farmForm.id ? "Edit farm" : "New farm"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitFarm}>
              <Field label="Farm name" htmlFor="ff-name"><Input id="ff-name" name="name" required maxLength={150} defaultValue={farmForm.name ?? ""} /></Field>
              <Field label="District" htmlFor="ff-district"><Input id="ff-district" name="district" defaultValue={farmForm.district ?? ""} /></Field>
              <Field label="Village" htmlFor="ff-village"><Input id="ff-village" name="village" defaultValue={farmForm.village ?? ""} /></Field>
              <Field label="Size (acres)" htmlFor="ff-size"><Input id="ff-size" name="size" type="number" min="0" step="0.1" defaultValue={farmForm.sizeAcres ?? 0} /></Field>
              <Field label="Soil type" htmlFor="ff-soil"><Input id="ff-soil" name="soil" defaultValue={farmForm.soilType ?? ""} /></Field>
              <Field label="Water source" htmlFor="ff-water"><Input id="ff-water" name="water" defaultValue={farmForm.waterSource ?? ""} /></Field>
              <Field label="Farm type" htmlFor="ff-type">
                <Select id="ff-type" name="type" defaultValue={farmForm.farmType ?? "Mixed farming"}>
                  <option>Mixed farming</option><option>Crops</option><option>Livestock</option>
                  <option>Poultry</option><option>Dairy</option>
                </Select>
              </Field>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={busy}>Save farm</Button>
                <Button type="button" variant="ghost" onClick={() => setFarmForm(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {activeFarm ? (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {entryModules.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setModule(m); setShowArchived(false); }}
                className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  module === m
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-surface text-ink hover:border-line-strong"
                }`}
              >
                {moduleLabels[m]}
              </button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>{moduleLabels[module]} records</CardTitle>
                <p className="mt-1 text-[12.5px] text-muted">
                  {rows.length} {showArchived ? "archived" : "active"} {rows.length === 1 ? "record" : "records"} on {activeFarm.name}.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-[12.5px] font-semibold text-muted">
                  <input
                    type="checkbox"
                    className="size-4 accent-[#0056d2]"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                  />
                  Archived
                </label>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              <Input
                className="max-w-xs"
                placeholder="Search records"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {visible.length === 0 ? (
                <EmptyState
                  icon={Sprout}
                  title={`No ${moduleLabels[module].toLowerCase()} records${showArchived ? " in the archive" : ""}`}
                  body="Add the first one — every record is dated and stays yours."
                  action={<Button size="sm" variant="outline" onClick={() => setEntryForm(emptyEntry(module))}><Plus className="size-3.5" /> Add record</Button>}
                />
              ) : (
                <ul className="divide-y divide-line rounded-md border border-line">
                  {visible.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">
                          {r.name}
                          {r.archivedAt ? <Badge tone="neutral">Archived</Badge> : null}
                        </p>
                        {r.detail ? <p className="mt-0.5 text-[12px] leading-snug text-muted">{r.detail}</p> : null}
                        <p className="mt-1 font-mono text-[10.5px] text-muted">
                          {r.status} · {displayDate(r.recordDate)} · {r.quantity} {r.unit}
                          {r.amountUgx > 0 ? ` · ${ugx(r.amountUgx)}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Edit ${r.name}`}
                          disabled={activeFarm.archived}
                          onClick={() => setEntryForm({
                            id: r.id, module: r.module, name: r.name, detail: r.detail, status: r.status,
                            quantity: String(r.quantity), unit: r.unit, amount: String(r.amountUgx), date: r.recordDate,
                          })}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`${r.archivedAt ? "Restore" : "Archive"} ${r.name}`}
                          onClick={() => {
                            void setEntryArchived({ data: { id: r.id, farmId: r.farmId, restore: !!r.archivedAt } })
                              .then(() => {
                                toast.success(r.archivedAt ? "Record restored." : "Record archived.");
                                load();
                              })
                              .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not update the record."));
                          }}
                        >
                          {r.archivedAt ? <RotateCcw className="size-3.5" /> : <Archive className="size-3.5" />}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {rows.length > PAGE_SIZE ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                  <span className="text-muted">Showing {rangeStart}–{rangeEnd} of {rows.length}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>
                      Previous
                    </Button>
                    <span className="font-mono text-[11px] text-muted">Page {current} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={current >= totalPages} onClick={() => setPage(current + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {entryForm ? (
            <Card>
              <CardHeader>
                <CardTitle>{entryForm.id ? "Edit record" : `New ${moduleLabels[entryForm.module].toLowerCase()} record`}</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitEntry}>
                  <RecordFields form={entryForm} setForm={setEntryForm} module={entryForm.module} />
                  <Field label="Details" htmlFor="ef-detail">
                    <Textarea id="ef-detail" rows={2} value={entryForm.detail} maxLength={2000}
                      onChange={(e) => setEntryForm({ ...entryForm, detail: e.target.value })} />
                  </Field>
                  <Field label="Date" htmlFor="ef-date">
                    <Input id="ef-date" type="date" value={entryForm.date}
                      onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })} />
                  </Field>
                  {entryForm.module === "finance" ? (
                    <>
                      <Field label="Type" htmlFor="ef-status">
                        <Select id="ef-status" value={entryForm.status}
                          onChange={(e) => setEntryForm({ ...entryForm, status: e.target.value })}>
                          <option>Income</option><option>Expense</option>
                        </Select>
                      </Field>
                      <Field label="Amount (UGX)" htmlFor="ef-amount">
                        <Input id="ef-amount" type="number" min="0" step="1" value={entryForm.amount}
                          onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })} />
                      </Field>
                    </>
                  ) : (
                    <Field label="Status" htmlFor="ef-status">
                      <Select id="ef-status" value={entryForm.status}
                        onChange={(e) => setEntryForm({ ...entryForm, status: e.target.value })}>
                        <option>Active</option><option>Growing</option><option>Harvesting</option>
                        <option>Planned</option><option>Healthy</option>
                      </Select>
                    </Field>
                  )}
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit" disabled={busy}>Save record</Button>
                    <Button type="button" variant="ghost" onClick={() => setEntryForm(null)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Store ledger</CardTitle>
                <p className="mt-1 text-[12.5px] text-muted">
                  Items and an append-only stock ledger. The ledger refuses movements that would leave negative stock.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setItemForm({ name: "", unit: "kg", minimum: "0" })}>
                <Plus className="size-3.5" /> New stock item
              </Button>
            </CardHeader>
            <Table>
              <thead>
                <tr>
                  <TH>Item</TH>
                  <TH>Balance</TH>
                  <TH>Minimum</TH>
                  <TH className="text-right">Movement</TH>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <TD>
                      <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink">
                        {i.name}
                        {i.archivedAt ? <Badge tone="neutral">Archived</Badge> : null}
                        {i.balance < i.minimumStock ? <Badge tone="danger">Low</Badge> : null}
                      </p>
                    </TD>
                    <TD className="font-mono text-[12px] text-ink tabular-nums">{i.balance} {i.unit}</TD>
                    <TD className="font-mono text-[12px] text-muted tabular-nums">{i.minimumStock} {i.unit}</TD>
                    <TD className="text-right">
                      <Button size="sm" variant="outline" disabled={!!i.archivedAt || activeFarm.archived} onClick={() => setMovement(i)}>
                        Record movement
                      </Button>
                    </TD>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <TD colSpan={4}>
                      <p className="py-8 text-center text-[12.5px] text-muted">No stock items yet.</p>
                    </TD>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </Card>

          {itemForm ? (
            <Card>
              <CardHeader>
                <CardTitle>New stock item</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4 sm:grid-cols-3" onSubmit={submitItem}>
                  <Field label="Item name" htmlFor="if-name">
                    <Input id="if-name" value={itemForm.name} maxLength={150}
                      onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required />
                  </Field>
                  <Field label="Unit" htmlFor="if-unit">
                    <Input id="if-unit" value={itemForm.unit} maxLength={30}
                      onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} required />
                  </Field>
                  <Field label="Minimum stock" htmlFor="if-min">
                    <Input id="if-min" type="number" min="0" step="0.001" value={itemForm.minimum}
                      onChange={(e) => setItemForm({ ...itemForm, minimum: e.target.value })} />
                  </Field>
                  <div className="flex gap-2 sm:col-span-3">
                    <Button type="submit" disabled={busy}>Save item</Button>
                    <Button type="button" variant="ghost" onClick={() => setItemForm(null)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {movement ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Move stock · {movement.name}</CardTitle>
                  <p className="mt-1 text-[12.5px] text-muted">
                    Current balance {movement.balance} {movement.unit}. Movements are permanent once recorded.
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitMovement}>
                  <Field label="Direction" htmlFor="mv-dir">
                    <Select id="mv-dir" name="direction" defaultValue="in">
                      <option value="in">Received (in)</option>
                      <option value="out">Issued (out)</option>
                    </Select>
                  </Field>
                  <Field label={`Quantity (${movement.unit})`} htmlFor="mv-qty">
                    <Input id="mv-qty" name="quantity" type="number" min="0.001" step="0.001" required />
                  </Field>
                  <Field label="Reason" htmlFor="mv-reason">
                    <Input id="mv-reason" name="reason" required maxLength={500} />
                  </Field>
                  <Field label="Date" htmlFor="mv-date">
                    <Input id="mv-date" name="date" type="date" defaultValue={todayInUganda()} required />
                  </Field>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit" disabled={busy}>Record movement</Button>
                    <Button type="button" variant="ghost" onClick={() => setMovement(null)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {movements.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Recent movements</CardTitle>
              </CardHeader>
              <ul className="divide-y divide-line">
                {movements.slice(0, 12).map((m) => (
                  <li key={m.id} className="flex flex-wrap justify-between gap-3 px-5 py-3 text-[12.5px]">
                    <span className="text-ink">
                      <span className={m.quantity > 0 ? "font-mono font-semibold text-olive" : "font-mono font-semibold text-danger"}>
                        {m.quantity > 0 ? "+" : ""}{m.quantity}
                      </span>{" "}
                      {m.itemName} · {m.reason}
                    </span>
                    <span className="font-mono text-[11px] text-muted">{displayDate(m.recordDate)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
