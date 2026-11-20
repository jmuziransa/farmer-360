import { createServerFn } from "@tanstack/react-start";
import { auth } from "@/lib/auth/server";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { savingsBalance } from "@/lib/sacco-rules";
import { gateIdentityEnabled } from "@/lib/auth/gate-identity.server";
import { DEV_USER_ID } from "@/lib/auth/verify.server";

export type Role = "farmer" | "buyer" | "officer" | "admin";

export type Profile = {
  userId: string;
  fullName: string;
  role: Role;
  phone: string | null;
  district: string | null;
  farmName: string | null;
};

export type Listing = {
  id: number;
  farmerId: string;
  farmerName: string;
  crop: string;
  quantity: number;
  unit: string;
  unitPriceUgx: number;
  district: string;
  subcounty: string | null;
  description: string | null;
  farmName: string | null;
  phone: string | null;
  harvestDate: string | null;
  qualityGrade: string | null;
  photoData: string | null;
  status: string;
  rejectionNote: string | null;
  createdAt: string;
};

type ListingRow = {
  id: number;
  farmer_id: string;
  farmer_name: string | null;
  crop: string;
  quantity: string | number;
  unit: string;
  unit_price_ugx: number;
  district: string;
  subcounty: string | null;
  description: string | null;
  farm_name: string | null;
  phone: string | null;
  harvest_date: string | null;
  quality_grade: string | null;
  photo_data: string | null;
  status: string;
  rejection_note: string | null;
  created_at: string;
};

