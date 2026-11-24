/**
 * Demo seed (server-only): creates the four demo identities and their desk
 * content so the quick-fill accounts on /login always work.
 *
 * Runs in two ways, both idempotent:
 *  1. **At server bootstrap** — `ensureDemoSeed()` is kicked from
 *     `@/lib/auth/server` right after the database is ready, so `npm run dev`
 *     has working demo accounts before anyone opens the site (PGLite resets on
 *     every restart; a real Postgres keeps the `seed_gate` row, so the seed
 *     only happens once per database).
 *  2. **From the login page** — `seedDesk()` in `market.functions.ts` delegates
 *     here for visitors who land before the bootstrap pass finished.
 *
 * Concurrency is guarded by a `seed_gate` row (claimed with INSERT … ON
 * CONFLICT DO NOTHING), so two visitors booting at the same moment cannot both
 * seed. A failed seed releases the gate and logs loudly — a silently empty demo
 * desk is what used to surface as "Invalid email or password".
 */
import { auth } from "@/lib/auth/server";
import { getSql } from "@/lib/db";
import { gateIdentityEnabled } from "@/lib/auth/gate-identity.server";
import { DEV_USER_ID } from "@/lib/auth/verify.server";
import type { Role } from "@/lib/market.functions";

const DEMO: {
  email: string;
  password: string;
  name: string;
  role: Role;
  district: string;
  phone: string;
  farm: string | null;
}[] = [
  {
    email: "jmuziransa@gmail.com",
    password: "Akatale#2026",
    name: "J. Muziransa",
    role: "admin",
    district: "Wakiso",
    phone: "0700000001",
    farm: null,
  },
  {
    email: "farmer.demo@akatale.ug",
    password: "Harvest#2026",
    name: "Amina Nakato",
    role: "farmer",
    district: "Mukono",
    phone: "0700111222",
    farm: "Nakato Family Farm",
  },
  {
    email: "buyer.demo@akatale.ug",
    password: "Market#2026",
    name: "Peter Okello",
    role: "buyer",
    district: "Kampala",
    phone: "0700333444",
    farm: null,
  },
  {
    email: "officer.demo@akatale.ug",
    password: "Sacco#2026",
    name: "Grace Namuli",
    role: "officer",
    district: "Masaka",
    phone: "0700555666",
    farm: null,
  },
];

