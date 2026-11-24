import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { entryModules, validateEntry, type EntryModule } from "@/lib/farm-entry-rules";

// Farm production server functions, ported from Farm360's Supabase
// implementation to owner-scoped SQL through the shared auth middleware.

export type Farm = {
  id: number;
  ownerId: string;
  name: string;
  district: string;
  village: string;
  sizeAcres: number;
  soilType: string;
  waterSource: string;
  farmType: string;
  archived: boolean;
  createdAt: string;
};

export type FarmEntry = {
  id: number;
  farmId: number;
  module: EntryModule;
  name: string;
  detail: string;
  status: string;
  quantity: number;
  unit: string;
  amountUgx: number;
  recordDate: string;
  archivedAt: string | null;
  createdAt: string;
};

export type InventoryItem = {
  id: number;
  farmId: number;
  name: string;
  unit: string;
  minimumStock: number;
  archivedAt: string | null;
  balance: number;
};

export type StockMovement = {
  id: number;
  itemId: number;
  itemName: string;
  quantity: number;
  reason: string;
  recordDate: string;
  createdAt: string;
};

type FarmRow = {
  id: number;
  owner_id: string;
  name: string;
  district: string;
  village: string;
  size_acres: string | number;
  soil_type: string;
  water_source: string;
  farm_type: string;
  archived: boolean;
  created_at: string;
};

type EntryRow = {
  id: number;
  farm_id: number;
  module: EntryModule;
  name: string;
  detail: string;
  status: string;
  quantity: string | number;
  unit: string;
  amount_ugx: string | number;
  record_date: string;
  archived_at: string | null;
  created_at: string;
};

type ItemRow = {
  id: number;
  farm_id: number;
  name: string;
  unit: string;
  minimum_stock: string | number;
  archived_at: string | null;
  balance: string | number;
};

type MovementRow = {
  id: number;
  item_id: number;
  item_name: string | null;
  quantity: string | number;
  reason: string;
  record_date: string;
  created_at: string;
};

function num(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function mapFarm(row: FarmRow): Farm {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    district: row.district,
    village: row.village,
    sizeAcres: num(row.size_acres),
    soilType: row.soil_type,
    waterSource: row.water_source,
    farmType: row.farm_type,
    archived: row.archived,
    createdAt: String(row.created_at),
  };
}

function mapEntry(row: EntryRow): FarmEntry {
  return {
    id: row.id,
    farmId: row.farm_id,
    module: row.module,
    name: row.name,
    detail: row.detail,
    status: row.status,
    quantity: num(row.quantity),
    unit: row.unit,
    amountUgx: num(row.amount_ugx),
    recordDate: String(row.record_date).slice(0, 10),
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    createdAt: String(row.created_at),
  };
}

function mapItem(row: ItemRow): InventoryItem {
  return {
    id: row.id,
    farmId: row.farm_id,
    name: row.name,
    unit: row.unit,
    minimumStock: num(row.minimum_stock),
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    balance: num(row.balance),
  };
}

function mapMovement(row: MovementRow): StockMovement {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name ?? "Item",
    quantity: num(row.quantity),
    reason: row.reason,
    recordDate: String(row.record_date).slice(0, 10),
    createdAt: String(row.created_at),
  };
}

async function ownedFarm(
  sql: Awaited<ReturnType<typeof getSql>>,
  farmId: number,
  userId: string,
  opts?: { requireActive?: boolean },
) {
  const rows = await sql<{ id: number; archived: boolean }>`
    select id, archived from farms where id = ${farmId} and owner_id = ${userId}
  `;
  const farm = rows[0];
  if (!farm) throw new Error("Farm not found.");
  if (opts?.requireActive && farm.archived) throw new Error("That farm is archived.");
  return farm;
}

/**
 * Farm records belong to farmer (and administrator) desks only. Buyers and
 * SACCO officers get a clear refusal instead of a silently empty workspace —
 * the desk nav hides the entry points, and this guards direct URL access and
 * the server functions themselves.
 */
async function requireFarmKeeper(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  const rows = await sql<{ role: string }>`
    select role from profiles where user_id = ${userId}
  `;
  const role = rows[0]?.role;
  if (role !== "farmer" && role !== "admin") {
    throw new Error("Only farmer and administrator accounts keep farm records.");
  }
}

