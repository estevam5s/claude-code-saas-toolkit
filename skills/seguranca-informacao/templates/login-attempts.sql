-- Tabela de tentativas de login + bloqueio progressivo (anti brute-force).
-- Exibida na rota "Logs" do painel admin (RLS só admin).

create table if not exists public.login_attempts (
  id bigint generated always as identity primary key,
  ip text, email text, success boolean default false,
  user_agent text, created_at timestamptz default now()
);
create index if not exists idx_login_ip on public.login_attempts(ip, created_at desc);
create index if not exists idx_login_email on public.login_attempts(email, created_at desc);
alter table public.login_attempts enable row level security;
drop policy if exists la_admin on public.login_attempts;
create policy la_admin on public.login_attempts for select using (public.is_admin());

-- Quantas falhas recentes para um e-mail/IP (janela). Use para bloqueio progressivo.
create or replace function public.recent_login_failures(p_email text, p_ip text, p_minutes int default 15)
returns int language sql stable security definer set search_path=public as $$
  select count(*)::int from public.login_attempts
  where success = false
    and created_at >= now() - (p_minutes || ' minutes')::interval
    and (email = p_email or ip = p_ip);
$$;

-- Regra sugerida no backend antes de autenticar:
--   const fails = await admin.rpc('recent_login_failures', { p_email, p_ip, p_minutes: 15 })
--   const wait = fails >= 5 ? Math.min(2 ** (fails - 4), 60) : 0   // backoff progressivo (s)
--   if (wait > 0) return 429 "Muitas tentativas. Aguarde."
-- Registrar SEMPRE a tentativa: admin.from('login_attempts').insert({ ip, email, success })
