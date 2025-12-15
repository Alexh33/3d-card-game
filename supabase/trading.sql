-- Trading security baseline for P2P swaps
-- Run this in Supabase SQL Editor or via the CLI.

-------------------------
-- Schema adjustments
-------------------------
alter table public.cards
  add column if not exists locked boolean default false,
  add column if not exists locked_by uuid,
  add column if not exists locked_at timestamptz,
  add column if not exists owners integer default 1,
  add column if not exists is_new boolean default false;

update public.cards set owners = coalesce(owners, 1) where owners is null;

alter table public.profiles
  add column if not exists allow_trades boolean default true,
  add column if not exists claimed_username boolean default false,
  add column if not exists email text;

-- Ensure existing rows default to visible for trading.
update public.profiles set allow_trades = true where allow_trades is null;
update public.profiles set claimed_username = coalesce(claimed_username, false) where claimed_username is null;
update public.profiles p
  set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Deterministic fun handle generator (adjective + veggie + short id)
create or replace function public.veggie_handle(p_id uuid)
returns text
language plpgsql
as $$
declare
  adjectives text[] := array['Spicy','Crispy','Fresh','Zesty','Savory','Bold','Bright','Wild','Cool','Brave'];
  veggies text[] := array['Carrot','Tomato','Pepper','Broccoli','Spinach','Radish','Bean','Pea','Kale','Cabbage'];
  hash int := (
    select ('x' || substr(md5(p_id::text), 1, 6))::bit(24)::int
  );
  adj_idx int := (hash % array_length(adjectives, 1)) + 1;
  veg_idx int := ((hash / 7) % array_length(veggies, 1)) + 1;
begin
  return adjectives[adj_idx] || veggies[veg_idx] || '-' || left(p_id::text, 4);
end;
$$;

-- Ensure trades table has expires_at even if it existed before.
alter table public.trades
  add column if not exists expires_at timestamptz default (now() + interval '12 hours');
update public.trades set expires_at = now() + interval '12 hours' where expires_at is null;

-- Ensure status check allows expired/declined/accepted
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'trades'
      and c.contype = 'c'
      and c.conname ilike '%status%'
  loop
    execute format('alter table public.trades drop constraint %I', r.conname);
  end loop;
end;
$$;

alter table public.trades add constraint trades_status_check
  check (status in ('pending','accepted','declined','expired','cancelled'));

-- Backfill profiles for existing auth users that have no profile row.
insert into public.profiles (id, username, allow_trades, points)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'username', veggie_handle(u.id)) as username,
       true as allow_trades,
       coalesce((select points from public.profiles where id = u.id), 1000) as points
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- Ensure legacy rows have a non-identifying handle.
update public.profiles
  set username = veggie_handle(id),
      claimed_username = false
where (username is null or username = '' or username ilike 'user-%' or username like '%@%')
  and coalesce(claimed_username, false) = false;

-- Trigger to create profile for future signups
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, username, allow_trades, points)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', veggie_handle(new.id)),
    true,
    1000
  )
  on conflict (id) do nothing;
  update public.profiles set email = new.email where id = new.id and email is distinct from new.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null,
  to_user_id uuid not null,
  offered_card_ids uuid[] not null,
  requested_card_ids uuid[] not null,
  status text not null default 'pending',
  nonce uuid not null default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '12 hours'),
  created_at timestamptz not null default now()
);