/**
 * Light farm list for the desk's Farms dropdowns — ids, names and locations
 * only (no entries, stock or movements), so opening a menu stays cheap.
 */
export const listMyFarms = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(
    async ({
      context,
    }): Promise<
      { id: number; name: string; district: string; farmType: string; archived: boolean }[]
    > => {
      const sql = await getSql();
      const rows = await sql<FarmRow>`
      select id, owner_id, name, district, village, size_acres, soil_type, water_source, farm_type, archived, created_at
      from farms
      where owner_id = ${context.userId}
      order by archived, created_at
    `;
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        district: row.district,
        farmType: row.farm_type,
        archived: row.archived,
      }));
    },
  );

export const getFarmWorkspace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(
    async ({
      context,
    }): Promise<{
      farms: Farm[];
      entries: FarmEntry[];
      items: InventoryItem[];
      movements: StockMovement[];
    }> => {
      const sql = await getSql();
      await requireFarmKeeper(sql, context.userId);
      const [farmRows, entryRows, itemRows, movementRows] = await Promise.all([
        sql<FarmRow>`select * from farms where owner_id = ${context.userId} order by created_at`,
        sql<EntryRow>`
        select * from farm_entries where owner_id = ${context.userId}
        order by record_date desc, id desc
      `,
        sql<ItemRow>`
        select i.*, coalesce((
          select sum(quantity) from inventory_movements m where m.item_id = i.id
        ), 0)::float8 as balance
        from inventory_items i
        where i.owner_id = ${context.userId}
        order by i.name
      `,
        sql<MovementRow>`
        select m.*, i.name as item_name from inventory_movements m
        join inventory_items i on i.id = m.item_id
        where m.owner_id = ${context.userId}
        order by m.created_at desc
      `,
      ]);
      return {
        farms: farmRows.map(mapFarm),
        entries: entryRows.map(mapEntry),
        items: itemRows.map(mapItem),
        movements: movementRows.map(mapMovement),
      };
    },
  );

export const saveFarm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      id?: number;
      name: string;
      district?: string;
      village?: string;
      sizeAcres?: number;
      soilType?: string;
      waterSource?: string;
      farmType?: string;
    }) => {
      const name = input.name?.trim();
      if (!name || name.length > 150)
        throw new Error("Give the farm a name (up to 150 characters).");
      const size = Number(input.sizeAcres ?? 0);
      if (!Number.isFinite(size) || size < 0)
        throw new Error("Size in acres must be zero or more.");
      return {
        id: input.id,
        name,
        district: input.district?.trim() || "",
        village: input.village?.trim() || "",
        sizeAcres: size,
        soilType: input.soilType?.trim() || "",
        waterSource: input.waterSource?.trim() || "",
        farmType: input.farmType?.trim() || "Mixed farming",
      };
    },
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireFarmKeeper(sql, context.userId);
    if (data.id) {
      await ownedFarm(sql, data.id, context.userId);
      await sql`
        update farms set name = ${data.name}, district = ${data.district}, village = ${data.village},
          size_acres = ${data.sizeAcres}, soil_type = ${data.soilType}, water_source = ${data.waterSource},
          farm_type = ${data.farmType}
        where id = ${data.id} and owner_id = ${context.userId}
      `;
      return { ok: true as const, id: data.id };
    }
    const created = await sql<{ id: number }>`
      insert into farms (owner_id, name, district, village, size_acres, soil_type, water_source, farm_type)
      values (${context.userId}, ${data.name}, ${data.district}, ${data.village}, ${data.sizeAcres},
              ${data.soilType}, ${data.waterSource}, ${data.farmType})
      returning id
    `;
    return { ok: true as const, id: created[0].id };
  });

export const setFarmArchived = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; archived: boolean }) => {
    if (!input.id) throw new Error("Missing farm.");
    return { id: input.id, archived: !!input.archived };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireFarmKeeper(sql, context.userId);
    await ownedFarm(sql, data.id, context.userId);
    await sql`update farms set archived = ${data.archived} where id = ${data.id} and owner_id = ${context.userId}`;
    return { ok: true as const };
  });