function num(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function mapListing(row: ListingRow): Listing {
  return {
    id: row.id,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name ?? "Member",
    crop: row.crop,
    quantity: num(row.quantity),
    unit: row.unit,
    unitPriceUgx: row.unit_price_ugx,
    district: row.district,
    subcounty: row.subcounty,
    description: row.description,
    farmName: row.farm_name,
    phone: row.phone,
    harvestDate: row.harvest_date,
    qualityGrade: row.quality_grade,
    photoData: row.photo_data,
    status: row.status,
    rejectionNote: row.rejection_note,
    createdAt: String(row.created_at),
  };
}

async function requireProfile(userId: string, roles?: Role[]): Promise<Profile> {
  const sql = await getSql();
  const rows = await sql<{
    user_id: string;
    full_name: string;
    role: Role;
    phone: string | null;
    district: string | null;
    farm_name: string | null;
  }>`select user_id, full_name, role, phone, district, farm_name from profiles where user_id = ${userId}`;
  const row = rows[0];
  if (!row) throw new Error("Finish your profile before using the desk.");
  if (roles && !roles.includes(row.role)) throw new Error("You do not have access to that.");
  return {
    userId: row.user_id,
    fullName: row.full_name,
    role: row.role,
    phone: row.phone,
    district: row.district,
    farmName: row.farm_name,
  };
}

type SqlClient = Awaited<ReturnType<typeof getSql>>;

/**
 * Append one entry to the activity audit trail. Call from every admin/officer
 * decision function so the Administration page can show who did what.
 */
async function logActivity(
  sql: SqlClient,
  actorId: string,
  actorName: string,
  action: string,
  entity: string,
  entityId: string,
  detail: string,
): Promise<void> {
  await sql`
    insert into activity_log (actor_id, actor_name, action, entity, entity_id, detail)
    values (${actorId}, ${actorName}, ${action}, ${entity}, ${entityId}, ${detail})
  `;
}

const DEMO = [
  { email: "jmuziransa@gmail.com", password: "Akatale#2026", name: "J. Muziransa", role: "admin" as Role, district: "Wakiso", phone: "0700000001", farm: null },
  { email: "farmer.demo@akatale.ug", password: "Harvest#2026", name: "Amina Nakato", role: "farmer" as Role, district: "Mukono", phone: "0700111222", farm: "Nakato Family Farm" },
  { email: "buyer.demo@akatale.ug", password: "Market#2026", name: "Peter Okello", role: "buyer" as Role, district: "Kampala", phone: "0700333444", farm: null },
  { email: "officer.demo@akatale.ug", password: "Sacco#2026", name: "Grace Namuli", role: "officer" as Role, district: "Masaka", phone: "0700555666", farm: null },
];

export const seedDesk = createServerFn({ method: "POST" }).handler(async () => {
  const sql = await getSql();
  // Claim the seed atomically: two visitors hitting the landing page at the
  // same moment must not both run the content inserts below.
  const gate = await sql<{ name: string }>`
    insert into seed_gate (name) values ('desk') on conflict (name) do nothing returning name
  `;
  if (!gate[0]) return { ok: true as const, seeded: false };
  try {
    const authOn = gateIdentityEnabled();
    const ids: Record<string, string> = {};
    for (const person of DEMO) {
      let id: string;
      if (authOn) {
        const found = await sql<{ id: string }>`select id from "user" where email = ${person.email}`;
        let userId = found[0]?.id;
        if (!userId) {
          const created = await auth.api.signUpEmail({
            body: { email: person.email, password: person.password, name: person.name },
          });
          userId = created?.user?.id;
          if (!userId) {
            const again = await sql<{ id: string }>`select id from "user" where email = ${person.email}`;
            userId = again[0]?.id;
          }
        }
        if (!userId) throw new Error(`Could not prepare ${person.email}`);
        id = userId;
      } else {
        // Preview with sign-in off: the shared dev identity owns the farmer
        // content and carries the admin role, so the whole desk is reachable;
        // the other personas become profile-only rows so joins show names.
        id = person.role === "farmer" || person.role === "admin" ? DEV_USER_ID : `demo-${person.role}`;
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
  const existing = await sql<{ n: number }>`select count(*)::int as n from listings`;
  if ((existing[0]?.n ?? 0) === 0 && farmerId) {
    await sql`
      insert into listings (farmer_id, crop, quantity, unit, unit_price_ugx, district, subcounty, description, farm_name, phone, harvest_date, quality_grade, status)
      values
        (${farmerId}, ${"Dry Maize"}, ${500}, ${"kg"}, ${1800}, ${"Mukono"}, ${"Nakifuma"}, ${"Sun-dried grain from the last harvest, bagged and ready."}, ${"Nakato Family Farm"}, ${"0700111222"}, ${"2026-08-12"}, ${"Grade A"}, ${"live"}),
        (${farmerId}, ${"Matooke"}, ${40}, ${"bunches"}, ${25000}, ${"Masaka"}, ${"Bukoto"}, ${"Green cooking bananas, sorted by size."}, ${"Nakato Family Farm"}, ${"0700111222"}, ${"2026-11-02"}, ${"Sorted"}, ${"live"}),
        (${farmerId}, ${"Robusta Coffee"}, ${120}, ${"kg"}, ${8500}, ${"Mukono"}, ${"Ntenjeru"}, ${"Dried cherry, awaiting the next mill slot."}, ${"Nakato Family Farm"}, ${"0700111222"}, ${"2026-10-20"}, ${"Dried"}, ${"pending"})
    `;
    await sql`
      insert into loans (member_id, amount_ugx, purpose, term_months, status)
      values (${farmerId}, ${800000}, ${"Drying racks and two extra tarpaulins before the rains."}, ${6}, ${"pending"})
    `;
    await sql`
      insert into savings_ledger (member_id, kind, amount_ugx, note, officer_id)
      values
        (${farmerId}, ${"deposit"}, ${450000}, ${"Opening savings"}, ${ids["officer.demo@akatale.ug"]}),
        (${ids["buyer.demo@akatale.ug"]}, ${"deposit"}, ${200000}, ${"Buyer float"}, ${ids["officer.demo@akatale.ug"]})
    `;
  }

  // Demo farm production records (Farm360 side of the merge): a farm, module
  // entries, stock items and ledger movements for the farmer account.
  const farmCount = await sql<{ n: number }>`select count(*)::int as n from farms where owner_id = ${farmerId}`;
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
  }
  return { ok: true as const, seeded: true };
  } catch (err) {
    // Release the gate so a failed seed can be retried on the next visit.
    await sql`delete from seed_gate where name = 'desk'`;
    throw err;
  }
});

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Profile | null> => {
    const sql = await getSql();
    const rows = await sql<{
      user_id: string;
      full_name: string;
      role: Role;
      phone: string | null;
      district: string | null;
      farm_name: string | null;
    }>`select user_id, full_name, role, phone, district, farm_name from profiles where user_id = ${context.userId}`;
    const row = rows[0];
    if (!row) return null;
    return {
      userId: row.user_id,
      fullName: row.full_name,
      role: row.role,
      phone: row.phone,
      district: row.district,
      farmName: row.farm_name,
    };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { fullName: string; role: Role; phone?: string; district?: string; farmName?: string }) => {
    const fullName = input.fullName?.trim();
    const role = input.role;
    if (!fullName) throw new Error("Name is required.");
    if (!["farmer", "buyer", "officer"].includes(role)) throw new Error("Choose farmer, buyer, or SACCO officer.");
    return {
      fullName,
      role,
      phone: input.phone?.trim() || null,
      district: input.district?.trim() || null,
      farmName: input.farmName?.trim() || null,
    };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql<{ role: Role }>`select role from profiles where user_id = ${context.userId}`;
    if (existing[0]?.role === "admin") {
      await sql`
        update profiles set full_name = ${data.fullName}, phone = ${data.phone}, district = ${data.district}, farm_name = ${data.farmName}
        where user_id = ${context.userId}
      `;
      return { ok: true as const };
    }
    await sql`
      insert into profiles (user_id, full_name, role, phone, district, farm_name)
      values (${context.userId}, ${data.fullName}, ${data.role}, ${data.phone}, ${data.district}, ${data.farmName})
      on conflict (user_id) do update set
        full_name = excluded.full_name,
        role = excluded.role,
        phone = excluded.phone,
        district = excluded.district,
        farm_name = excluded.farm_name
    `;
    return { ok: true as const };
  });

export const listLiveListings = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<ListingRow>`
    select l.id, l.farmer_id, p.full_name as farmer_name, l.crop, l.quantity::float8 as quantity,
           l.unit, l.unit_price_ugx, l.district, l.subcounty, l.description, l.farm_name, l.phone,
           l.harvest_date, l.quality_grade, l.photo_data, l.status, l.rejection_note,
           l.created_at::text as created_at
    from listings l
    left join profiles p on p.user_id = l.farmer_id
    where l.status = 'live'
    order by l.created_at desc
  `;
  return rows.map(mapListing);
});

