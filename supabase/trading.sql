-- Trading security baseline for P2P swaps
-- Run this in Supabase SQL Editor or via the CLI.

-------------------------
-- Schema adjustments
-------------------------
alter table public.cards
  add column if not exists locked boolean default false,
  add column if not exists locked_by uuid,
  add column if not exists locked_at timestamptz;

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null,
  to_user_id uuid not null,
  offered_card_ids uuid[] not null,
  requested_card_ids uuid[] not null,
  status text not null default 'pending',
  nonce uuid not null default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
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

  insert into public.trades(id, from_user_id, to_user_id, offered_card_ids, requested_card_ids, status)
  values (v_trade_id, v_user, p_to_user, p_offered, p_requested, 'pending');

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
  update public.cards set owner_id = v_user, locked = false, locked_by = null, locked_at = null
    where id = any(v_trade.offered_card_ids) and locked = true;

  update public.cards set owner_id = v_trade.from_user_id, locked = false, locked_by = null, locked_at = null
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
    where status = 'pending' and expires_at <= now()
    for update
  loop
    update public.cards
      set locked = false, locked_by = null, locked_at = null
    where id = any(v_trade.offered_card_ids) and locked = true;

    update public.trades set status = 'expired' where id = v_trade.id;
    insert into public.trade_events(trade_id, actor_id, action)
    values (v_trade.id, v_trade.from_user_id, 'expired');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-------------------------
-- Rate limit (optional via Postgres extension or Edge Function)
-- Enforce in Edge Function if needed; left as a note.
-------------------------
