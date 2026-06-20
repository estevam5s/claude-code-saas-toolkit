-- ====================================================================
-- Billing SaaS — schema genérico (Stripe + Supabase)
-- Idempotente. Assume apenas auth.users. Não depende de schema prévio.
-- ====================================================================

-- Helpers (criados só se não existirem) ------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- is_admin(): admin via claim do JWT ou flag em profiles (se a tabela existir)
create or replace function public.is_admin()
returns boolean language plpgsql stable security definer set search_path=public as $$
declare v boolean := false;
begin
  -- claim app_metadata.role = 'admin'
  begin
    if coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin' then return true; end if;
  exception when others then null; end;
  -- profiles.role = 'admin' (se existir)
  begin
    execute 'select exists(select 1 from public.profiles where id = auth.uid() and role = ''admin'')' into v;
  exception when undefined_table then v := false; when others then v := false; end;
  return coalesce(v, false);
end; $$;

-- PLANOS --------------------------------------------------------------
create table if not exists public.plans (
  slug            text primary key,
  name            text not null,
  description     text,
  billing_type    text not null default 'recurring',  -- free | recurring | lifetime
  monthly_price   numeric(10,2) default 0,
  yearly_price    numeric(10,2) default 0,
  lifetime_price  numeric(10,2) default 0,
  included_users  int default 1,
  highlight       boolean default false,
  sort_order      int default 0,
  cta             text default 'Assinar',
  stripe_price_monthly  text,
  stripe_price_yearly   text,
  stripe_price_lifetime text,
  limits          jsonb not null default '{}'::jsonb,
  features        jsonb not null default '[]'::jsonb,
  created_at      timestamptz default now()
);
alter table public.plans enable row level security;
drop policy if exists plans_public_read on public.plans;
create policy plans_public_read on public.plans for select using (true);
drop policy if exists plans_admin_write on public.plans;
create policy plans_admin_write on public.plans for all using (public.is_admin()) with check (public.is_admin());

-- ASSINATURAS ---------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_slug text not null default 'free',
  status text not null default 'active',          -- active|trialing|past_due|canceled|incomplete
  billing_cycle text not null default 'free',     -- monthly|yearly|lifetime|free
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean default false,
  canceled_at timestamptz,
  pending_plan_slug text,
  pending_cycle text,
  pending_effective_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_subs_customer on public.subscriptions(stripe_customer_id);
create index if not exists idx_subs_stripe on public.subscriptions(stripe_subscription_id);
alter table public.subscriptions enable row level security;
drop policy if exists subs_self on public.subscriptions;
create policy subs_self on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists subs_admin on public.subscriptions;
create policy subs_admin on public.subscriptions for all using (public.is_admin()) with check (public.is_admin());
drop trigger if exists trg_touch_subs on public.subscriptions;
create trigger trg_touch_subs before update on public.subscriptions for each row execute function public.touch_updated_at();

-- Cria assinatura free automaticamente para novos usuários
create or replace function public.handle_new_user_subscription()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_free text;
begin
  select slug into v_free from public.plans where billing_type = 'free' order by sort_order limit 1;
  insert into public.subscriptions (user_id, plan_slug, status, billing_cycle)
  values (new.id, coalesce(v_free, 'free'), 'active', 'free')
  on conflict (user_id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_sub on auth.users;
create trigger on_auth_user_created_sub after insert on auth.users
  for each row execute function public.handle_new_user_subscription();

-- Sincroniza profiles.plan_slug (somente se a tabela profiles tiver a coluna)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='plan_slug'
  ) then
    execute $f$
      create or replace function public.sync_profile_plan()
      returns trigger language plpgsql security definer set search_path=public as $b$
      begin
        update public.profiles set plan_slug = new.plan_slug where id = new.user_id;
        return new;
      end; $b$;
    $f$;
    execute 'drop trigger if exists trg_sync_profile_plan on public.subscriptions';
    execute 'create trigger trg_sync_profile_plan after insert or update of plan_slug on public.subscriptions for each row execute function public.sync_profile_plan()';
  end if;
end $$;

-- EVENTOS STRIPE (idempotência do webhook) ----------------------------
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique not null,
  type text,
  payload jsonb,
  created_at timestamptz default now()
);
alter table public.payment_events enable row level security;
drop policy if exists payevt_admin on public.payment_events;
create policy payevt_admin on public.payment_events for select using (public.is_admin());

-- FEEDBACK DE CANCELAMENTO -------------------------------------------
create table if not exists public.cancellation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  plan_slug text, reason text, comment text,
  created_at timestamptz default now()
);
alter table public.cancellation_feedback enable row level security;
drop policy if exists cf_insert on public.cancellation_feedback;
create policy cf_insert on public.cancellation_feedback for insert with check (user_id = auth.uid());
drop policy if exists cf_admin on public.cancellation_feedback;
create policy cf_admin on public.cancellation_feedback for select using (public.is_admin());

grant select on public.plans to anon, authenticated;
grant all on public.subscriptions, public.payment_events, public.plans, public.cancellation_feedback to authenticated, service_role;
