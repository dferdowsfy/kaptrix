-- Preview mode tables for the demo workspace. These hold operator-visible
-- demo data that the /preview/* routes render, plus a conversation log for
-- the floating knowledge chatbot. All preview rows are safe to expose to
-- anonymous sessions because they are synthetic.

create table if not exists preview_clients (
  id text primary key,
  target text not null,
  client text not null,
  industry text not null,
  deal_stage text not null,
  status text not null,
  tier text not null,
  composite_score numeric,
  recommendation text not null,
  fee_usd numeric not null,
  deadline timestamptz not null,
  summary text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table preview_clients is
  'Demo client roster for /preview workspace cards and persistent header.';

create table if not exists preview_snapshots (
  client_id text primary key references preview_clients(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table preview_snapshots is
  'Full JSONB snapshot of documents, analyses, scores, insights, report, and requirements for a demo client.';

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  client_id text,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  citations jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_idx
  on chat_messages(session_id, created_at);
create index if not exists chat_messages_client_idx
  on chat_messages(client_id, created_at);

comment on table chat_messages is
  'Natural-language chatbot conversation log. One row per turn (user or assistant).';

-- Row Level Security: preview_* tables are readable by anyone. chat_messages
-- is readable/writable by anyone, scoped by session_id at the app layer.
alter table preview_clients enable row level security;
alter table preview_snapshots enable row level security;
alter table chat_messages enable row level security;

drop policy if exists "preview_clients_read" on preview_clients;
create policy "preview_clients_read" on preview_clients
  for select using (true);

drop policy if exists "preview_snapshots_read" on preview_snapshots;
create policy "preview_snapshots_read" on preview_snapshots
  for select using (true);

drop policy if exists "chat_messages_read" on chat_messages;
create policy "chat_messages_read" on chat_messages
  for select using (true);

drop policy if exists "chat_messages_insert" on chat_messages;
create policy "chat_messages_insert" on chat_messages
  for insert with check (true);
