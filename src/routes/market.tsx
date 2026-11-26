import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Search, ShoppingBasket, Sprout, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MarketingFooter, MarketingHeader } from "@/components/brand";
import { Dialog, DialogContent, DialogHeader } from "@/components/overlays";
import { Badge, Button, Card, CardContent, EmptyState, Field, Input, Textarea } from "@/components/ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyProfile, listLiveListings, placeOrder, type Listing, type Profile } from "@/lib/market.functions";
import { formatDate, ugx } from "@/lib/utils";

export const Route = createFileRoute("/market")({ component: MarketPage });

function MarketPage() {
  const { user } = useCurrentUserState();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<Listing[] | null>(null);
  const [crop, setCrop] = useState("");
  const [district, setDistrict] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [ordering, setOrdering] = useState<Listing | null>(null);

  useEffect(() => {
    void listLiveListings().then(setRows).catch(() => setRows([]));
    if (user) void getMyProfile().then(setProfile).catch(() => setProfile(null));
  }, [user]);

  const districts = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.district))).sort(), [rows]);

  const shown = useMemo(() => {
    return (rows ?? []).filter((row) => {
      const cropOk = !crop || row.crop.toLowerCase().includes(crop.toLowerCase());
      const districtOk = !district || row.district === district;
      const priceOk = !maxPrice || row.unitPriceUgx <= Number(maxPrice);
      return cropOk && districtOk && priceOk;
    });
  }, [rows, crop, district, maxPrice]);

  return (
    <div className="min-h-screen bg-canvas">
      <MarketingHeader />

      <main className="container-page py-10 lg:py-14">
        <div className="max-w-2xl">
          <p className="eyebrow text-primary">The trading floor</p>
          <h1 className="mt-2 font-display text-[30px] leading-tight text-ink sm:text-[36px]">
            Approved produce, straight from the record.
          </h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
            Only produce an administrator has approved is listed here. Filter by crop,
            district or price, then request an order — the farmer answers it from their desk.
          </p>
        </div>

        <div className="mt-8 grid gap-3 rounded-card border border-line bg-paper/60 p-4 sm:grid-cols-3">
          <Field label="Search produce" htmlFor="mk-crop">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <Input id="mk-crop" className="pl-9" value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="Maize, matooke, coffee" />
            </div>
          </Field>
          <Field label="District" htmlFor="mk-district">
            <select
              id="mk-district"
              className="h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-[14px] text-ink focus:border-primary focus:outline-none"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            >
              <option value="">All districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Highest unit price (UGX)" htmlFor="mk-price">
            <Input id="mk-price" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="No limit" />
          </Field>
        </div>

        <p className="mt-4 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
          {shown.length} of {rows?.length ?? 0} listings
        </p>

        {!rows ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-card border border-line bg-paper/60" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon={Store}
              title={rows.length === 0 ? "The market is empty" : "Nothing matches those filters"}
              body={
                rows.length === 0
                  ? "No approved listings yet. A farmer lists produce, an administrator approves it, and it appears here."
                  : "Try clearing the search or the price limit."
              }
            />
          </Card>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((row) => (
              <Card key={row.id} className="surface-hover flex flex-col overflow-hidden">
                {row.photoData ? (
                  <img src={row.photoData} alt={row.crop} className="h-40 w-full border-b border-line object-cover" />
                ) : (
                  <div className="grid h-40 w-full place-items-center border-b border-line bg-paper/70">
                    {row.photoData === undefined ? null : (
                      <span className="grid size-12 place-items-center rounded-full border border-line bg-surface text-olive">
                        <Sprout className="size-5" strokeWidth={1.6} />
                      </span>
                    )}
                  </div>
                )}
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-[17px] text-ink">{row.crop}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10.5px] text-muted">
                        <MapPin className="size-3" /> {row.district}
                        {row.subcounty ? ` · ${row.subcounty}` : ""}
                      </p>
                    </div>
                    <Badge tone="olive">Live</Badge>
                  </div>
                  <p className="mt-3 font-mono text-[15px] font-medium text-ink tabular-nums">
                    {ugx(row.unitPriceUgx)}
                    <span className="text-[11px] font-normal text-muted"> / {row.unit}</span>
                  </p>
                  <p className="mt-1 font-mono text-[10.5px] text-muted">
                    {row.quantity} {row.unit} available · total {ugx(row.quantity * row.unitPriceUgx)}
                  </p>
                  {row.description ? (
                    <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{row.description}</p>
                  ) : null}
                  {(row.qualityGrade || row.farmName || row.harvestDate) && (
                    <p className="mt-2 font-mono text-[10px] text-muted-soft">
                      {[row.qualityGrade, row.farmName, row.harvestDate ? `Harvested ${formatDate(row.harvestDate, true)}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  <div className="mt-auto pt-4">
                    {user ? (
                      profile?.role === "buyer" ? (
                        <Button className="w-full" onClick={() => setOrdering(row)}>
                          <ShoppingBasket className="size-4" /> Request this produce
                        </Button>
                      ) : (
                        <Button asChild variant="outline" className="w-full" disabled={row.farmerId === profile?.userId && profile ? true : undefined}>
                          {row.farmerId === profile?.userId && profile ? (
                            <span>Your listing</span>
                          ) : (
                            <Link to="/desk/account">Switch to a buyer account to order</Link>
                          )}
                        </Button>
                      )
                    ) : (
                      <Button asChild className="w-full">
                        <Link to="/login">Log in to request</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <OrderDialog listing={ordering} onClose={() => setOrdering(null)} onDone={() => setOrdering(null)} />
      <MarketingFooter />
    </div>
  );
}

function OrderDialog({ listing, onClose, onDone }: { listing: Listing | null; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (listing) {
      setQty("1");
      setNote("");
    }
  }, [listing]);

  if (!listing) return null;

  return (
    <Dialog open={!!listing} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader
          title={`Request ${listing.crop}`}
          description={`${listing.farmerName} · ${listing.quantity} ${listing.unit} available at ${ugx(listing.unitPriceUgx)} each.`}
        />
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            void placeOrder({ data: { listingId: listing.id, quantity: Number(qty), note } })
              .then(() => {
                toast.success(`Request sent for ${listing.crop}. Track it under Orders.`);
                onDone();
              })
              .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not place the request."))
              .finally(() => setBusy(false));
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label={`Quantity (${listing.unit})`} htmlFor="od-qty">
              <Input
                id="od-qty"
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                max={listing.quantity}
                required
              />
            </Field>
            <Field label="Order value" htmlFor="od-value">
              <Input id="od-value" value={ugx(Number(qty || 0) * listing.unitPriceUgx)} readOnly className="bg-paper font-mono tabular-nums" />
            </Field>
          </div>
          <Field label="Note for the farmer" htmlFor="od-note">
            <Textarea id="od-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Deliver to Nakawa market on Friday." />
          </Field>
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? "Sending…" : "Place the request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
