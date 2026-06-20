// Cria produtos, preços e webhook no Stripe. Idempotente por metadata.plan_slug.
// Gera plans.generated.json (planos + price IDs) e imprime o STRIPE_WEBHOOK_SECRET.
import { loadConfig, loadPlans, saveJson, stripe, step, ok, info, fail } from './lib.mjs'

const cfg = loadConfig()
const { plans, from } = loadPlans()
const sk = cfg.stripe.secretKey
const currency = cfg.stripe.currency || 'brl'
info(`Usando planos de ${from} (${plans.length})`)

// Procura produto existente por metadata.plan_slug **escopado pelo app** (evita reusar
// produtos de OUTRO SaaS na mesma conta Stripe que usem o mesmo slug, ex.: starter/pro).
const APP = cfg.appName || 'saas'
async function findProduct(slug) {
  // 1) busca indexada (rápida, mas eventualmente consistente — pode não ver produto recém-criado)
  const r = await stripe(sk, 'GET', `/products/search?query=${encodeURIComponent(`metadata['plan_slug']:'${slug}' AND metadata['app']:'${APP}' AND active:'true'`)}`)
  if (r.data?.[0]) return r.data[0]
  // 2) fallback: varredura da lista (não tem lag de índice) — evita duplicar em re-runs na mesma sessão
  const list = await stripe(sk, 'GET', '/products?active=true&limit=100')
  return (list.data || []).find((p) => p.metadata?.plan_slug === slug && p.metadata?.app === APP) || null
}

async function ensureProduct(plan) {
  const existing = await findProduct(plan.slug)
  if (existing) {
    await stripe(sk, 'POST', `/products/${existing.id}`, {
      name: plan.name, description: plan.description || '',
    })
    info(`produto reusado: ${plan.slug} → ${existing.id}`)
    return existing.id
  }
  const p = await stripe(sk, 'POST', '/products', {
    name: plan.name,
    description: plan.description || '',
    metadata: { plan_slug: plan.slug, app: cfg.appName || 'saas' },
  })
  info(`produto criado: ${plan.slug} → ${p.id}`)
  return p.id
}

// Reusa preço se já existir com mesmo valor/intervalo (preços são imutáveis no Stripe)
async function ensurePrice(productId, plan, kind) {
  const amount = { monthly: plan.monthlyPrice, yearly: plan.yearlyPrice, lifetime: plan.lifetimePrice }[kind]
  if (!amount || amount <= 0) return null
  const unit = Math.round(amount * 100)
  const recurring = kind === 'monthly' ? { interval: 'month' } : kind === 'yearly' ? { interval: 'year' } : null

  const list = await stripe(sk, 'GET', `/prices?product=${productId}&active=true&limit=100`)
  const match = list.data?.find((pr) =>
    pr.unit_amount === unit && pr.currency === currency &&
    ((recurring && pr.recurring?.interval === recurring.interval) || (!recurring && !pr.recurring))
  )
  if (match) { info(`  preço ${kind} reusado: ${match.id}`); return match.id }

  const body = {
    product: productId, currency, unit_amount: unit,
    metadata: { plan_slug: plan.slug, kind },
    ...(recurring ? { recurring } : {}),
  }
  const pr = await stripe(sk, 'POST', '/prices', body)
  info(`  preço ${kind} criado: ${pr.id} (${(unit / 100).toFixed(2)} ${currency})`)
  return pr.id
}

step('Configurando produtos e preços…')
const generated = []
for (const plan of plans) {
  if (plan.billingType === 'free') {
    generated.push({ ...plan, stripe: { monthly: null, yearly: null, lifetime: null } })
    info(`plano free: ${plan.slug} (sem preço)`)
    continue
  }
  const productId = await ensureProduct(plan)
  const monthly = await ensurePrice(productId, plan, 'monthly')
  const yearly = await ensurePrice(productId, plan, 'yearly')
  const lifetime = await ensurePrice(productId, plan, 'lifetime')
  generated.push({ ...plan, stripe: { productId, monthly, yearly, lifetime } })
}
ok(`${generated.length} planos processados no Stripe.`)

step('Configurando webhook…')
const url = `${cfg.siteUrl.replace(/\/$/, '')}${cfg.webhook?.path || '/api/webhook'}`
const events = cfg.webhook?.events || [
  'checkout.session.completed', 'customer.subscription.created',
  'customer.subscription.updated', 'customer.subscription.deleted',
  'invoice.payment_failed', 'charge.refunded',
]
const hooks = await stripe(sk, 'GET', '/webhook_endpoints?limit=100')
let endpoint = hooks.data?.find((h) => h.url === url)
let webhookSecret = null
if (endpoint) {
  await stripe(sk, 'POST', `/webhook_endpoints/${endpoint.id}`, { enabled_events: events })
  info(`webhook existente atualizado: ${endpoint.id}`)
  info('(o signing secret só é exibido na criação — reuse o STRIPE_WEBHOOK_SECRET salvo, ou recrie o endpoint)')
} else {
  endpoint = await stripe(sk, 'POST', '/webhook_endpoints', {
    url, enabled_events: events, description: `${cfg.appName || 'saas'} billing`,
  })
  webhookSecret = endpoint.secret
  ok(`webhook criado: ${endpoint.id} → ${url}`)
}

saveJson('plans.generated.json', { app: cfg.appName, currency, plans: generated })
ok('plans.generated.json salvo.')

console.log('\n================ ENV VARS (Stripe) ================')
console.log(`STRIPE_SECRET_KEY=${sk}`)
if (webhookSecret) console.log(`STRIPE_WEBHOOK_SECRET=${webhookSecret}`)
else console.log('STRIPE_WEBHOOK_SECRET=<reuse o existente — webhook não foi recriado>')
console.log(`VITE_SITE_URL=${cfg.siteUrl}`)
console.log('===================================================\n')
console.log('➡  Próximo: node scripts/setup-supabase.mjs')