create table if not exists public.trade_events (
  id bigserial primary key,
  trade_id uuid not null references public.trades(id) on delete cascade,
  actor_id uuid not null,
  action text not null,
  created_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

-------------------------
-- Row Level Security
-------------------------
alter table public.trades enable row level security;
alter table public.trade_events enable row level security;
alter table public.cards enable row level security;

-- Cards: owners can read; lock only through RPCs (enforced in functions).
drop policy if exists cards_select_self on public.cards;
create policy cards_select_self on public.cards
  for select using (owner_id = auth.uid());

-- Allow viewing cards of users who opted into trading.
drop policy if exists cards_select_trading on public.cards;
create policy cards_select_trading on public.cards
  for select using (
    owner_id = auth.uid()
    or coalesce((select allow_trades from public.profiles p where p.id = owner_id), true) = true
  );

-- Allow either party in a trade to see the cards referenced in that trade,
-- even if the owner has trading visibility turned off, so offers can be reviewed.
drop policy if exists cards_select_trade_context on public.cards;
create policy cards_select_trade_context on public.cards
  for select using (
    exists (
      select 1
      from public.trades t
      where (t.from_user_id = auth.uid() or t.to_user_id = auth.uid())
        and (id = any(t.offered_card_ids) or id = any(t.requested_card_ids))
    )
  );

-- Helper: fetch all cards referenced by a set of trades (only for the parties)
create or replace function public.trade_cards_for_party(p_trade_ids uuid[])
returns table(
  trade_id uuid,
  card_id uuid,
  kind text,
  name text,
  rarity text,
  image text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  return query
    select
      t.id as trade_id,
      ids.card_id,
      u.kind,
      c.name,
      c.rarity,
      c.image
    from public.trades t
    join lateral unnest(array['offered','requested']) with ordinality u(kind, ord) on true
    join lateral unnest(
      case when u.kind = 'offered' then t.offered_card_ids else t.requested_card_ids end
    ) as ids(card_id) on true
    left join public.cards c on c.id = ids.card_id
    where t.id = any(p_trade_ids)
      and (t.from_user_id = v_uid or t.to_user_id = v_uid);
end;
$$;

drop policy if exists cards_update_lock on public.cards;
create policy cards_update_lock on public.cards
  for update using (owner_id = auth.uid());

-- Trades: only parties can see; inserts/updates via RPC (security definer handles permissions)
drop policy if exists trades_select_party on public.trades;
create policy trades_select_party on public.trades
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists trades_update_party on public.trades;
create policy trades_update_party on public.trades
  for update using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- Trade events: only parties can see.
drop policy if exists trade_events_select_party on public.trade_events;
create policy trade_events_select_party on public.trade_events
  for select using (
    exists (
      select 1 from public.trades t
      where t.id = trade_id
      and (t.from_user_id = auth.uid() or t.to_user_id = auth.uid())
    )
  );

-------------------------
-- RPC: search recipients (limited profile lookup)
-------------------------
create or replace function public.trade_search_profiles(p_query text)
returns table(id uuid, username text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  return query
    select p.id, p.username
    from public.profiles p
    where (p.username ilike '%' || p_query || '%')
    limit 10;
end;
$$;

-------------------------
-- RPC: paginated card listing for trading
-------------------------
drop function if exists public.trade_list_cards(uuid, int, int);
create or replace function public.trade_list_cards(p_owner uuid, p_page int default 1, p_page_size int default 20)
returns table(
  id uuid,
  name text,
  image text,
  rarity text,
  description text,
  owner_id uuid,
  locked boolean,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_allow boolean;
  v_limit int := greatest(1, least(50, coalesce(p_page_size, 20)));
  v_offset int := greatest(0, (coalesce(p_page, 1) - 1) * v_limit);
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_owner <> v_uid then
    select allow_trades into v_allow from public.profiles where id = p_owner;
    if coalesce(v_allow, true) = false then
      return;
    end if;
  end if;

  return query
    select
      c.id,
      c.name,
      c.image,
      c.rarity,
      c.description,
      c.owner_id,
      c.locked,
      count(*) over ()::bigint as total_count
    from public.cards as c
    where c.owner_id = p_owner
      and c.locked = false
    order by c.id
    limit v_limit offset v_offset;
end;
$$;

-------------------------
-- Helper: lock validation
-------------------------
create or replace function public.ensure_cards_available(card_ids uuid[], user_id uuid)
returns void
language plpgsql
as $$
begin
  if exists (
    select 1 from public.cards c
    where c.id = any(card_ids)
      and (c.owner_id <> user_id or c.locked = true)
  ) then
    raise exception 'Cards not owned or already locked' using errcode = '42501';
  end if;
end;
$$;

-------------------------
-- RPC: create trade
-------------------------
create or replace function public.create_trade(
  p_to_user uuid,
  p_offered uuid[],
  p_requested uuid[]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade_id uuid := gen_random_uuid();
  v_user uuid := auth.uid();
begin
  if array_length(p_offered, 1) is null or array_length(p_requested, 1) is null then
    raise exception 'Empty offers are not allowed';
  end if;

  perform public.ensure_cards_available(p_offered, v_user);

  -- lock offered cards
  update public.cards
    set locked = true, locked_by = v_user, locked_at = now()
  where id = any(p_offered) and owner_id = v_user and locked = false;

  insert into public.trades(id, from_user_id, to_user_id, offered_card_ids, requested_card_ids, status, expires_at)
  values (v_trade_id, v_user, p_to_user, p_offered, p_requested, 'pending', now() + interval '12 hours');

  insert into public.trade_events(trade_id, actor_id, action, metadata)
  values (v_trade_id, v_user, 'created', jsonb_build_object('offered', p_offered, 'requested', p_requested));

  return v_trade_id;
end;
$$;

-------------------------
-- RPC: accept trade (swap)
-------------------------
create or replace function public.accept_trade(p_trade_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_trade record;
begin
  select * into v_trade from public.trades
  where id = p_trade_id
    and status = 'pending'
    and expires_at > now()
    and to_user_id = v_user
  for update;

  if not found then
    raise exception 'Trade not found or not actionable';
  end if;

  -- Ensure requested cards are available to lock
  perform public.ensure_cards_available(v_trade.requested_card_ids, v_user);

  -- Lock requested cards
  update public.cards
    set locked = true, locked_by = v_user, locked_at = now()
  where id = any(v_trade.requested_card_ids) and owner_id = v_user and locked = false;

  -- Transfer ownership atomically
  update public.cards set owner_id = v_user, locked = false, locked_by = null, locked_at = null, owners = coalesce(owners,1) + 1, is_new = true
    where id = any(v_trade.offered_card_ids) and locked = true;

  update public.cards set owner_id = v_trade.from_user_id, locked = false, locked_by = null, locked_at = null, owners = coalesce(owners,1) + 1, is_new = true
    where id = any(v_trade.requested_card_ids) and locked = true;

  update public.trades
    set status = 'accepted'
  where id = v_trade.id;

  insert into public.trade_events(trade_id, actor_id, action)
  values (v_trade.id, v_user, 'accepted');
end;
$$;

-------------------------
-- RPC: decline/expire trade
-------------------------
create or replace function public.decline_trade(p_trade_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_trade record;
begin
  select * into v_trade from public.trades
  where id = p_trade_id
    and status = 'pending'
    and (to_user_id = v_user or from_user_id = v_user)
  for update;

  if not found then
    raise exception 'Trade not found or not actionable';
  end if;

  -- unlock offered cards
  update public.cards
    set locked = false, locked_by = null, locked_at = null
  where id = any(v_trade.offered_card_ids) and locked = true;

  update public.trades set status = 'declined' where id = v_trade.id;
  insert into public.trade_events(trade_id, actor_id, action)
  values (v_trade.id, v_user, 'declined');
end;
$$;

-------------------------
-- RPC: cancel trade (sender recalls)
-------------------------
create or replace function public.cancel_trade(p_trade_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_trade record;
begin
  select * into v_trade from public.trades
  where id = p_trade_id
    and status = 'pending'
    and from_user_id = v_user
  for update;

  if not found then
    raise exception 'Trade not found or not cancellable';
  end if;

  update public.cards
    set locked = false, locked_by = null, locked_at = null
  where id = any(v_trade.offered_card_ids) and locked = true;

  update public.trades set status = 'cancelled' where id = v_trade.id;
  insert into public.trade_events(trade_id, actor_id, action)
  values (v_trade.id, v_user, 'cancelled');
end;
$$;

-------------------------
-- RPC: expire stale trades (cron-friendly)
-------------------------
create or replace function public.expire_stale_trades()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_trade record;
begin
  for v_trade in
    select * from public.trades
    where status = 'pending'
      and expires_at <= now()
    for update
  loop
    update public.cards
      set locked = false, locked_by = null, locked_at = null
    where id = any(v_trade.offered_card_ids) and locked = true;

    -- safety: unlock any requested side that might have been locked in a failed accept
    update public.cards
      set locked = false, locked_by = null, locked_at = null
    where id = any(v_trade.requested_card_ids) and locked = true;

    update public.trades set status = 'expired' where id = v_trade.id;
    insert into public.trade_events(trade_id, actor_id, action)
    values (v_trade.id, v_trade.from_user_id, 'expired');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Cleanup helper: unlock any cards tied to non-pending trades (safety net for old rows)
create or replace function public.cleanup_trade_locks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  with unlocked as (
    update public.cards c
      set locked = false, locked_by = null, locked_at = null
    where locked = true
      and exists (
        select 1
        from public.trades t
        where t.status <> 'pending'
          and (c.id = any(t.offered_card_ids) or c.id = any(t.requested_card_ids))
      )
    returning 1
  )
  select count(*) into v_count from unlocked;
  return coalesce(v_count, 0);
end;
$$;

-------------------------
-- Rate limit (optional via Postgres extension or Edge Function)
-- Enforce in Edge Function if needed; left as a note.
-------------------------
