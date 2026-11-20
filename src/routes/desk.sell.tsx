import { createFileRoute } from "@tanstack/react-router";
import { Camera, ChevronDown, Plus, Sprout } from "lucide-react";
import { useEffect, useState } from "react";
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
  Skeleton,
  Textarea,
} from "@/components/ui";
import { stockForCrop } from "@/lib/farm.functions";
import { createListing, myListings, withdrawListing, type Listing } from "@/lib/market.functions";
import { crops } from "@/lib/record-catalog";
import { formatDate, statusMeta, ugx } from "@/lib/utils";

export const Route = createFileRoute("/desk/sell")({ component: SellPage });

function SellPage() {
  const { profile } = useDeskSession();
  const [rows, setRows] = useState<Listing[] | null>(null);
  const [more, setMore] = useState(false);
  const [stockHint, setStockHint] = useState("");
  const [busy, setBusy] = useState(false);
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

  const farmer = profile.role === "farmer" || profile.role === "admin";

  function load() {
    void myListings()
      .then(setRows)
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not load listings."));
  }
  useEffect(() => {
    if (farmer) load();
  }, [farmer]);

  // Availability hint: what the farmer's own store ledger says about this crop.
  useEffect(() => {
    if (!farmer) return;
    const crop = form.crop.trim();
    if (!crop) {
      setStockHint("");
      return;
    }
    const timer = setTimeout(() => {
      void stockForCrop({ data: { crop } })
        .then((matches) => {
          const best = matches[0];
          setStockHint(best ? `In your store: ${best.balance} ${best.unit} of “${best.name}”.` : "");
        })
        .catch(() => setStockHint(""));
    }, 400);
    return () => clearTimeout(timer);
  }, [form.crop, farmer]);

  const total = Number(form.quantity || 0) * Number(form.unitPriceUgx || 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trade"
        title="My listings"
        description="New listings stay pending until an administrator approves them. Buyers only ever see approved produce."
      />

      {!farmer ? (
        <Card>
          <EmptyState
            icon={Sprout}
            title="Only farmer accounts list produce"
            body="Sign in with the farmer demo account to submit a listing, or browse the marketplace as a buyer."
          />
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>List produce from the farm</CardTitle>
              <p className="mt-1 text-[12.5px] text-muted">
                The administrator checks the harvest date and grade before it goes live.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                setBusy(true);
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
                    toast.success("Submitted. The listing is pending approval.");
                    setForm({ ...form, crop: "", quantity: "", description: "", photoData: "" });
                    setStockHint("");
                    load();
                  })
                  .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not submit."))
                  .finally(() => setBusy(false));
              }}
            >
              <Field label="Crop name" htmlFor="sell-crop" hint={stockHint || undefined}>
                <Input
                  id="sell-crop"
                  value={form.crop}
                  list="crop-name-options"
                  onChange={(e) => setForm({ ...form, crop: e.target.value })}
                  required
                />
                <datalist id="crop-name-options">
                  {crops.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Quantity" htmlFor="sell-qty">
                  <Input id="sell-qty" inputMode="decimal" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                </Field>
                <Field label="Unit" htmlFor="sell-unit">
                  <Select id="sell-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    <option>kg</option>
                    <option>bags</option>
                    <option>bunches</option>
                    <option>trays</option>
                  </Select>
                </Field>
              </div>
              <Field label="Unit price (UGX)" htmlFor="sell-price">
                <Input id="sell-price" inputMode="numeric" value={form.unitPriceUgx} onChange={(e) => setForm({ ...form, unitPriceUgx: e.target.value })} required />
              </Field>
              <Field label="District" htmlFor="sell-district">
                <Input id="sell-district" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} required />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Short description" htmlFor="sell-desc">
                  <Textarea id="sell-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </Field>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 sm:col-span-2">
                <p className="text-[13px] text-muted">
                  Listing total <span className="ml-1 font-mono text-[15px] font-medium text-ink tabular-nums">{ugx(total || 0)}</span>
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
                  onClick={() => setMore((v) => !v)}
                >
                  {more ? "Hide extra details" : "More details"} <ChevronDown className={`size-3.5 transition-transform ${more ? "rotate-180" : ""}`} />
                </button>
              </div>
              {more ? (
                <>
                  <Field label="Sub-county" htmlFor="sell-sub">
                    <Input id="sell-sub" value={form.subcounty} onChange={(e) => setForm({ ...form, subcounty: e.target.value })} />
                  </Field>
                  <Field label="Farm or group" htmlFor="sell-farm">
                    <Input id="sell-farm" value={form.farmName} onChange={(e) => setForm({ ...form, farmName: e.target.value })} />
                  </Field>
                  <Field label="Contact phone" htmlFor="sell-phone">
                    <Input id="sell-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </Field>
                  <Field label="Harvest date" htmlFor="sell-date">
                    <Input id="sell-date" type="date" value={form.harvestDate} onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} />
                  </Field>
                  <Field label="Quality grade" htmlFor="sell-grade">
                    <Input id="sell-grade" value={form.qualityGrade} onChange={(e) => setForm({ ...form, qualityGrade: e.target.value })} placeholder="Grade A, dried, organic" />
                  </Field>
                  <Field label="Photo" htmlFor="sell-photo" hint="A small photo (under 120 KB) helps the administrator.">
                    <Input
                      id="sell-photo"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (file.size > 120_000) {
                          toast.error("Choose a photo under 120 KB.");
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
              <div className="sm:col-span-2">
                <Button type="submit" size="lg" disabled={busy}>
                  <Plus className="size-4" /> {busy ? "Submitting…" : "Submit for approval"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {farmer ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Your listing history</CardTitle>
              <p className="mt-1 text-[12.5px] text-muted">Every listing you have submitted, with its current state.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-1">
            {!rows ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState icon={Sprout} title="No listings yet" body="Submit your first listing above — it will appear here with its approval state." />
            ) : (
              rows.map((row) => {
                const meta = statusMeta(row.status);
                return (
                  <div key={row.id} className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-paper/50 px-3.5 py-3">
                    {row.photoData ? (
                      <img src={row.photoData} alt="" className="size-11 rounded-md border border-line object-cover" />
                    ) : (
                      <span className="grid size-11 shrink-0 place-items-center rounded-md border border-line bg-surface text-muted">
                        <Camera className="size-4" strokeWidth={1.6} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <p className="text-[13px] font-semibold text-ink">{row.crop}</p>
                        <span className="font-mono text-[10.5px] text-muted">
                          {row.quantity} {row.unit} · {ugx(row.unitPriceUgx)} each · {row.district}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-soft">
                        Submitted {formatDate(row.createdAt, true)}
                        {row.harvestDate ? ` · Harvested ${formatDate(row.harvestDate, true)}` : ""}
                      </p>
                      {row.rejectionNote ? (
                        <p className="mt-1 text-[11.5px] leading-snug text-danger">Note: {row.rejectionNote}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {row.status === "live" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void withdrawListing({ data: { id: row.id } })
                              .then(() => {
                                toast.success("Listing withdrawn from the market.");
                                load();
                              })
                              .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not withdraw."));
                          }}
                        >
                          Withdraw
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