export const saveFarmEntry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const raw = input as Parameters<typeof validateEntry>[0];
    if (!raw.module || !entryModules.includes(raw.module)) throw new Error("Unknown record type.");
    return validateEntry(raw);
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireFarmKeeper(sql, context.userId);
    await ownedFarm(sql, data.farmId, context.userId, { requireActive: true });
    if (data.id) {
      await sql`
        update farm_entries set farm_id = ${data.farmId}, module = ${data.module}, name = ${data.name},
          detail = ${data.detail}, status = ${data.status}, quantity = ${data.quantity}, unit = ${data.unit},
          amount_ugx = ${data.amount}, record_date = ${data.date}
        where id = ${data.id} and farm_id = ${data.farmId} and owner_id = ${context.userId}
      `;
      return { ok: true as const, id: data.id };
    }
    const created = await sql<{ id: number }>`
      insert into farm_entries (farm_id, owner_id, module, name, detail, status, quantity, unit, amount_ugx, record_date)
      values (${data.farmId}, ${context.userId}, ${data.module}, ${data.name}, ${data.detail}, ${data.status},
              ${data.quantity}, ${data.unit}, ${data.amount}, ${data.date})
      returning id
    `;
    return { ok: true as const, id: created[0].id };
  });

export const setEntryArchived = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; farmId: number; restore: boolean }) => {
    if (!input.id || !input.farmId) throw new Error("Missing record.");
    return { id: input.id, farmId: input.farmId, restore: !!input.restore };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireFarmKeeper(sql, context.userId);
    await ownedFarm(sql, data.farmId, context.userId);
    const stamp = data.restore ? null : new Date().toISOString();
    const updated = await sql<{ id: number }>`
      update farm_entries set archived_at = ${stamp}
      where id = ${data.id} and farm_id = ${data.farmId} and owner_id = ${context.userId}
      returning id
    `;
    if (!updated[0]) throw new Error("Record not found.");
    return { ok: true as const };
  });

export const createInventoryItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { farmId: number; name: string; unit: string; minimum?: number }) => {
    if (!input.farmId) throw new Error("Choose a farm first.");
    const name = input.name?.trim();
    if (!name || name.length > 150) throw new Error("Give the stock item a name.");
    const unit = input.unit?.trim();
    if (!unit || unit.length > 30) throw new Error("Choose a unit.");
    const minimum = Number(input.minimum ?? 0);
    if (!Number.isFinite(minimum) || minimum < 0 || minimum > 999_999_999)
      throw new Error("Minimum stock must be zero or more.");
    return { farmId: input.farmId, name, unit, minimum };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireFarmKeeper(sql, context.userId);
    await ownedFarm(sql, data.farmId, context.userId, { requireActive: true });
    const created = await sql<{ id: number }>`
      insert into inventory_items (farm_id, owner_id, name, unit, minimum_stock)
      values (${data.farmId}, ${context.userId}, ${data.name}, ${data.unit}, ${data.minimum})
      returning id
    `;
    return { ok: true as const, id: created[0].id };
  });

export const recordStockMovement = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { itemId: number; farmId: number; quantity: number; reason: string; date: string }) => {
      if (!input.itemId || !input.farmId) throw new Error("Missing stock item.");
      const quantity = Number(input.quantity);
      if (!Number.isFinite(quantity) || quantity === 0 || Math.abs(quantity) > 999_999_999) {
        throw new Error("Quantity must be a non-zero number.");
      }
      const reason = input.reason?.trim();
      if (!reason || reason.length > 500) throw new Error("Say why this movement happened.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date ?? "")) throw new Error("Choose a valid date.");
      return { itemId: input.itemId, farmId: input.farmId, quantity, reason, date: input.date };
    },
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireFarmKeeper(sql, context.userId);
    await ownedFarm(sql, data.farmId, context.userId);
    const items = await sql<{ id: number; archived_at: string | null }>`
      select id, archived_at from inventory_items
      where id = ${data.itemId} and farm_id = ${data.farmId} and owner_id = ${context.userId}
    `;
    if (!items[0]) throw new Error("Stock item not found.");
    if (items[0].archived_at) throw new Error("That stock item is archived.");
    try {
      await sql`
        insert into inventory_movements (item_id, farm_id, owner_id, quantity, reason, record_date)
        values (${data.itemId}, ${data.farmId}, ${context.userId}, ${data.quantity}, ${data.reason}, ${data.date})
      `;
    } catch (err) {
      // The ledger trigger rejects future dates and negative balances.
      throw new Error(
        err instanceof Error && /Not enough stock|future date/.test(err.message)
          ? err.message
          : "Stock movement refused. Check available stock and the date.",
      );
    }
    return { ok: true as const };
  });

