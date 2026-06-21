// Helpers compartilhados pela skill SaaS (Node >= 18, fetch nativo, ESM)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(HERE, '..')

// Parser simples de .env (KEY=VALUE, ignora comentários e linhas vazias).
function parseEnv(text) {
  const out = {}
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return out
}

// Monta o cfg a partir de um .env (procura no ROOT da skill e no cwd do projeto).
function configFromEnv() {
  for (const dir of [ROOT, process.cwd()]) {
    const p = join(dir, '.env')
    if (!existsSync(p)) continue
    const e = parseEnv(readFileSync(p, 'utf8'))
    if (!e.STRIPE_SECRET_KEY || !e.SUPABASE_ACCESS_TOKEN) continue
    return {
      appName: e.APP_NAME || 'meu-saas',
      siteUrl: e.SITE_URL || 'https://meu-saas.vercel.app',
      stripe: { secretKey: e.STRIPE_SECRET_KEY, trialDays: Number(e.TRIAL_DAYS || 7), currency: e.CURRENCY || 'brl', locale: e.LOCALE || 'pt-BR' },
      supabase: { url: e.SUPABASE_URL, anonKey: e.SUPABASE_ANON_KEY, serviceRole: e.SUPABASE_SERVICE_ROLE, accessToken: e.SUPABASE_ACCESS_TOKEN, schema: 'public' },
      admin: { email: e.ADMIN_EMAIL, password: e.ADMIN_PASSWORD },
      allowedOrigins: e.ALLOWED_ORIGINS || '',
      webhook: { path: '/api/webhook', events: ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_succeeded', 'invoice.payment_failed', 'charge.refunded'] },
    }
  }
  return null
}

export function loadConfig() {
  const p = join(ROOT, 'config.json')
  // 1) config.json tem prioridade; 2) senão, monta a partir do .env.
  let cfg
  if (existsSync(p)) {
    cfg = JSON.parse(readFileSync(p, 'utf8'))
  } else {
    cfg = configFromEnv()
    if (!cfg) fail('Nem config.json nem .env encontrados. Copie .env.example → .env (ou config.example.json → config.json) e preencha as chaves.')
  }
  // aceita conta única (stripe.secretKey) OU multi-conta (stripe.accounts)
  const hasSingle = cfg.stripe?.secretKey && !cfg.stripe.secretKey.includes('COLE')
  const hasMulti = cfg.stripe?.accounts && Object.keys(cfg.stripe.accounts).length > 0
  if (!hasSingle && !hasMulti) fail('config.json: defina stripe.secretKey OU stripe.accounts.')
  if (!cfg.supabase?.accessToken || cfg.supabase.accessToken.includes('COLE')) fail('config.json: supabase.accessToken não preenchido.')
  // projectRef pode ser derivado da supabase.url (https://<ref>.supabase.co)
  if ((!cfg.supabase.projectRef || cfg.supabase.projectRef.includes('ref_do')) && cfg.supabase.url) {
    const m = String(cfg.supabase.url).match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i)
    if (m) cfg.supabase.projectRef = m[1]
  }
  if (!cfg.supabase?.projectRef || cfg.supabase.projectRef.includes('ref_do')) fail('config.json: informe supabase.url (ou supabase.projectRef).')
  if (!cfg.supabase.url) cfg.supabase.url = `https://${cfg.supabase.projectRef}.supabase.co`
  if (!cfg.siteUrl) fail('config.json: siteUrl não preenchido.')
  return cfg
}

// Mascara uma chave para exibição segura (nunca imprima a chave inteira).
export function maskKey(k = '') {
  if (!k) return '(vazia)'
  return k.length <= 16 ? k.slice(0, 6) + '…' : `${k.slice(0, 12)}…${k.slice(-4)}`
}