export const myListings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireProfile(context.userId, ["farmer", "admin"]);
    const sql = await getSql();
    const rows = await sql<ListingRow>`
      select l.id, l.farmer_id, p.full_name as farmer_name, l.crop, l.quantity::float8 as quantity,
             l.unit, l.unit_price_ugx, l.district, l.subcounty, l.description, l.farm_name, l.phone,
             l.harvest_date, l.quality_grade, l.photo_data, l.status, l.rejection_note,
             l.created_at::text as created_at
      from listings l
      left join profiles p on p.user_id = l.farmer_id
      where l.farmer_id = ${context.userId} or exists (
        select 1 from profiles a where a.user_id = ${context.userId} and a.role = 'admin'
      )
      order by l.created_at desc
    `;
    return rows.map(mapListing);
  });

export const createListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    crop: string;
    quantity: number;
    unit: string;
    unitPriceUgx: number;
    district: string;
    subcounty?: string;
    description?: string;
    farmName?: string;
    phone?: string;
    harvestDate?: string;
    qualityGrade?: string;
    photoData?: string;
  }) => {
    const crop = input.crop?.trim();
    if (!crop) throw new Error("Crop name is required.");
    if (!input.quantity || input.quantity <= 0) throw new Error("Quantity must be greater than zero.");
    if (!input.unit?.trim()) throw new Error("Unit is required.");
    if (!input.unitPriceUgx || input.unitPriceUgx <= 0) throw new Error("Unit price is required.");
    if (!input.district?.trim()) throw new Error("District is required.");
    if (input.photoData && input.photoData.length > 180_000) throw new Error("Photo is too large. Use a smaller image.");
    return {
      crop,
      quantity: input.quantity,
      unit: input.unit.trim(),
      unitPriceUgx: Math.round(input.unitPriceUgx),
      district: input.district.trim(),
      subcounty: input.subcounty?.trim() || null,
      description: input.description?.trim() || null,
      farmName: input.farmName?.trim() || null,
      phone: input.phone?.trim() || null,
      harvestDate: input.harvestDate || null,
      qualityGrade: input.qualityGrade?.trim() || null,
      photoData: input.photoData || null,
    };
  })
  .handler(async ({ context, data }) => {
    const profile = await requireProfile(context.userId, ["farmer", "admin"]);
    const sql = await getSql();
    await sql`
      insert into listings (
        farmer_id, crop, quantity, unit, unit_price_ugx, district, subcounty, description,
        farm_name, phone, harvest_date, quality_grade, photo_data, status
      ) values (
        ${context.userId}, ${data.crop}, ${data.quantity}, ${data.unit}, ${data.unitPriceUgx},
        ${data.district}, ${data.subcounty}, ${data.description},
        ${data.farmName || profile.farmName}, ${data.phone || profile.phone},
        ${data.harvestDate}, ${data.qualityGrade}, ${data.photoData}, ${"pending"}
      )
    `;
    return { ok: true as const };
  });