/** Seed the demo desk. Resolves `{ seeded }`; throws when seeding failed. */
export async function runDemoSeed(): Promise<{ seeded: boolean }> {
  const sql = await getSql();
  // Claim the seed atomically: two visitors hitting the landing page at the
  // same moment must not both run the content inserts below.
  const gate = await sql<{ name: string }>`
    insert into seed_gate (name) values ('desk') on conflict (name) do nothing returning name
  `;
  if (!gate[0]) return { seeded: false };
  try {
    const authOn = gateIdentityEnabled();
    const ids: Record<string, string> = {};
    for (const person of DEMO) {
      let id: string;
      if (authOn) {
        const found = await sql<{
          id: string;
        }>`select id from "user" where email = ${person.email}`;
        let userId = found[0]?.id;
        if (!userId) {
          const created = await auth.api.signUpEmail({
            body: { email: person.email, password: person.password, name: person.name },
          });
          userId = created?.user?.id;
          if (!userId) {
            const again = await sql<{
              id: string;
            }>`select id from "user" where email = ${person.email}`;
            userId = again[0]?.id;
          }
        }
        if (!userId) throw new Error(`Could not prepare ${person.email}`);
        id = userId;
      } else {
        // Preview with sign-in off: the shared dev identity owns the farmer
        // content and carries the admin role, so the whole desk is reachable;
        // the other personas become profile-only rows so joins show names.
        id =
          person.role === "farmer" || person.role === "admin" ? DEV_USER_ID : `demo-${person.role}`;
      }
      ids[person.email] = id;
      if (authOn || person.role === "buyer" || person.role === "officer") {
        await sql`
          insert into profiles (user_id, full_name, role, phone, district, farm_name)
          values (${id}, ${person.name}, ${person.role}, ${person.phone}, ${person.district}, ${person.farm})
          on conflict (user_id) do nothing
        `;
      }
    }
    if (!authOn) {
      await sql`
        insert into profiles (user_id, full_name, role, phone, district, farm_name)
        values (${DEV_USER_ID}, ${"Amina Nakato"}, ${"admin"}, ${"0700111222"}, ${"Mukono"}, ${"Nakato Family Farm"})
        on conflict (user_id) do nothing
      `;
    }

    const farmerId = ids["farmer.demo@akatale.ug"];
    // Market/finance seed — checked PER OWNER, not "table empty": if the
    // farmer identity changes across restarts (auth toggling between the real
    // sign-in user and the dev identity), the new identity still gets its demo
    // content. A global count check is what made listings "disappear" — the
    // rows existed under the old id, so nothing re-seeded for the new one.
    const farmerListings = await sql<{ n: number }>`
      select count(*)::int as n from listings where farmer_id = ${farmerId}
    `;
    if ((farmerListings[0]?.n ?? 0) === 0 && farmerId) {
      await sql`
        insert into listings (farmer_id, crop, quantity, unit, unit_price_ugx, district, subcounty, description, farm_name, phone, harvest_date, quality_grade, status)
        values
          (${farmerId}, ${"Dry Maize"}, ${500}, ${"kg"}, ${1800}, ${"Mukono"}, ${"Nakifuma"}, ${"Sun-dried grain from the last harvest, bagged and ready."}, ${"Nakato Family Farm"}, ${"0700111222"}, ${"2026-08-12"}, ${"Grade A"}, ${"live"}),
          (${farmerId}, ${"Matooke"}, ${40}, ${"bunches"}, ${25000}, ${"Masaka"}, ${"Bukoto"}, ${"Green cooking bananas, sorted by size."}, ${"Nakato Family Farm"}, ${"0700111222"}, ${"2026-11-02"}, ${"Sorted"}, ${"live"}),
          (${farmerId}, ${"Robusta Coffee"}, ${120}, ${"kg"}, ${8500}, ${"Mukono"}, ${"Ntenjeru"}, ${"Dried cherry, awaiting the next mill slot."}, ${"Nakato Family Farm"}, ${"0700111222"}, ${"2026-10-20"}, ${"Dried"}, ${"pending"})
      `;
      const farmerLoans = await sql<{ n: number }>`
        select count(*)::int as n from loans where member_id = ${farmerId}
      `;
      if ((farmerLoans[0]?.n ?? 0) === 0) {
        await sql`
          insert into loans (member_id, amount_ugx, purpose, term_months, status)
          values (${farmerId}, ${800000}, ${"Drying racks and two extra tarpaulins before the rains."}, ${6}, ${"pending"})
        `;
      }
      const buyerId = ids["buyer.demo@akatale.ug"];
      const officerId = ids["officer.demo@akatale.ug"];
      const farmerSavings = await sql<{ n: number }>`
        select count(*)::int as n from savings_ledger where member_id = ${farmerId}
      `;
      if ((farmerSavings[0]?.n ?? 0) === 0) {
        await sql`
          insert into savings_ledger (member_id, kind, amount_ugx, note, officer_id)
          values
            (${farmerId}, ${"deposit"}, ${450000}, ${"Opening savings"}, ${officerId}),
            (${buyerId}, ${"deposit"}, ${200000}, ${"Buyer float"}, ${officerId})
        `;
      }
    }

    // Demo farm production records (Farm360 side of the merge): a farm, module
    // entries, stock items and ledger movements for the farmer account.
    const farmCount = await sql<{
      n: number;
    }>`select count(*)::int as n from farms where owner_id = ${farmerId}`;
    if ((farmCount[0]?.n ?? 0) === 0 && farmerId) {
      const farm = await sql<{ id: number }>`
        insert into farms (owner_id, name, district, village, size_acres, soil_type, water_source, farm_type)
        values (${farmerId}, ${"Nakato Family Farm"}, ${"Mukono"}, ${"Nakifuma"}, ${3.5}, ${"Loam"}, ${"Rain-fed"}, ${"Mixed farming"})
        returning id
      `;
      const farmId = farm[0].id;
      await sql`
        insert into farm_entries (farm_id, owner_id, module, name, detail, status, quantity, unit, amount_ugx, record_date)
        values
          (${farmId}, ${farmerId}, ${"crops"}, ${"Maize"}, ${"Longe 10H planted in the north field."}, ${"Growing"}, ${3.5}, ${"acres"}, ${0}, ${"2026-08-12"}),
          (${farmId}, ${farmerId}, ${"crops"}, ${"Beans"}, ${"Nambale short-season variety."}, ${"Growing"}, ${1}, ${"acres"}, ${0}, ${"2026-09-02"}),
          (${farmId}, ${farmerId}, ${"livestock"}, ${"Cattle"}, ${"Four Friesian crosses, dewormed this month."}, ${"Healthy"}, ${4}, ${"cattle"}, ${0}, ${"2026-11-01"}),
          (${farmId}, ${farmerId}, ${"poultry"}, ${"Chickens"}, ${"240 layers in the east house."}, ${"Active"}, ${240}, ${"chickens"}, ${0}, ${"2026-11-01"}),
          (${farmId}, ${farmerId}, ${"eggs"}, ${"Eggs collected"}, ${"Morning and evening trays combined."}, ${"Active"}, ${186}, ${"eggs"}, ${0}, ${"2026-11-18"}),
          (${farmId}, ${farmerId}, ${"milk"}, ${"Morning milking"}, ${"Both cows in milk."}, ${"Active"}, ${18}, ${"litres"}, ${0}, ${"2026-11-18"}),
          (${farmId}, ${farmerId}, ${"tasks"}, ${"Top-dress the maize"}, ${"Second split of urea before tasseling."}, ${"Today"}, ${0}, ${""}, ${0}, ${"2026-11-20"}),
          (${farmId}, ${farmerId}, ${"finance"}, ${"Maize sale to Nakifuma trader"}, ${"Part of the August harvest, 12 bags."}, ${"Income"}, ${12}, ${"bags"}, ${936000}, ${"2026-09-15"}),
          (${farmId}, ${farmerId}, ${"finance"}, ${"Bean seed and fertiliser"}, ${"Planting inputs for the beans."}, ${"Expense"}, ${1}, ${"acres"}, ${310000}, ${"2026-09-01"}),
          (${farmId}, ${farmerId}, ${"finance"}, ${"Layer feed, 4 bags"}, ${"Growers mash from Mukono agro-shop."}, ${"Expense"}, ${4}, ${"bags"}, ${480000}, ${"2026-11-05"}),
          (${farmId}, ${farmerId}, ${"warehouse"}, ${"Maize in store"}, ${"Dried and bagged in the store room."}, ${"Active"}, ${8}, ${"bags"}, ${0}, ${"2026-10-01"})
      `;
      const items = await sql<{ id: number; name: string }>`
        insert into inventory_items (farm_id, owner_id, name, unit, minimum_stock)
        values
          (${farmId}, ${farmerId}, ${"Maize grain"}, ${"bags"}, ${2}),
          (${farmId}, ${farmerId}, ${"Dry Maize"}, ${"kg"}, ${50}),
          (${farmId}, ${farmerId}, ${"Layer feed"}, ${"bags"}, ${1}),
          (${farmId}, ${farmerId}, ${"Urea fertiliser"}, ${"kg"}, ${25})
        returning id, name
      `;
      const feed = items.find((i) => i.name === "Layer feed");
      const urea = items.find((i) => i.name === "Urea fertiliser");
      if (feed) {
        await sql`
          insert into inventory_movements (item_id, farm_id, owner_id, quantity, reason, record_date)
          values
            (${feed.id}, ${farmId}, ${farmerId}, ${8}, ${"Opening stock: growers mash purchase"}, ${"2026-11-05"}),
            (${feed.id}, ${farmId}, ${farmerId}, ${-4}, ${"Issued to the layer house"}, ${"2026-11-12"})
        `;
      }
      const dried = items.find((i) => i.name === "Dry Maize");
      if (dried) {
        await sql`
          insert into inventory_movements (item_id, farm_id, owner_id, quantity, reason, record_date)
          values (${dried.id}, ${farmId}, ${farmerId}, ${120}, ${"Dried maize from the September harvest"}, ${"2026-10-15"})
        `;
      }
      if (urea) {
        await sql`
          insert into inventory_movements (item_id, farm_id, owner_id, quantity, reason, record_date)
          values (${urea.id}, ${farmId}, ${farmerId}, ${50}, ${"Two 25kg bags before top-dressing"}, ${"2026-11-18"})
        `;
      }
      const notifCount = await sql<{ n: number }>`
        select count(*)::int as n from notifications where user_id = ${farmerId}
      `;
      if ((notifCount[0]?.n ?? 0) === 0) {
        const buyerId = ids["buyer.demo@akatale.ug"];
        const officerId = ids["officer.demo@akatale.ug"];
        const adminId = ids["jmuziransa@gmail.com"];
        const rows: {
          user: string | undefined;
          kind: string;
          title: string;
          body: string;
          href: string;
          read: boolean;
        }[] = [
          {
            user: farmerId,
            kind: "listing",
            title: "Dry Maize is on the market",
            body: "The administrator approved your 500 kg listing.",
            href: "/desk/sell",
            read: false,
          },
          {
            user: farmerId,
            kind: "order",
            title: "New order from Peter Okello",
            body: "150 kg of Dry Maize requested for Friday delivery.",
            href: "/desk/orders",
            read: false,
          },
          {
            user: farmerId,
            kind: "savings",
            title: "Savings deposit recorded",
            body: "UGX 450,000 was added to your SACCO book.",
            href: "/desk/sacco",
            read: true,
          },
          {
            user: farmerId,
            kind: "loan",
            title: "Loan application received",
            body: "UGX 800,000 for drying racks is awaiting review.",
            href: "/desk/loans",
            read: false,
          },
          {
            user: farmerId,
            kind: "listing",
            title: "Robusta Coffee awaiting review",
            body: "Your 120 kg listing is in the approval queue.",
            href: "/desk/sell",
            read: false,
          },
          {
            user: buyerId,
            kind: "loan",
            title: "Loan approved",
            body: "UGX 250,000 trading float is ready for disbursement.",
            href: "/desk/loans",
            read: false,
          },
          {
            user: adminId,
            kind: "approval",
            title: "Coffee listing awaiting approval",
            body: "Amina Nakato submitted 120 kg of Robusta Coffee.",
            href: "/desk/admin",
            read: false,
          },
          {
            user: adminId,
            kind: "loan",
            title: "Loan request from Amina Nakato",
            body: "UGX 800,000 for drying racks and tarpaulins.",
            href: "/desk/admin",
            read: false,
          },
          {
            user: officerId,
            kind: "savings",
            title: "Deposit recorded",
            body: "UGX 200,000 received from Peter Okello.",
            href: "/desk/sacco",
            read: true,
          },
        ];
        for (const row of rows) {
          if (!row.user) continue;
          if (row.read) {
            await sql`
              insert into notifications (user_id, kind, title, body, href, read_at, created_at)
              values (${row.user}, ${row.kind}, ${row.title}, ${row.body}, ${row.href}, now() - interval '2 days', now() - interval '3 days')
            `;
          } else {
            await sql`
              insert into notifications (user_id, kind, title, body, href, created_at)
              values (${row.user}, ${row.kind}, ${row.title}, ${row.body}, ${row.href}, now() - interval '2 days')
            `;
          }
        }
      }
    }
    return { seeded: true };
  } catch (err) {
    // Release the gate so a failed seed can be retried on the next visit.
    await sql`delete from seed_gate where name = 'desk'`;
    throw err;
  }
}

const globalSeed = globalThis as typeof globalThis & {
  __farmerDemoSeedPromise__?: Promise<void>;
};

/**
 * Seed once per process, memoized on globalThis (dev HMR creates fresh module
 * instances; the promise must not restart with them). Failures log loudly —
 * the login page used to swallow them, leaving quick-fill accounts broken with
 * no trace in the console.
 */
export function ensureDemoSeed(): Promise<void> {
  globalSeed.__farmerDemoSeedPromise__ ??= runDemoSeed()
    .then((result) => {
      if (result.seeded) console.log("[seed] demo desk ready — 4 accounts, listings, farm records");
    })
    .catch((err) => {
      globalSeed.__farmerDemoSeedPromise__ = undefined; // let the next visit retry
      console.error("[seed] demo desk failed to prepare:", err);
      throw err;
    })
    .then(() => undefined);
  return globalSeed.__farmerDemoSeedPromise__;
}

// Server-only eager start: seed as soon as this module loads in Node (it is
// loaded from the auth server bootstrap and from seedDesk). Client bundles
// never import this module — seedDesk reaches it through a dynamic import that
// only exists in the server build.
if (typeof window === "undefined") {
  void ensureDemoSeed();
}
