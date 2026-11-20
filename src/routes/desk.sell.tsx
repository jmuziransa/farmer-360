import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, Field, inputClass, Page, Primary, TopBar, ugx } from "@/components/chrome";
import { stockForCrop } from "@/lib/farm.functions";
import { createListing, myListings, type Listing } from "@/lib/market.functions";
import { crops } from "@/lib/record-catalog";
import { useDesk } from "@/lib/use-desk";

export const Route = createFileRoute("/desk/sell")({ component: SellPage });

function SellPage() {
  const { profile, isPending } = useDesk();
  const [rows, setRows] = useState<Listing[]>([]);
  const [message, setMessage] = useState("");
  const [more, setMore] = useState(false);
  const [stockHint, setStockHint] = useState("");
  const [form, setForm] = useState({
    crop: "",
    quantity: "",
    unit: "kg",
    unitPriceUgx: "",
    district: "",
    subcounty: "",
    description: "",
    farmName: "",
    phone: "",
    harvestDate: "",
    qualityGrade: "",
    photoData: "",
  });

  function load() {
    void myListings().then(setRows).catch((err: unknown) => setMessage(err instanceof Error ? err.message : "Could not load listings."));
  }
  useEffect(() => {
    if (profile && (profile.role === "farmer" || profile.role === "admin")) load();
  }, [profile]);

  // Availability hint: what the farmer's own store ledger says about this crop.
  useEffect(() => {
    if (!profile || (profile.role !== "farmer" && profile.role !== "admin")) return;
    const crop = form.crop.trim();
    if (!crop) {
      setStockHint("");
      return;
    }
    const timer = setTimeout(() => {
      void stockForCrop({ data: { crop } })
        .then((matches) => {
          const best = matches[0];
          setStockHint(best ? `In your store: ${best.balance} ${best.unit} of "${best.name}".` : "");
        })
        .catch(() => setStockHint(""));
    }, 400);
    return () => clearTimeout(timer);
  }, [form.crop, profile]);

  const total = Number(form.quantity || 0) * Number(form.unitPriceUgx || 0);

  return (
    <>
      <TopBar profile={profile ?? undefined} />
      <Page>
        <h1 className="font-display text-4xl text-moss-deep">List produce</h1>
        <p className="mt-2 text-muted">New listings stay pending until an administrator approves them.</p>
        {isPending ? <p className="mt-4">Loading…</p> : null}
        {profile && profile.role !== "farmer" && profile.role !== "admin" ? (
          <p className="mt-4 text-sm">Only a farmer account can submit produce. Sign in as farmer.demo@akatale.ug.</p>
        ) : null}
        {profile && (profile.role === "farmer" || profile.role === "admin") ? (
          <Card className="mt-6">
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                setMessage("");
                void createListing({
                  data: {
                    crop: form.crop,
                    quantity: Number(form.quantity),
                    unit: form.unit,
                    unitPriceUgx: Number(form.unitPriceUgx),
                    district: form.district,
                    subcounty: form.subcounty,
                    description: form.description,
                    farmName: form.farmName,
                    phone: form.phone,
                    harvestDate: form.harvestDate,
                    qualityGrade: form.qualityGrade,
                    photoData: form.photoData,
                  },
                })
                  .then(() => {
                    setMessage("Submitted. It is pending approval and is not on the marketplace yet.");
                    setForm({ ...form, crop: "", quantity: "", description: "", photoData: "" });
                    load();
                  })
                  .catch((err: unknown) => setMessage(err instanceof Error ? err.message : "Could not submit."));
              }}
            >
              <Field label="Crop name">
                <input className={inputClass} value={form.crop} list="crop-name-options" onChange={(e) => setForm({ ...form, crop: e.target.value })} required />
                <datalist id="crop-name-options">{crops.map((c) => <option key={c} value={c} />)}</datalist>
                {stockHint ? <span className="mt-1 block text-xs font-semibold text-moss-deep">{stockHint}</span> : null}
              </Field>
              <Field label="Quantity"><input className={inputClass} inputMode="decimal" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required /></Field>
              <Field label="Unit">
                <select className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  <option>kg</option><option>bags</option><option>bunches</option><option>trays</option>
                </select>
              </Field>
              <Field label="Unit price (UGX)"><input className={inputClass} inputMode="numeric" value={form.unitPriceUgx} onChange={(e) => setForm({ ...form, unitPriceUgx: e.target.value })} required /></Field>
              <Field label="District"><input className={inputClass} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} required /></Field>
              <Field label="Sub-county"><input className={inputClass} value={form.subcounty} onChange={(e) => setForm({ ...form, subcounty: e.target.value })} /></Field>
              <div className="md:col-span-2">
                <Field label="Short description"><textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              </div>
              <p className="text-sm font-semibold md:col-span-2">Total {ugx(total || 0)}</p>
              <button type="button" className="text-left text-sm font-semibold text-moss-deep md:col-span-2" onClick={() => setMore((v) => !v)}>
                {more ? "Hide extra farm details" : "More details"}
              </button>
              {more ? (
                <>
                  <Field label="Farm or group"><input className={inputClass} value={form.farmName} onChange={(e) => setForm({ ...form, farmName: e.target.value })} /></Field>
                  <Field label="Contact phone"><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                  <Field label="Harvest date"><input className={inputClass} type="date" value={form.harvestDate} onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} /></Field>
                  <Field label="Quality grade"><input className={inputClass} value={form.qualityGrade} onChange={(e) => setForm({ ...form, qualityGrade: e.target.value })} placeholder="Grade A, dried, organic" /></Field>
                  <Field label="Photo">
                    <input
                      className={inputClass}
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (file.size > 120_000) {
                          setMessage("Choose a photo under 120 KB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => setForm((current) => ({ ...current, photoData: String(reader.result ?? "") }));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </Field>
                </>
              ) : null}
              <div className="md:col-span-2"><Primary type="submit">Submit for approval</Primary></div>
            </form>
            {message ? <p className="mt-3 text-sm font-semibold">{message}</p> : null}
          </Card>
        ) : null}
        <h2 className="mt-8 font-display text-2xl">Your listings</h2>
        <ul className="mt-3 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-card border border-line bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong>{row.crop}</strong>
                <span className="text-xs font-semibold uppercase text-moss">{row.status}</span>
              </div>
              <p className="text-sm text-muted">{row.quantity} {row.unit} · {ugx(row.unitPriceUgx)} · {row.district}</p>
              {row.rejectionNote ? <p className="text-sm text-clay">Note: {row.rejectionNote}</p> : null}
            </li>
          ))}
        </ul>
      </Page>
    </>
  );
}