export const listQueue = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireProfile(context.userId, ["admin"]);
    const sql = await getSql();
    const listings = await sql<ListingRow>`
      select l.id, l.farmer_id, p.full_name as farmer_name, l.crop, l.quantity::float8 as quantity,
             l.unit, l.unit_price_ugx, l.district, l.subcounty, l.description, l.farm_name, l.phone,
             l.harvest_date, l.quality_grade, l.photo_data, l.status, l.rejection_note,
             l.created_at::text as created_at
      from listings l
      left join profiles p on p.user_id = l.farmer_id
      where l.status = 'pending'
      order by l.created_at asc
    `;
    const loans = await sql<{
      id: number;
      member_id: string;
      member_name: string | null;
      amount_ugx: number;
      purpose: string;
      term_months: number;
      status: string;
      created_at: string;
    }>`
      select l.id, l.member_id, p.full_name as member_name, l.amount_ugx, l.purpose, l.term_months, l.status,
             l.created_at::text as created_at
      from loans l
      left join profiles p on p.user_id = l.member_id
      where l.status = 'pending'
      order by l.created_at asc
    `;
    return {
      listings: listings.map(mapListing),
      loans: loans.map((row) => ({
        id: row.id,
        memberId: row.member_id,
        memberName: row.member_name ?? "Member",
        amountUgx: row.amount_ugx,
        purpose: row.purpose,
        termMonths: row.term_months,
        status: row.status,
        createdAt: row.created_at,
      })),
    };
  });

export const decideListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; decision: "live" | "rejected"; note?: string }) => {
    if (!input.id) throw new Error("Missing listing.");
    if (input.decision !== "live" && input.decision !== "rejected") throw new Error("Choose approve or reject.");
    return { id: input.id, decision: input.decision, note: input.note?.trim() || null };
  })
  .handler(async ({ context, data }) => {
    const actor = await requireProfile(context.userId, ["admin"]);
    const sql = await getSql();
    const target = await sql<{ crop: string }>`select crop from listings where id = ${data.id}`;
    await sql`
      update listings set status = ${data.decision}, rejection_note = ${data.note}
      where id = ${data.id} and status = 'pending'
    `;
    await logActivity(sql, context.userId, actor.fullName,
      data.decision === "live" ? "listing.approved" : "listing.rejected",
      "listing", String(data.id),
      `${target[0]?.crop ?? "produce"}${data.note ? ` — ${data.note}` : ""}`);
    return { ok: true as const };
  });

