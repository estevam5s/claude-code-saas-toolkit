// Aplica o schema de billing e semeia os planos (com os price IDs do Stripe) via Management API.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  loadConfig, loadGeneratedPlans, supabaseQuery, sqlString,
  ROOT, step, ok, info,
} from './lib.mjs'

const cfg = loadConfig()
const gen = loadGeneratedPlans()
const token = cfg.supabase.accessToken
const ref = cfg.supabase.projectRef

step('Aplicando schema (plans, subscriptions, payment_events, RLS, triggers)…')
const schema = readFileSync(join(ROOT, 'scripts', 'schema.sql'), 'utf8')
await supabaseQuery(token, ref, schema)
ok('Schema aplicado.')

step('Semeando planos…')
const rows = gen.plans.map((p) => {
  const s = p.stripe || {}
  return `(${[
    sqlString(p.slug),
    sqlString(p.name),
    sqlString(p.description || ''),
    sqlString(p.billingType || 'recurring'),
    p.monthlyPrice || 0,
    p.yearlyPrice || 0,
    p.lifetimePrice || 0,
    p.includedUsers || 1,
    p.highlight ? 'true' : 'false',
    p.sortOrder || 0,
    sqlString(p.cta || 'Assinar'),
    sqlString(s.monthly),
    sqlString(s.yearly),
    sqlString(s.lifetime),
    `${sqlString(JSON.stringify(p.limits || {}))}::jsonb`,
    `${sqlString(JSON.stringify(p.features || []))}::jsonb`,
  ].join(',')})`
}).join(',\n  ')

const seed = `
insert into public.plans
  (slug,name,description,billing_type,monthly_price,yearly_price,lifetime_price,included_users,highlight,sort_order,cta,
   stripe_price_monthly,stripe_price_yearly,stripe_price_lifetime,limits,features)
values
  ${rows}
on conflict (slug) do update set
  name=excluded.name, description=excluded.description, billing_type=excluded.billing_type,
  monthly_price=excluded.monthly_price, yearly_price=excluded.yearly_price, lifetime_price=excluded.lifetime_price,
  included_users=excluded.included_users, highlight=excluded.highlight, sort_order=excluded.sort_order, cta=excluded.cta,
  stripe_price_monthly=excluded.stripe_price_monthly, stripe_price_yearly=excluded.stripe_price_yearly,
  stripe_price_lifetime=excluded.stripe_price_lifetime, limits=excluded.limits, features=excluded.features;
`
await supabaseQuery(token, ref, seed)
ok(`${gen.plans.length} planos semeados.`)

// service_role: prioriza a chave passada no config; se não houver, tenta a Management API.
step('Coletando env vars do Supabase…')
let serviceRole = cfg.supabase.serviceRole && !cfg.supabase.serviceRole.includes('SERVICE_ROLE')
  ? cfg.supabase.serviceRole
  : '<pegue em Settings → API → service_role>'
if (serviceRole.startsWith('<')) {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const keys = await res.json()
      const sr = (Array.isArray(keys) ? keys : []).find((k) => k.name === 'service_role')
      if (sr?.api_key) serviceRole = sr.api_key
    }
  } catch { /* token pode não ter escopo p/ api-keys */ }
}

console.log('\n================ ENV VARS (Supabase) ================')
console.log(`SUPABASE_URL=https://${ref}.supabase.co`)
console.log(`SUPABASE_SERVICE_ROLE=${serviceRole}`)
console.log('=====================================================\n')
info('Cole essas + as do Stripe no Vercel/host e copie templates/api/*.js para o /api do projeto.')
ok('Supabase pronto.')
