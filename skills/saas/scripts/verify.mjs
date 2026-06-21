// Valida credenciais e conectividade antes do bootstrap.
import { loadConfig, resolveStripeAccount, announceAccount, stripe, supabaseProject, step, ok, info, fail } from './lib.mjs'

const cfg = loadConfig()
const acctCfg = resolveStripeAccount(cfg)
announceAccount(acctCfg)

step('Verificando Stripe…')
try {
  const acct = await stripe(acctCfg.secretKey, 'GET', '/account')
  ok(`Stripe OK — conta ${acct.id} (${acct.settings?.dashboard?.display_name || acct.email || 'sem nome'})`)
  info(`Modo: ${acctCfg.mode.toUpperCase()} · moeda padrão ${acct.default_currency || '?'}`)
} catch (e) {
  try {
    await stripe(acctCfg.secretKey, 'GET', '/products?limit=1')
    ok('Stripe OK (via /products) — chave válida.')
  } catch (e2) {
    fail(`Stripe inválida: ${e2.message}`)
  }
}

step('Verificando Supabase…')
try {
  const proj = await supabaseProject(cfg.supabase.accessToken, cfg.supabase.projectRef)
  ok(`Supabase OK — projeto "${proj.name}" (${proj.region}, status ${proj.status})`)
  info(`SUPABASE_URL = https://${cfg.supabase.projectRef}.supabase.co`)
} catch (e) {
  fail(`Supabase inválido: ${e.message}`)
}

console.log('\n✔ Credenciais válidas. Pode rodar setup-stripe.mjs e setup-supabase.mjs.')
