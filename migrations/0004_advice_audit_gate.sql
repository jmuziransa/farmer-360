-- AI agronomist advice history, the platform activity audit trail, and the
-- seed claim gate.

-- Every answered advice request is stored so farmers can look back at what
-- was recommended (and so the demo has content). Answers are per-user.
create table if not exists ai_advice (
  id serial primary key,
  user_id text not null,
  category text not null,
  question text not null,
  answer text not null,
  model text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_advice_user_created_idx on ai_advice (user_id, created_at desc);

-- Who approved what, who changed which role. Written by the admin/officer
-- decision functions; read by the Administration page.
create table if not exists activity_log (
  id serial primary key,
  actor_id text not null,
  actor_name text not null default '',
  action text not null,
  entity text not null default '',
  entity_id text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists activity_log_created_idx on activity_log (created_at desc);

-- seedDesk claims this row atomically (insert ... on conflict do nothing
-- returning) so two visitors hitting the landing page concurrently cannot
-- both run the demo-content inserts.
create table if not exists seed_gate (
  name text primary key,
  created_at timestamptz not null default now()
);