export const decideLoan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; decision: "approved" | "rejected"; note?: string }) => {
    if (!input.id) throw new Error("Missing loan.");
    if (input.decision !== "approved" && input.decision !== "rejected") throw new Error("Choose approve or reject.");
    return { id: input.id, decision: input.decision, note: input.note?.trim() || null };
  })
  .handler(async ({ context, data }) => {
    const actor = await requireProfile(context.userId, ["admin"]);
    const sql = await getSql();
    const target = await sql<{ amount_ugx: number; member_name: string | null }>`
      select l.amount_ugx, p.full_name as member_name
      from loans l left join profiles p on p.user_id = l.member_id
      where l.id = ${data.id}
    `;
    await sql`
      update loans set status = ${data.decision}, rejection_note = ${data.note}
      where id = ${data.id} and status = 'pending'
    `;
    await logActivity(sql, context.userId, actor.fullName,
      data.decision === "approved" ? "loan.approved" : "loan.rejected",
      "loan", String(data.id),
      `${target[0]?.member_name ?? "Member"} · UGX ${target[0]?.amount_ugx ?? "?"}${data.note ? ` — ${data.note}` : ""}`);
    return { ok: true as const };
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireProfile(context.userId, ["admin", "officer"]);
    const sql = await getSql();
    const counts = await sql<{
      total_listings: number;
      pending_listings: number;
      live_listings: number;
      pending_loans: number;
      savings: number;
      outstanding: number;
    }>`
      select
        (select count(*)::int from listings) as total_listings,
        (select count(*)::int from listings where status = 'pending') as pending_listings,
        (select count(*)::int from listings where status = 'live') as live_listings,
        (select count(*)::int from loans where status = 'pending') as pending_loans,
        (
          select coalesce(sum(case when kind = 'deposit' then amount_ugx else -amount_ugx end), 0)::int
          from savings_ledger
        ) as savings,
        (
          select coalesce(sum(greatest(l.amount_ugx - coalesce(r.paid, 0), 0)), 0)::int
          from loans l
          left join (
            select loan_id, sum(amount_ugx)::int as paid from loan_repayments group by loan_id
          ) r on r.loan_id = l.id
          where l.status in ('approved', 'active')
        ) as outstanding
    `;
    const row = counts[0];
    const savings = row?.savings ?? 0;
    const outstanding = row?.outstanding ?? 0;
    return {
      totalListings: row?.total_listings ?? 0,
      pendingListings: row?.pending_listings ?? 0,
      pendingLoans: row?.pending_loans ?? 0,
      pendingApprovals: (row?.pending_listings ?? 0) + (row?.pending_loans ?? 0),
      liveListings: row?.live_listings ?? 0,
      totalSavings: savings,
      activeLoans: outstanding,
      liquidity: savings - outstanding,
    };
  });

export const myLoans = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const profile = await requireProfile(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      member_id: string;
      member_name: string | null;
      amount_ugx: number;
      purpose: string;
      term_months: number;
      status: string;
      rejection_note: string | null;
      paid: number;
      created_at: string;
    }>`
      select l.id, l.member_id, p.full_name as member_name, l.amount_ugx, l.purpose, l.term_months,
             l.status, l.rejection_note, coalesce(r.paid, 0)::int as paid, l.created_at::text as created_at
      from loans l
      left join profiles p on p.user_id = l.member_id
      left join (
        select loan_id, sum(amount_ugx)::int as paid from loan_repayments group by loan_id
      ) r on r.loan_id = l.id
      where l.member_id = ${context.userId}
         or ${profile.role} in ('admin', 'officer')
      order by l.created_at desc
    `;
    return rows.map((row) => ({
      id: row.id,
      memberId: row.member_id,
      memberName: row.member_name ?? "Member",
      amountUgx: row.amount_ugx,
      purpose: row.purpose,
      termMonths: row.term_months,
      status: row.status,
      rejectionNote: row.rejection_note,
      paid: row.paid,
      createdAt: row.created_at,
      mine: row.member_id === context.userId,
    }));
  });

