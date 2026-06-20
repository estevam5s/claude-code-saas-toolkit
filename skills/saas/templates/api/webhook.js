// Webhook do Stripe — sincroniza assinaturas no Supabase (assinatura verificada + idempotência)
import { stripe, admin, rawBody } from './_lib.js'

// Garante acesso ao corpo cru (necessário p/ verificar a assinatura)
export const config = { api: { bodyParser: false } }

async function freePlanSlug() {
  const { data } = await admin.from('plans').select('slug').eq('billing_type', 'free').order('sort_order').limit(1).single()
  return data?.slug || 'free'
}

async function planFromPrice(priceId) {
  if (!priceId) return null
  const { data } = await admin.from('plans').select('slug,billing_type')
    .or(`stripe_price_monthly.eq.${priceId},stripe_price_yearly.eq.${priceId},stripe_price_lifetime.eq.${priceId}`)
    .limit(1).single()
  return data || null
}
function cycleFromPrice(plan, sub) {
  if (plan?.billing_type === 'lifetime') return 'lifetime'
  const interval = sub?.items?.data?.[0]?.price?.recurring?.interval
  return interval === 'year' ? 'yearly' : 'monthly'
}

async function syncSubscription(stripeSub) {
  const customerId = stripeSub.customer
  const priceId = stripeSub.items?.data?.[0]?.price?.id
  const plan = await planFromPrice(priceId)
  const userId = stripeSub.metadata?.user_id

  const patch = {
    status: stripeSub.status,
    billing_cycle: cycleFromPrice(plan, stripeSub),
    stripe_subscription_id: stripeSub.id,
    stripe_customer_id: customerId,
    current_period_start: stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1000).toISOString() : null,
    current_period_end: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000).toISOString() : null,
    trial_end: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
    cancel_at_period_end: !!stripeSub.cancel_at_period_end,
  }
  if (plan) patch.plan_slug = plan.slug

  if (userId) await admin.from('subscriptions').update(patch).eq('user_id', userId)
  else if (customerId) await admin.from('subscriptions').update(patch).eq('stripe_customer_id', customerId)
  else await admin.from('subscriptions').update(patch).eq('stripe_subscription_id', stripeSub.id)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const sig = req.headers['stripe-signature']
  let event
  try {
    const buf = await rawBody(req)
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return res.status(400).send(`Webhook signature error: ${err.message}`)
  }

  // idempotência
  const { error: dupErr } = await admin.from('payment_events')
    .insert({ stripe_event_id: event.id, type: event.type, payload: event.data.object })
  if (dupErr && dupErr.code === '23505') return res.status(200).json({ received: true, duplicate: true })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object
        if (s.mode === 'payment' && s.metadata?.user_id) {
          await admin.from('subscriptions').update({
            plan_slug: s.metadata.plan_slug || 'vitalicio',
            status: 'active', billing_cycle: 'lifetime',
            stripe_customer_id: s.customer,
            current_period_end: null, cancel_at_period_end: false,
          }).eq('user_id', s.metadata.user_id)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await syncSubscription(event.data.object)
        break
      }
      case 'customer.subscription.deleted': {
        const s = event.data.object
        await admin.from('subscriptions').update({
          plan_slug: await freePlanSlug(), status: 'canceled', billing_cycle: 'free',
          stripe_subscription_id: null, cancel_at_period_end: false,
          pending_plan_slug: null, pending_cycle: null, pending_effective_at: null,
        }).eq('stripe_customer_id', s.customer)
        break
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object
        if (inv.customer) await admin.from('subscriptions').update({ status: 'past_due' }).eq('stripe_customer_id', inv.customer)
        break
      }
      case 'charge.refunded':
        break
    }
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
  return res.status(200).json({ received: true })
}
