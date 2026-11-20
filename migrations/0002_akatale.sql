create table if not exists profiles (
  user_id text primary key,
  full_name text not null,
  role text not null check (role in ('farmer', 'buyer', 'officer', 'admin')),
  phone text,
  district text,
  farm_name text,
  created_at timestamptz not null default now()
);

create table if not exists listings (
  id serial primary key,
  farmer_id text not null,
  crop text not null,
  quantity numeric not null,
  unit text not null,
  unit_price_ugx integer not null,
  district text not null,
  subcounty text,
  description text,
  farm_name text,
  phone text,
  harvest_date text,
  quality_grade text,
  photo_data text,
  status text not null default 'pending' check (status in ('pending', 'live', 'rejected', 'sold')),
  rejection_note text,
  created_at timestamptz not null default now()
);
create index if not exists listings_status_idx on listings (status);
create index if not exists listings_farmer_idx on listings (farmer_id);

create table if not exists orders (
  id serial primary key,
  listing_id integer not null references listings (id),
  buyer_id text not null,
  quantity numeric not null,
  note text,
  status text not null default 'requested' check (status in ('requested', 'accepted', 'fulfilled', 'declined')),
  created_at timestamptz not null default now()
);
create index if not exists orders_buyer_idx on orders (buyer_id);

create table if not exists loans (
  id serial primary key,
  member_id text not null,
  amount_ugx integer not null,
  purpose text not null,
  term_months integer not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'active', 'closed')),
  rejection_note text,
  created_at timestamptz not null default now()
);
create index if not exists loans_member_idx on loans (member_id);
create index if not exists loans_status_idx on loans (status);

create table if not exists savings_ledger (
  id serial primary key,
  member_id text not null,
  kind text not null check (kind in ('deposit', 'withdrawal')),
  amount_ugx integer not null,
  note text,
  officer_id text,
  created_at timestamptz not null default now()
);
create index if not exists savings_member_idx on savings_ledger (member_id);

create table if not exists loan_repayments (
  id serial primary key,
  loan_id integer not null references loans (id),
  amount_ugx integer not null,
  note text,
  recorded_by text,
  created_at timestamptz not null default now()
);