export const applyLoan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { amountUgx: number; purpose: string; termMonths: number }) => {
    if (!input.amountUgx || input.amountUgx < 50000) throw new Error("Minimum loan is UGX 50,000.");
    if (!input.purpose?.trim()) throw new Error("Say what the loan is for.");
    if (!input.termMonths || input.termMonths < 1 || input.termMonths > 24) throw new Error("Term must be 1 to 24 months.");
    return { amountUgx: Math.round(input.amountUgx), purpose: input.purpose.trim(), termMonths: input.termMonths };
  })
  .handler(async ({ context, data }) => {
    await requireProfile(context.userId, ["farmer", "buyer", "officer"]);
    const sql = await getSql();
    await sql`
      insert into loans (member_id, amount_ugx, purpose, term_months, status)
      values (${context.userId}, ${data.amountUgx}, ${data.purpose}, ${data.termMonths}, ${"pending"})
    `;
    return { ok: true as const };
  });

export const mySavings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const profile = await requireProfile(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      member_id: string;
      member_name: string | null;
      kind: string;
      amount_ugx: number;
      note: string | null;
      created_at: string;
    }>`
      select s.id, s.member_id, p.full_name as member_name, s.kind, s.amount_ugx, s.note, s.created_at::text as created_at
      from savings_ledger s
      left join profiles p on p.user_id = s.member_id
      where s.member_id = ${context.userId} or ${profile.role} in ('admin', 'officer')
      order by s.created_at desc
      limit 80
    `;
    const mine = rows.filter((row) => row.member_id === context.userId);
    const balance = savingsBalance(mine);
    return {
      balance,
      entries: rows.map((row) => ({
        id: row.id,
        memberId: row.member_id,
        memberName: row.member_name ?? "Member",
        kind: row.kind,
        amountUgx: row.amount_ugx,
        note: row.note,
        createdAt: row.created_at,
      })),
    };
  });

export const recordSavings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { memberId: string; kind: "deposit" | "withdrawal"; amountUgx: number; note?: string }) => {
    if (!input.memberId) throw new Error("Choose a member.");
    if (input.kind !== "deposit" && input.kind !== "withdrawal") throw new Error("Choose deposit or withdrawal.");
    if (!input.amountUgx || input.amountUgx <= 0) throw new Error("Amount is required.");
    return { memberId: input.memberId, kind: input.kind, amountUgx: Math.round(input.amountUgx), note: input.note?.trim() || null };
  })
  .handler(async ({ context, data }) => {
    await requireProfile(context.userId, ["officer", "admin"]);
    const sql = await getSql();
    if (data.kind === "withdrawal") {
      const bal = await sql<{ n: number }>`
        select coalesce(sum(case when kind = 'deposit' then amount_ugx else -amount_ugx end), 0)::int as n
        from savings_ledger where member_id = ${data.memberId}
      `;
      if ((bal[0]?.n ?? 0) < data.amountUgx) throw new Error("Withdrawal is larger than the member's savings.");
    }
    await sql`
      insert into savings_ledger (member_id, kind, amount_ugx, note, officer_id)
      values (${data.memberId}, ${data.kind}, ${data.amountUgx}, ${data.note}, ${context.userId})
    `;
    return { ok: true as const };
  });

export const listMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireProfile(context.userId, ["officer", "admin"]);
    const sql = await getSql();
    const rows = await sql<{ user_id: string; full_name: string; role: Role; district: string | null }>`
      select user_id, full_name, role, district from profiles order by full_name
    `;
    return rows.map((row) => ({
      userId: row.user_id,
      fullName: row.full_name,
      role: row.role,
      district: row.district,
    }));
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; role: Role }) => {
    if (!input.userId) throw new Error("Missing member.");
    if (!["farmer", "buyer", "officer", "admin"].includes(input.role)) throw new Error("Unknown role.");
    return { userId: input.userId, role: input.role };
  })
  .handler(async ({ context, data }) => {
    const actor = await requireProfile(context.userId, ["admin"]);
    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("You cannot remove your own admin role.");
    }
    const sql = await getSql();
    const member = await sql<{ full_name: string }>`
      select full_name from profiles where user_id = ${data.userId}
    `;
    await sql`update profiles set role = ${data.role} where user_id = ${data.userId}`;
    await logActivity(sql, context.userId, actor.fullName, "member.role_changed",
      "member", data.userId, `${member[0]?.full_name ?? data.userId} → ${data.role}`);
    return { ok: true as const };
  });

