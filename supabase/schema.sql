-- ═══════════════════════════════════════════════════════════════
-- TOURDESK DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── ARTISTS (employers) ─────────────────────────────────────
create table artists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  genre text,
  color text default '#C9A84C',
  siret text,
  address text,
  nature text,
  cachet_default numeric(10,2) default 0,
  hours_per_cachet numeric(4,1) default 12,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table artists enable row level security;
create policy "Users can only access their own artists"
  on artists for all using (auth.uid() = user_id);
create index artists_user_id_idx on artists(user_id);

-- ─── TOURS (events) ──────────────────────────────────────────
create table tours (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  artist_id uuid references artists(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date,
  city text,
  type text default 'show', -- show|rehearsal|residence|tournage|dj|figuration|workday|travel
  paid boolean default true,
  received boolean default false,
  custom_cachet numeric(10,2),
  custom_hours numeric(4,1),
  notes text,
  address text,
  wifi text,
  hotel text,
  room text,
  hotel_addr text,
  doclink text,
  feuille_status text, -- match|mismatch|received
  feuille_doc_amount numeric(10,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table tours enable row level security;
create policy "Users can only access their own tours"
  on tours for all using (auth.uid() = user_id);
create index tours_user_id_idx on tours(user_id);
create index tours_artist_id_idx on tours(artist_id);
create index tours_start_date_idx on tours(start_date);

-- ─── MEETINGS ────────────────────────────────────────────────
create table meetings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  type text default 'online', -- online|person
  date date not null,
  time text,
  location text,
  notes text,
  created_at timestamptz default now()
);
alter table meetings enable row level security;
create policy "Users can only access their own meetings"
  on meetings for all using (auth.uid() = user_id);
create index meetings_user_id_idx on meetings(user_id);

-- ─── REPLACEMENTS (subs) ─────────────────────────────────────
create table replacements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  instrument text,
  phone text,
  genre text,
  notes text,
  created_at timestamptz default now()
);
alter table replacements enable row level security;
create policy "Users can only access their own replacements"
  on replacements for all using (auth.uid() = user_id);

-- ─── TRIPS ───────────────────────────────────────────────────
create table trips (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  artist_id uuid references artists(id) on delete set null,
  out_from text,
  out_to text,
  out_date date,
  out_time text,
  out_ref text,
  ret_from text,
  ret_to text,
  ret_date date,
  ret_time text,
  ret_ref text,
  notes text,
  created_at timestamptz default now()
);
alter table trips enable row level security;
create policy "Users can only access their own trips"
  on trips for all using (auth.uid() = user_id);

-- ─── EXPENSES ────────────────────────────────────────────────
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  artist_id uuid references artists(id) on delete set null,
  date date not null,
  amount numeric(10,2) not null,
  category text default 'other', -- transport|hotel|food|equipment|other
  description text,
  receipt_url text,
  created_at timestamptz default now()
);
alter table expenses enable row level security;
create policy "Users can only access their own expenses"
  on expenses for all using (auth.uid() = user_id);

-- ─── GUESTS ──────────────────────────────────────────────────
create table guests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tour_id uuid references tours(id) on delete cascade,
  name text not null,
  contact text,
  count integer default 1,
  notes text,
  status text default 'confirmed', -- confirmed|pending|cancelled
  created_at timestamptz default now()
);
alter table guests enable row level security;
create policy "Users can only access their own guests"
  on guests for all using (auth.uid() = user_id);

-- ─── INDUSTRY CONTACTS ───────────────────────────────────────
create table contacts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  role text,
  company text,
  contact_info text,
  last_contact_date date,
  followup_date date,
  notes text,
  created_at timestamptz default now()
);
alter table contacts enable row level security;
create policy "Users can only access their own contacts"
  on contacts for all using (auth.uid() = user_id);

-- ─── MANAGER TOURS ───────────────────────────────────────────
create table manager_tours (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  artist_id uuid references artists(id) on delete set null,
  name text not null,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz default now()
);
alter table manager_tours enable row level security;
create policy "Users can only access their own manager tours"
  on manager_tours for all using (auth.uid() = user_id);

-- ─── MANAGER MEMBERS ─────────────────────────────────────────
create table manager_members (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  manager_tour_id uuid references manager_tours(id) on delete cascade not null,
  name text not null,
  role text,
  hotel text,
  room text,
  hotel_addr text,
  ticket_ref text,
  ticket_url text,
  ticket_filename text,
  notes text,
  created_at timestamptz default now()
);
alter table manager_members enable row level security;
create policy "Users can only access their own manager members"
  on manager_members for all using (auth.uid() = user_id);

-- ─── USER SETTINGS ───────────────────────────────────────────
create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hours_goal integer default 507,
  hour_types jsonb default '{"show":1,"rehearsal":1,"residence":8,"tournage":8,"dj":1,"figuration":8,"workday":7}',
  cal_year integer default extract(year from now()),
  cal_month integer default extract(month from now()) - 1,
  earn_year integer default extract(year from now()),
  earn_month integer default extract(month from now()) - 1,
  updated_at timestamptz default now()
);
alter table user_settings enable row level security;
create policy "Users can only access their own settings"
  on user_settings for all using (auth.uid() = user_id);

-- ─── AUTO-UPDATE updated_at ──────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_artists_updated_at before update on artists
  for each row execute function update_updated_at();
create trigger update_tours_updated_at before update on tours
  for each row execute function update_updated_at();

-- ─── CREATE USER SETTINGS ON SIGNUP ─────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into user_settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