export type DemoFarmRecord = {
  module: string;
  name: string;
  status: string;
  quantity: number;
  unit: string;
  recordDate: string;
};

export type DemoFarmSnapshot = {
  name: string;
  district: string;
  village: string;
  sizeAcres: number;
  cropCount: number;
  animalCount: number;
  financeIncome: number;
  financeExpense: number;
  records: DemoFarmRecord[];
};

/**
 * Read-only snapshot of the seeded demo farm for the public landing page.
 * No middleware — visitors see module names, statuses and quantities only,
 * never the owner's identity or individual money movements.
 */
export const publicDemoFarm = createServerFn({ method: "GET" }).handler(
  async (): Promise<DemoFarmSnapshot | null> => {
    const sql = await getSql();
    const farms = await sql<{
      id: number;
      name: string;
      district: string;
      village: string;
      size_acres: string | number;
    }>`
    select f.id, f.name, f.district, f.village, f.size_acres
    from farms f
    join profiles p on p.user_id = f.owner_id
    where p.farm_name = ${"Nakato Family Farm"} and f.archived = false
    order by f.id limit 1
  `;
    const farm = farms[0];
    if (!farm) return null;
    const [stats, records] = await Promise.all([
      sql<{
        crop_count: number;
        animal_count: number;
        income: string | number;
        expense: string | number;
      }>`
      select
        (select count(*)::int from farm_entries where farm_id = ${farm.id} and module = 'crops' and archived_at is null) as crop_count,
        (
          select coalesce(sum(quantity), 0)::int from farm_entries
          where farm_id = ${farm.id} and module in ('livestock', 'poultry') and archived_at is null
        ) as animal_count,
        (
          select coalesce(sum(amount_ugx), 0)::int from farm_entries
          where farm_id = ${farm.id} and module = 'finance' and status = 'Income' and archived_at is null
        ) as income,
        (
          select coalesce(sum(amount_ugx), 0)::int from farm_entries
          where farm_id = ${farm.id} and module = 'finance' and status = 'Expense' and archived_at is null
        ) as expense
    `,
      sql<EntryRow>`
      select * from farm_entries
      where farm_id = ${farm.id} and archived_at is null and module <> 'tasks'
      order by record_date desc, id desc limit 6
    `,
    ]);
    const row = stats[0];
    return {
      name: farm.name,
      district: farm.district,
      village: farm.village,
      sizeAcres: num(farm.size_acres),
      cropCount: row?.crop_count ?? 0,
      animalCount: row?.animal_count ?? 0,
      financeIncome: num(row?.income ?? 0),
      financeExpense: num(row?.expense ?? 0),
      records: records.map((r) => ({
        module: r.module,
        name: r.name,
        status: r.status,
        quantity: num(r.quantity),
        unit: r.unit,
        recordDate: String(r.record_date).slice(0, 10),
      })),
    };
  },
);

/** Store items matching a crop name, for the "list produce" availability hint. */
export const stockForCrop = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { crop: string }) => {
    const crop = input.crop?.trim();
    if (!crop) throw new Error("Name a crop.");
    return { crop };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: number; name: string; unit: string; balance: string | number }>`
      select i.id, i.name, i.unit,
        coalesce((select sum(m.quantity) from inventory_movements m where m.item_id = i.id), 0)::float8 as balance
      from inventory_items i
      where i.owner_id = ${context.userId} and i.archived_at is null
        and (i.name ilike ${data.crop} or i.name ilike ${`%${data.crop}%`})
      order by (i.name ilike ${data.crop}) desc, length(i.name), i.id
      limit 4
    `;
    return rows.map((r) => ({ id: r.id, name: r.name, unit: r.unit, balance: num(r.balance) }));
  });