export const disburseLoan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number }) => {
    if (!input.id) throw new Error("Missing loan.");
    return { id: input.id };
  })
  .handler(async ({ context, data }) => {
    const actor = await requireProfile(context.userId, ["officer", "admin"]);
    const sql = await getSql();
    const target = await sql<{ amount_ugx: number; member_name: string | null }>`
      select l.amount_ugx, p.full_name as member_name
      from loans l left join profiles p on p.user_id = l.member_id
      where l.id = ${data.id}
    `;
    await sql`update loans set status = 'active' where id = ${data.id} and status = 'approved'`;
    await logActivity(sql, context.userId, actor.fullName, "loan.disbursed",
      "loan", String(data.id),
      `${target[0]?.member_name ?? "Member"} · UGX ${target[0]?.amount_ugx ?? "?"}`);
    return { ok: true as const };
  });

export type ActivityEntry = {
  id: number;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
  createdAt: string;
};

export const recentActivity = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ActivityEntry[]> => {
    await requireProfile(context.userId, ["admin", "officer"]);
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      actor_name: string;
      action: string;
      entity: string;
      entity_id: string;
      detail: string;
      created_at: string;
    }>`
      select id, actor_name, action, entity, entity_id, detail, created_at::text as created_at
      from activity_log order by created_at desc limit 30
    `;
    return rows.map((row) => ({
      id: row.id,
      actorName: row.actor_name || "System",
      action: row.action,
      entity: row.entity,
      entityId: row.entity_id,
      detail: row.detail,
      createdAt: row.created_at,
    }));
  });

export const repayLoan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; amountUgx: number; note?: string }) => {
    if (!input.id || !input.amountUgx || input.amountUgx <= 0) throw new Error("Enter a repayment amount.");
    return { id: input.id, amountUgx: Math.round(input.amountUgx), note: input.note?.trim() || null };
  })
  .handler(async ({ context, data }) => {
    const profile = await requireProfile(context.userId, ["officer", "admin", "farmer", "buyer"]);
    const sql = await getSql();
    const loans = await sql<{ member_id: string; amount_ugx: number; status: string; paid: number }>`
      select l.member_id, l.amount_ugx, l.status, coalesce(r.paid, 0)::int as paid
      from loans l
      left join (select loan_id, sum(amount_ugx)::int as paid from loan_repayments group by loan_id) r on r.loan_id = l.id
      where l.id = ${data.id}
    `;
    const loan = loans[0];
    if (!loan) throw new Error("Loan not found.");
    if (profile.role !== "admin" && profile.role !== "officer" && loan.member_id !== context.userId) {
      throw new Error("You do not have access to that.");
    }
    if (loan.status !== "active" && loan.status !== "approved") throw new Error("This loan is not open for repayment.");
    await sql`
      insert into loan_repayments (loan_id, amount_ugx, note, recorded_by)
      values (${data.id}, ${data.amountUgx}, ${data.note}, ${context.userId})
    `;
    if (loan.paid + data.amountUgx >= loan.amount_ugx) {
      await sql`update loans set status = 'closed' where id = ${data.id}`;
    } else if (loan.status === "approved") {
      await sql`update loans set status = 'active' where id = ${data.id}`;
    }
    return { ok: true as const };
  });

