import { createFileRoute } from "@tanstack/react-router";
import { Package, ShoppingBasket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/overlays";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Skeleton,
  Table,
  TD,
  TH,
} from "@/components/ui";
import { decideOrder, myOrders, type OrderRow } from "@/lib/market.functions";
import { formatDate, statusMeta, ugx } from "@/lib/utils";

export const Route = createFileRoute("/desk/orders")({ component: OrdersPage });

type Filter = "all" | "requested" | "accepted" | "fulfilled" | "declined";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "requested", label: "Waiting" },
  { value: "accepted", label: "Accepted" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "declined", label: "Declined" },
];

function OrdersPage() {
  const [rows, setRows] = useState<OrderRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  function load() {
    void myOrders()
      .then(setRows)
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not load orders."));
  }
  useEffect(() => {
    load();
  }, []);

  const shown = useMemo(() => (filter === "all" ? rows ?? [] : (rows ?? []).filter((row) => row.status === filter)), [rows, filter]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows ?? []) map.set(row.status, (map.get(row.status) ?? 0) + 1);
    return map;
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trade"
        title="Orders"
        description="Buyers track their requests here. Farmers accept, fulfil or decline them — every decision notifies the other side."
      />

      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
              {f.value !== "all" && (counts.get(f.value) ?? 0) > 0 ? (
                <span className="ml-1 font-mono text-[10px] text-muted">{counts.get(f.value)}</span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>The order book</CardTitle>
            <p className="mt-1 text-[12.5px] text-muted">
              {shown.length} of {rows?.length ?? 0} orders shown.
            </p>
          </div>
        </CardHeader>
        {!rows ? (
          <CardContent className="space-y-2 pt-1">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </CardContent>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={rows.length === 0 ? ShoppingBasket : Package}
            title={rows.length === 0 ? "No orders yet" : "Nothing in this state"}
            body={rows.length === 0 ? "When a buyer requests produce, or you request it as a buyer, it lands here." : "Try another filter tab."}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <TH>Produce</TH>
                <TH>Counterparty</TH>
                <TH className="text-right">Value</TH>
                <TH>Status</TH>
                <TH className="text-right">Action</TH>
              </tr>
            </thead>
            <tbody>
              {shown.map((order) => {
                const meta = statusMeta(order.status);
                const canDecide = order.incoming && (order.status === "requested" || order.status === "accepted");
                return (
                  <tr key={order.id}>
                    <TD>
                      <p className="text-[13px] font-semibold text-ink">{order.crop}</p>
                      <p className="font-mono text-[10.5px] text-muted">
                        {order.quantity} {order.unit} · {formatDate(order.createdAt, true)}
                      </p>
                      {order.note ? (
                        <p className="mt-0.5 max-w-xs text-[11px] leading-snug text-muted">“{order.note}”</p>
                      ) : null}
                    </TD>
                    <TD className="text-[12.5px] text-muted">
                      {order.incoming ? `From ${order.buyerName}` : "Requested by you"}
                    </TD>
                    <TD className="text-right font-mono text-[12px] text-ink tabular-nums">
                      {ugx(order.quantity * order.unitPriceUgx)}
                    </TD>
                    <TD>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </TD>
                    <TD className="text-right">
                      {canDecide ? (
                        <div className="flex justify-end gap-1.5">
                          {order.status === "requested" ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  void decideOrder({ data: { id: order.id, status: "accepted" } })
                                    .then(() => {
                                      toast.success("Order accepted.");
                                      load();
                                    })
                                    .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not accept."));
                                }}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  void decideOrder({ data: { id: order.id, status: "declined" } })
                                    .then(() => {
                                      toast.success("Order declined.");
                                      load();
                                    })
                                    .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not decline."));
                                }}
                              >
                                Decline
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                void decideOrder({ data: { id: order.id, status: "fulfilled" } })
                                  .then(() => {
                                    toast.success("Order marked delivered. Stock updated where it matched.");
                                    load();
                                  })
                                  .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not fulfil."));
                              }}
                            >
                              Mark fulfilled
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="font-mono text-[10px] tracking-[0.08em] text-muted-soft uppercase">
                          {order.incoming ? "—" : "Farmer decides"}
                        </span>
                      )}
                    </TD>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
