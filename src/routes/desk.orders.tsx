import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, Page, TopBar } from "@/components/chrome";
import { decideOrder, myOrders } from "@/lib/market.functions";
import { useDesk } from "@/lib/use-desk";

export const Route = createFileRoute("/desk/orders")({ component: OrdersPage });

function OrdersPage() {
  const { profile } = useDesk();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof myOrders>>>([]);
  const [message, setMessage] = useState("");
  function load() {
    void myOrders().then(setRows).catch((err: unknown) => setMessage(err instanceof Error ? err.message : "Could not load orders."));
  }
  useEffect(() => {
    if (profile) load();
  }, [profile]);
  return (
    <>
      <TopBar profile={profile ?? undefined} />
      <Page>
        <h1 className="font-display text-4xl text-moss-deep">Orders</h1>
        <p className="mt-2 text-muted">Buyers track requests. Farmers accept, fulfil, or decline them.</p>
        {message ? <p className="mt-3 text-sm text-clay">{message}</p> : null}
        <ul className="mt-6 space-y-3">
          {rows.map((order) => (
            <li key={order.id}>
              <Card>
                <div className="flex flex-wrap justify-between gap-2">
                  <h2 className="font-display text-2xl">{order.crop}</h2>
                  <span className="text-xs font-semibold uppercase text-moss">{order.status}</span>
                </div>
                <p className="text-sm">{order.quantity} {order.unit} · {order.incoming ? `from ${order.buyerName}` : `requested by you`}</p>
                {order.note ? <p className="text-sm text-muted">{order.note}</p> : null}
                {order.incoming && order.status === "requested" ? (
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-surface" onClick={() => void decideOrder({ data: { id: order.id, status: "accepted" } }).then(load)}>Accept</button>
                    <button type="button" className="rounded-full border border-line px-4 py-2 text-sm font-semibold" onClick={() => void decideOrder({ data: { id: order.id, status: "declined" } }).then(load)}>Decline</button>
                  </div>
                ) : null}
                {order.incoming && order.status === "accepted" ? (
                  <button type="button" className="mt-3 rounded-full bg-moss-deep px-4 py-2 text-sm font-semibold text-surface" onClick={() => void decideOrder({ data: { id: order.id, status: "fulfilled" } }).then(load)}>Mark fulfilled</button>
                ) : null}
              </Card>
            </li>
          ))}
          {rows.length === 0 ? <p className="text-sm text-muted">No orders yet.</p> : null}
        </ul>
      </Page>
    </>
  );
}