// Resolve QUAL conta Stripe usar (multi-conta) e devolve {name,label,secretKey,publishableKey,mode}.
// Ordem: argumento explícito → env SAAS_ACCOUNT → --account=<n> no argv → stripe.defaultAccount → 1ª conta.
// Compatível com config de conta única (stripe.secretKey).
export function resolveStripeAccount(cfg, name) {
  const s = cfg.stripe || {}
  if (!s.accounts || Object.keys(s.accounts).length === 0) {
    const secretKey = s.secretKey
    if (!secretKey) fail('config.json: nenhuma conta Stripe configurada.')
    return { name: 'default', label: '(conta única)', secretKey, publishableKey: s.publishableKey, mode: secretKey.includes('_test_') ? 'test' : 'live' }
  }
  const argAcct = (process.argv.find((a) => a.startsWith('--account=')) || '').split('=')[1]
  const pick = name || process.env.SAAS_ACCOUNT || argAcct || s.defaultAccount || Object.keys(s.accounts)[0]
  const a = s.accounts[pick]
  if (!a) fail(`Conta Stripe "${pick}" não existe. Disponíveis: ${Object.keys(s.accounts).join(', ')}.`)
  if (!a.secretKey || a.secretKey.includes('COLE')) fail(`config.json: stripe.accounts.${pick}.secretKey não preenchida.`)
  return { name: pick, label: a.label || pick, secretKey: a.secretKey, publishableKey: a.publishableKey, mode: a.mode || (a.secretKey.includes('_test_') ? 'test' : 'live') }
}

// Imprime de forma padronizada qual conta/chave está sendo usada (transparência).
export function announceAccount(acct) {
  const tag = acct.mode === 'test' ? 'TEST 🧪' : 'LIVE 🔴'
  console.log(`\n🏦 Conta Stripe: ${acct.label} [${acct.name}] · ${tag}`)
  console.log(`   chave: ${maskKey(acct.secretKey)}${acct.publishableKey ? ' · pub: ' + maskKey(acct.publishableKey) : ''}\n`)
}

export function loadPlans() {
  for (const name of ['plans.json', 'plans.example.json']) {
    const p = join(ROOT, name)
    if (existsSync(p)) return { plans: JSON.parse(readFileSync(p, 'utf8')), from: name }
  }
  fail('Nenhum plans.json/plans.example.json encontrado.')
}

export function loadGeneratedPlans() {
  const p = join(ROOT, 'plans.generated.json')
  if (!existsSync(p)) fail('plans.generated.json não existe. Rode setup-stripe.mjs primeiro.')
  return JSON.parse(readFileSync(p, 'utf8'))
}

export function saveJson(name, data) {
  writeFileSync(join(ROOT, name), JSON.stringify(data, null, 2) + '\n')
}

// ---- Stripe (form-encoded, suporta chaves aninhadas: a[b]=c) ----
function encodeForm(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue
    const key = prefix ? `${prefix}[${k}]` : k
    if (typeof v === 'object' && !Array.isArray(v)) encodeForm(v, key, out)
    else if (Array.isArray(v)) v.forEach((item, i) => {
      if (typeof item === 'object') encodeForm(item, `${key}[${i}]`, out)
      else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(item)}`)
    })
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
  }
  return out
}

export async function stripe(secretKey, method, path, body) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-06-20',
    },
    body: body ? encodeForm(body).join('&') : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = json?.error?.message || res.statusText
    const code = json?.error?.code || res.status
    if (res.status === 403) {
      throw new Error(`Stripe 403 (escopo da chave insuficiente) em ${method} ${path}: ${msg}. Amplie a restricted key.`)
    }
    throw new Error(`Stripe ${code} em ${method} ${path}: ${msg}`)
  }
  return json
}

// ---- Supabase Management API ----
export async function supabaseQuery(token, ref, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Supabase query falhou (${res.status}): ${text}`)
  try { return JSON.parse(text) } catch { return text }
}

export async function supabaseProject(token, ref) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Supabase project (${res.status}): ${await res.text()}`)
  return res.json()
}

export function sqlString(v) {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return `'${String(v).replace(/'/g, "''")}'`
}

export function fail(msg) { console.error(`\n❌ ${msg}\n`); process.exit(1) }
export function ok(msg) { console.log(`✅ ${msg}`) }
export function info(msg) { console.log(`   ${msg}`) }
export function step(msg) { console.log(`\n▶ ${msg}`) }
