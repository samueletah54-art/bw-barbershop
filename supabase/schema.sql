-- =====================================================================
-- BW BARBER SHOP · booking database (Supabase / Postgres 15+)
--
-- How to use: Supabase dashboard → SQL editor → paste this whole file → Run.
-- Safe to run again: everything is "if not exists" / "or replace".
--
-- SECURITY MODEL (read this once)
--   * The public (anon key) has NO direct access to any table. None.
--   * The public can only call three functions:
--       get_public_config()  hours, deposit, prices (nothing private)
--       get_taken(from,to)   time ranges that are taken, WITHOUT names or phones
--       create_booking(...)  validates everything, then inserts a PENDING booking
--   * Phone numbers and names are readable only by the barber (an email listed
--     in the admins table, logged in through Supabase Auth) and by the server
--     functions on Vercel (service role key, kept in Vercel env vars).
--   * The public can never mark a booking "paid". Only the server can, after
--     Notch Pay confirms the payment.
-- =====================================================================

-- ---------- Tables ----------

create table if not exists public.formules (
  id           text primary key,
  position     int  not null,
  name         text not null,
  includes     text not null,
  price_xaf    int  not null check (price_xaf > 0),
  duration_min int  not null check (duration_min > 0),   -- TODO(owner): defaults, confirm each
  active       boolean not null default true
);

insert into public.formules (id, position, name, includes, price_xaf, duration_min) values
  ('classique', 1, 'Classique', 'Coupe simple + finition',        1000, 30),
  ('soignee',   2, 'Soignée',   'Coupe + black',                  2000, 45),
  ('premium',   3, 'Premium',   'Coupe + black + soin de visage', 3000, 60),
  ('couleur',   4, 'Couleur',   'Coupe + teinture',               5000, 90),
  ('pedicure',  5, 'Pédicure',  'Pédicure',                       2500, 45),
  ('enfant',    6, 'Enfant',    'Coupe enfant + finition',         500, 20)
on conflict (id) do nothing;

-- One row only. The site reads it, so hours and deposit live in ONE place.
create table if not exists public.shop_settings (
  id                boolean primary key default true check (id),
  open_min          int  not null default 540,            -- 09:00 (confirmed)
  close_min         int  not null default 1140,           -- 19:00  TODO(owner): confirm closing time
  open_days         int[] not null default '{1,2,3,4,5,6}', -- ISO: 1 = Monday … 7 = Sunday. TODO(owner): confirm
  deposit_xaf       int  not null default 500,            -- TODO(owner): acompte per booking
  slot_step_min     int  not null default 30,
  lead_min          int  not null default 15,
  horizon_days      int  not null default 14,
  hold_online_min   int  not null default 15,             -- unpaid online booking frees its slot after 15 min
  hold_whatsapp_min int  not null default 120,            -- WhatsApp request holds the slot 2 h
  first_open_date   date not null default '2026-11-16'
);
insert into public.shop_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.bookings (
  id               uuid primary key default gen_random_uuid(),
  formule          text not null references public.formules(id),
  date             date not null,
  start_time       time not null,
  end_time         time not null,
  name             text not null check (char_length(btrim(name)) between 2 and 80),
  phone            text not null check (phone ~ '^6[0-9]{8}$'),   -- 9 digits, no +237
  note             text check (note is null or char_length(note) <= 200),
  status           text not null default 'pending'
                     check (status in ('pending','paid','confirmed','done','no_show','cancelled')),
  mode             text not null check (mode in ('online','whatsapp')),
  deposit_xaf      int  not null default 0,
  payment_ref      text,
  payment_status   text,
  payment_attempts int  not null default 0,
  token            uuid not null default gen_random_uuid(),       -- secret held by the visitor's browser
  hold_until       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists bookings_date_idx   on public.bookings (date);
create index if not exists bookings_phone_idx  on public.bookings (phone, created_at);
create index if not exists bookings_payref_idx on public.bookings (payment_ref);

create table if not exists public.blocked_slots (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  start_time time,                         -- null = the whole day is blocked
  end_time   time,
  reason     text,
  created_at timestamptz not null default now(),
  check ((start_time is null) = (end_time is null))
);

create table if not exists public.admins (
  email text primary key check (email = lower(email))
);
-- TODO(owner): add the barber's login email (the one he will use on /admin):
-- insert into public.admins (email) values ('barber@example.com');

-- ---------- Helpers ----------

create or replace function public.t_min(t time) returns int
language sql immutable as $$ select extract(hour from t)::int * 60 + extract(minute from t)::int $$;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- ---------- Public functions ----------

create or replace function public.get_public_config() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'settings', (select json_build_object(
        'open_min', s.open_min, 'close_min', s.close_min, 'open_days', s.open_days,
        'deposit_xaf', s.deposit_xaf, 'slot_step_min', s.slot_step_min,
        'hold_online_min', s.hold_online_min, 'hold_whatsapp_min', s.hold_whatsapp_min)
      from public.shop_settings s limit 1),
    'formules', (select coalesce(json_agg(json_build_object('id', f.id, 'price_xaf', f.price_xaf, 'duration_min', f.duration_min) order by f.position), '[]'::json)
      from public.formules f where f.active)
  );