export type OrderRow = {
  id: number;
  listingId: number;
  crop: string;
  buyerId: string;
  buyerName: string;
  quantity: number;
  unit: string;
  note: string | null;
  status: string;
  createdAt: string;
};

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { listingId: number; quantity: number; note?: string }) => {
    if (!input.listingId || !input.quantity || input.quantity <= 0) throw new Error("Enter a quantity.");
    return { listingId: input.listingId, quantity: input.quantity, note: input.note?.trim() || null };
  })
  .handler(async ({ context, data }) => {
    await requireProfile(context.userId, ["buyer", "admin"]);
    const sql = await getSql();
    const listings = await sql<{ quantity: number; status: string; farmer_id: string }>`
      select quantity::float8 as quantity, status, farmer_id from listings where id = ${data.listingId}
    `;
    const listing = listings[0];
    if (!listing || listing.status !== "live") throw new Error("That listing is not on the market.");
    if (listing.farmer_id === context.userId) throw new Error("You cannot order your own listing.");
    if (data.quantity > listing.quantity) throw new Error("That is more than the farmer listed.");
    await sql`
      insert into orders (listing_id, buyer_id, quantity, note, status)
      values (${data.listingId}, ${context.userId}, ${data.quantity}, ${data.note}, ${"requested"})
    `;
    return { ok: true as const };
  });

export const myOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const profile = await requireProfile(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      listing_id: number;
      crop: string;
      buyer_id: string;
      buyer_name: string | null;
      quantity: number;
      unit: string;
      note: string | null;
      status: string;
      created_at: string;
      farmer_id: string;
    }>`
      select o.id, o.listing_id, l.crop, o.buyer_id, b.full_name as buyer_name, o.quantity::float8 as quantity,
             l.unit, o.note, o.status, o.created_at::text as created_at, l.farmer_id
      from orders o
      join listings l on l.id = o.listing_id
      left join profiles b on b.user_id = o.buyer_id
      where o.buyer_id = ${context.userId}
         or l.farmer_id = ${context.userId}
         or ${profile.role} = 'admin'
      order by o.created_at desc
    `;
    return rows.map((row) => ({
      id: row.id,
      listingId: row.listing_id,
      crop: row.crop,
      buyerId: row.buyer_id,
      buyerName: row.buyer_name ?? "Buyer",
      quantity: row.quantity,
      unit: row.unit,
      note: row.note,
      status: row.status,
      createdAt: row.created_at,
      incoming: row.farmer_id === context.userId,
    }));
  });

export const decideOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; status: "accepted" | "fulfilled" | "declined" }) => input)
  .handler(async ({ context, data }) => {
    const profile = await requireProfile(context.userId, ["farmer", "admin"]);
    const sql = await getSql();
    if (profile.role !== "admin") {
      const owned = await sql<{ n: number }>`
        select count(*)::int as n from orders o
        join listings l on l.id = o.listing_id
        where o.id = ${data.id} and l.farmer_id = ${context.userId}
      `;
      if (!owned[0]?.n) throw new Error("That order is not yours.");
    }
    await sql`update orders set status = ${data.status} where id = ${data.id}`;
    if (data.status === "fulfilled") {
      // Sell from the store: fulfilling an order deducts the produce from the
      // farmer's stock ledger when a matching item holds enough. A shortfall
      // is left for the farmer to reconcile by hand rather than going negative.
      const source = await sql<{ crop: string; quantity: string | number; farmer_id: string }>`
        select l.crop, o.quantity::float8 as quantity, l.farmer_id
        from orders o join listings l on l.id = o.listing_id
        where o.id = ${data.id}
      `;
      const sale = source[0];
      if (sale && sale.farmer_id === context.userId) {
        const items = await sql<{ id: number; balance: string | number }>`
          select i.id,
            coalesce((select sum(m.quantity) from inventory_movements m where m.item_id = i.id), 0)::float8 as balance
          from inventory_items i
          where i.owner_id = ${context.userId} and i.archived_at is null and i.name ilike ${`%${sale.crop}%`}
          order by (i.name ilike ${sale.crop}) desc, length(i.name), i.id
          limit 1
        `;
        const item = items[0];
        const quantity = Number(sale.quantity);
        if (item && Number(item.balance) >= quantity && quantity > 0) {
          await sql`
            insert into inventory_movements (item_id, farm_id, owner_id, quantity, reason, record_date)
            values (${item.id},
                    (select farm_id from inventory_items where id = ${item.id}),
                    ${context.userId}, ${-quantity}, ${`Marketplace sale · order #${data.id}`}, current_date)
          `;
        }
      }
    }
    return { ok: true as const };
  });
