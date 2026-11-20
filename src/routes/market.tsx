import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, Field, inputClass, Page, Primary, TopBar, ugx } from "@/components/chrome";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyProfile, listLiveListings, placeOrder, type Listing, type Profile } from "@/lib/market.functions";

export const Route = createFileRoute("/market")({ component: MarketPage });

function MarketPage() {
  const { user } = useCurrentUserState();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<Listing[]>([]);
  const [crop, setCrop] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void listLiveListings().then(setRows).catch(() => setRows([]));
    if (user) void getMyProfile().then(setProfile).catch(() => setProfile(null));
  }, [user]);

  const shown = useMemo(() => {
    return rows.filter((row) => {
      const cropOk = !crop || row.crop.toLowerCase().includes(crop.toLowerCase());
      const priceOk = !maxPrice || row.unitPriceUgx <= Number(maxPrice);
      return cropOk && priceOk;
    });
  }, [rows, crop, maxPrice]);

  return (
    <>
      <TopBar profile={profile} />
      <Page>
        <h1 className="font-display text-4xl text-moss-deep">Marketplace</h1>
        <p className="mt-2 max-w-2xl text-muted">Only produce an administrator has approved is listed here.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Field label="Crop">
            <input className={inputClass} value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="Maize, matooke, coffee" />
          </Field>
          <Field label="Highest unit price (UGX)">
            <input className={inputClass} inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </Field>
        </div>
        {message ? <p className="mt-4 text-sm font-semibold text-moss-deep">{message}</p> : null}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {shown.map((row) => (
            <Card key={row.id}>
              <p className="text-xs font-semibold uppercase text-moss">{row.district}{row.subcounty ? ` · ${row.subcounty}` : ""}</p>
              <h2 className="font-display text-2xl">{row.crop}</h2>
              <p className="mt-1 text-sm text-muted">{row.quantity} {row.unit} · {ugx(row.unitPriceUgx)} each · total {ugx(row.quantity * row.unitPriceUgx)}</p>
              <p className="mt-2 text-sm">{row.description}</p>
              {row.qualityGrade || row.farmName ? (
                <p className="mt-2 text-sm text-muted">{[row.qualityGrade, row.farmName, row.harvestDate].filter(Boolean).join(" · ")}</p>
              ) : null}
              {user && profile?.role === "buyer" ? (
                <OrderBox listing={row} onDone={(text) => setMessage(text)} />
              ) : (
                <p className="mt-4 text-sm">{user ? "Sign in as a buyer to request this produce." : <Link to="/login" className="font-semibold text-moss-deep">Log in as a buyer</Link>} to request it.</p>
              )}
            </Card>
          ))}
          {shown.length === 0 ? <p className="text-sm text-muted">Nothing matches yet. Approve a pending listing from Administration.</p> : null}
        </div>
      </Page>
    </>
  );
}

function OrderBox({ listing, onDone }: { listing: Listing; onDone: (text: string) => void }) {
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  return (
    <form
      className="mt-4 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        void placeOrder({ data: { listingId: listing.id, quantity: Number(qty), note } })
          .then(() => onDone(`Request sent for ${listing.crop}. Track it under Orders.`))
          .catch((err: unknown) => onDone(err instanceof Error ? err.message : "Could not place the request."));
      }}
    >
      <div className="flex gap-2">
        <input className={inputClass} value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Quantity" />
        <Primary type="submit">Request</Primary>
      </div>
      <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the farmer" />
    </form>
  );
}