$$;

-- Taken time ranges only. No names, no phones, no booking ids.
create or replace function public.get_taken(p_from date, p_to date)
returns table ("date" date, start_time time, end_time time)
language sql stable security definer set search_path = public as $$
  select b."date", b.start_time, b.end_time
    from public.bookings b
   where b."date" between p_from and least(p_to, p_from + 31)
     and (b.status in ('paid','confirmed','done','no_show')
          or (b.status = 'pending' and b.hold_until > now()))
  union all
  select s."date", coalesce(s.start_time, time '00:00'), coalesce(s.end_time, time '23:59:59')
    from public.blocked_slots s
   where s."date" between p_from and least(p_to, p_from + 31);
$$;

create or replace function public.create_booking(
  p_formule text, p_date date, p_start time, p_name text, p_phone text, p_note text, p_mode text)
returns table (id uuid, token uuid, status text, deposit_xaf int, hold_until timestamptz, end_time time)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  s          public.shop_settings;
  f          public.formules;
  v_phone    text;
  v_now      timestamp;
  v_today    date;
  v_start    int;
  v_end      int;
  v_id       uuid;
  v_token    uuid;
  v_hold     timestamptz;
  v_dep      int;
  v_endtime  time;
begin
  select * into s from public.shop_settings limit 1;
  select * into f from public.formules fo where fo.id = p_formule and fo.active;
  if f.id is null then raise exception 'invalid_formule'; end if;
  if p_mode not in ('online','whatsapp') then raise exception 'invalid_mode'; end if;

  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(v_phone) = 12 and left(v_phone, 3) = '237' then v_phone := substr(v_phone, 4); end if;
  if v_phone !~ '^6[0-9]{8}$' then raise exception 'invalid_phone'; end if;
  if char_length(btrim(coalesce(p_name, ''))) < 2 or char_length(p_name) > 80 then raise exception 'invalid_name'; end if;
  if p_note is not null and char_length(p_note) > 200 then raise exception 'invalid_note'; end if;

  v_now   := now() at time zone 'Africa/Douala';
  v_today := v_now::date;
  if p_date is null or p_date < greatest(v_today, s.first_open_date) or p_date > v_today + s.horizon_days then
    raise exception 'invalid_date';
  end if;
  if not (extract(isodow from p_date)::int = any (s.open_days)) then raise exception 'closed_day'; end if;

  v_start := public.t_min(p_start);
  v_end   := v_start + f.duration_min;
  if extract(second from p_start) <> 0 or v_start % s.slot_step_min <> 0 then raise exception 'invalid_time'; end if;
  if v_start < s.open_min or v_end > s.close_min then raise exception 'outside_hours'; end if;
  if p_date = v_today and v_start < public.t_min(v_now::time) + s.lead_min then raise exception 'too_late'; end if;

  -- one booking at a time per day, so two people cannot take the same slot
  perform pg_advisory_xact_lock(hashtext('bw-bookings-' || p_date::text));

  if exists (
    select 1 from public.bookings b
     where b."date" = p_date
       and (b.status in ('paid','confirmed','done','no_show') or (b.status = 'pending' and b.hold_until > now()))
       and v_start < public.t_min(b.end_time) and v_end > public.t_min(b.start_time)
  ) or exists (
    select 1 from public.blocked_slots bs
     where bs."date" = p_date
       and (bs.start_time is null or (v_start < public.t_min(bs.end_time) and v_end > public.t_min(bs.start_time)))
  ) then
    raise exception 'slot_taken';
  end if;

  if (select count(*) from public.bookings b
       where b.phone = v_phone and b.status = 'pending' and b.created_at > now() - interval '1 hour') >= 3 then
    raise exception 'too_many_requests';
  end if;

  v_endtime := (p_start + make_interval(mins => f.duration_min))::time;
  v_dep     := case when p_mode = 'online' then s.deposit_xaf else 0 end;
  v_hold    := now() + make_interval(mins => case when p_mode = 'online' then s.hold_online_min else s.hold_whatsapp_min end);

  insert into public.bookings (formule, "date", start_time, end_time, name, phone, note, status, mode, deposit_xaf, hold_until)
  values (p_formule, p_date, p_start, v_endtime, btrim(p_name), v_phone, nullif(btrim(coalesce(p_note, '')), ''), 'pending', p_mode, v_dep, v_hold)
  returning bookings.id, bookings.token into v_id, v_token;

  return query select v_id, v_token, 'pending'::text, v_dep, v_hold, v_endtime;
