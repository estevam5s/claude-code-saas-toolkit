// Helpers compartilhados pela skill SaaS (Node >= 18, fetch nativo, ESM)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(HERE, '..')

export function loadConfig() {
  const p = join(ROOT, 'config.json')
  if (!existsSync(p)) {
    fail(`config.json não encontrado. Copie config.example.json → config.json e preencha (Stripe key + Supabase token).`)
  }
  const cfg = JSON.parse(readFileSync(p, 'utf8'))
  if (!cfg.stripe?.secretKey || cfg.stripe.secretKey.includes('COLE')) fail('config.json: stripe.secretKey não preenchida.')
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
