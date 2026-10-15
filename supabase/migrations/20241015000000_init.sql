create table if not exists stores (
  id text primary key,
  name text default '' not null,
  data jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists categories (
  id text primary key,
  name text default '' not null,
  data jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists orders (
  id text primary key,
  order_number text not null,
  status text not null default 'placed',
  grand_total numeric not null default 0,
  data jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Simple table for health-check queries
create table if not exists test_table (
  id uuid primary key default gen_random_uuid()
);