end;
$$;

-- Frees slots whose hold ran out. Called by the server and by the admin page.
create or replace function public.release_expired() returns int
language sql security definer set search_path = public as $$
  with u as (
    update public.bookings
       set status = 'cancelled', payment_status = coalesce(payment_status, 'expired')
     where status = 'pending' and hold_until < now()
    returning 1)
  select count(*)::int from u;
$$;

-- ---------- Row Level Security ----------

alter table public.formules      enable row level security;
alter table public.shop_settings enable row level security;
alter table public.bookings      enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.admins        enable row level security;

drop policy if exists formules_read        on public.formules;
drop policy if exists formules_admin       on public.formules;
drop policy if exists settings_read        on public.shop_settings;
drop policy if exists settings_admin       on public.shop_settings;
drop policy if exists bookings_admin       on public.bookings;
drop policy if exists blocked_admin        on public.blocked_slots;

create policy formules_read  on public.formules      for select to anon, authenticated using (true);
create policy formules_admin on public.formules      for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy settings_read  on public.shop_settings for select to anon, authenticated using (true);
create policy settings_admin on public.shop_settings for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy bookings_admin on public.bookings      for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy blocked_admin  on public.blocked_slots for all    to authenticated using (public.is_admin()) with check (public.is_admin());
-- admins: no policy at all, so only the service role (server) can read or change it.

-- Belt and braces: the public role gets no table privileges on private data.
revoke all on public.bookings, public.blocked_slots, public.admins from anon;
revoke all on public.admins from authenticated;

-- ---------- Who may call what ----------

revoke execute on function public.get_public_config()                 from public;
revoke execute on function public.get_taken(date, date)               from public;
revoke execute on function public.create_booking(text, date, time, text, text, text, text) from public;
revoke execute on function public.release_expired()                   from public;
revoke execute on function public.is_admin()                          from public;

grant execute on function public.get_public_config()                  to anon, authenticated, service_role;
grant execute on function public.get_taken(date, date)                to anon, authenticated, service_role;
grant execute on function public.create_booking(text, date, time, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.release_expired()                    to authenticated, service_role;
grant execute on function public.is_admin()                           to authenticated, service_role;
