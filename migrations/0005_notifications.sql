-- Farmer 360: notifications for the desk bell, dashboard activity and
-- cross-role updates (orders, approvals, SACCO entries).

create table if not exists notifications (
  id serial primary key,
  user_id text not null,
  kind text not null default 'system',
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on notifications (user_id, created_at desc);

create index if not exists notifications_unread_idx
  on notifications (user_id)
  where read_at is null;
