-- Farm production records (ported from Farm360's private farm modules).
-- Every row is scoped to its owning user; the app layer enforces ownership
-- on every query (better-auth user id), matching Farm360's owner-scoped RLS.

create table if not exists farms (
  id serial primary key,
  owner_id text not null,
  name text not null check (length(trim(name)) between 1 and 150),
  district text not null default '',
  village text not null default '',
  size_acres numeric not null default 0 check (size_acres >= 0),
  soil_type text not null default '',
  water_source text not null default '',
  farm_type text not null default 'Mixed farming',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists farms_owner_idx on farms (owner_id);

create table if not exists farm_entries (
  id serial primary key,
  farm_id integer not null references farms (id),
  owner_id text not null,
  module text not null check (module in
    ('crops','livestock','poultry','eggs','milk','tasks','diseases','soil','warehouse','finance','budget')),
  name text not null check (length(trim(name)) between 1 and 150),
  detail text not null default '',
  status text not null default 'Active',
  quantity numeric(12,3) not null default 0 check (quantity >= 0),
  unit text not null default '',
  amount_ugx bigint not null default 0 check (amount_ugx between 0 and 9007199254740991),
  record_date date not null default current_date,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists farm_entries_farm_date_idx on farm_entries (farm_id, record_date);
create index if not exists farm_entries_owner_idx on farm_entries (owner_id);

create table if not exists inventory_items (
  id serial primary key,
  farm_id integer not null references farms (id),
  owner_id text not null,
  name text not null check (length(trim(name)) between 1 and 150),
  unit text not null default 'kg',
  minimum_stock numeric(12,3) not null default 0 check (minimum_stock >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists inventory_items_farm_idx on inventory_items (farm_id);
create index if not exists inventory_items_owner_idx on inventory_items (owner_id);

-- Append-only stock ledger: positive = received, negative = issued. A trigger
-- keeps the running balance from going negative (Farm360's ledger rule).
create table if not exists inventory_movements (
  id serial primary key,
  item_id integer not null references inventory_items (id),
  farm_id integer not null references farms (id),
  owner_id text not null,
  quantity numeric(12,3) not null check (quantity <> 0),
  reason text not null check (length(trim(reason)) between 1 and 500),
  record_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_item_idx on inventory_movements (item_id);

create or replace function validate_stock_movement() returns trigger
language plpgsql as $$
declare
  balance numeric;
begin
  if new.record_date > (now() at time zone 'Africa/Kampala')::date then
    raise exception 'Stock records cannot use a future date';
  end if;
  select coalesce(sum(quantity), 0) into balance
    from inventory_movements where item_id = new.item_id;
  if balance + new.quantity < 0 then
    raise exception 'Not enough stock';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_inventory_movement on inventory_movements;
create trigger validate_inventory_movement
  before insert on inventory_movements
  for each row execute function validate_stock_movement();

-- Finance entries must be income or expense; future dates rejected except
-- for plans (tasks, budget), exactly as in Farm360.
create or replace function validate_farm_entry() returns trigger
language plpgsql as $$
begin
  if new.module not in ('tasks','budget')
     and new.record_date > (now() at time zone 'Africa/Kampala')::date then
    raise exception 'Past records cannot use a future date';
  end if;
  if new.module = 'finance' and new.status not in ('Income','Expense') then
    raise exception 'Finance must be income or expense';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_farm_entry_trigger on farm_entries;
create trigger validate_farm_entry_trigger
  before insert or update on farm_entries
  for each row execute function validate_farm_entry();
