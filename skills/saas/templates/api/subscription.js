// Gerencia a assinatura: cancelar (com feedback), reativar, trocar de plano (upgrade imediato / downgrade no próximo ciclo)
import { stripe, admin, cors, getUser, readJson, APP } from './_lib.js'

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })

  const body = await readJson(req)
  const action = body.action
  const { data: sub } = await admin.from('subscriptions').select('*').eq('user_id', user.id).single()
  if (!sub) return res.status(404).json({ error: 'no_subscription' })

  try {
    if (action === 'cancel') {
      await admin.from('cancellation_feedback').insert({
        user_id: user.id, plan_slug: sub.plan_slug,
        reason: body.reason || null, comment: body.comment || null,
      })
      if (sub.stripe_subscription_id) {
        await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true })
      }
      await admin.from('subscriptions').update({ cancel_at_period_end: true, canceled_at: new Date().toISOString() }).eq('user_id', user.id)
      return res.status(200).json({ ok: true, message: 'Assinatura será cancelada no fim do período pago.' })
    }

    if (action === 'reactivate') {
      if (sub.stripe_subscription_id) {
        await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: false })
      }
      await admin.from('subscriptions').update({ cancel_at_period_end: false, canceled_at: null }).eq('user_id', user.id)
      return res.status(200).json({ ok: true, message: 'Assinatura reativada.' })
    }

    if (action === 'change') {
      const targetSlug = body.plan_slug
      const cycle = body.cycle || sub.billing_cycle || 'monthly'
      const { data: target } = await admin.from('plans').select('*').eq('slug', targetSlug).single()
      const { data: current } = await admin.from('plans').select('*').eq('slug', sub.plan_slug).single()
      if (!target || target.billing_type === 'free') return res.status(400).json({ error: 'invalid_target' })

      const newPrice = cycle === 'yearly' ? target.stripe_price_yearly : target.stripe_price_monthly
      if (!newPrice) return res.status(400).json({ error: 'price_not_configured' })
      if (!sub.stripe_subscription_id) return res.status(409).json({ error: 'no_active_subscription', checkout: true })

      const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
      const itemId = stripeSub.items.data[0].id
      const isUpgrade = Number(target.monthly_price) >= Number(current?.monthly_price || 0)

      if (isUpgrade) {
        await stripe.subscriptions.update(sub.stripe_subscription_id, {
          items: [{ id: itemId, price: newPrice }],
          proration_behavior: 'always_invoice',
          metadata: { user_id: user.id, plan_slug: targetSlug, cycle, app: APP },
        })
        await admin.from('subscriptions').update({
          plan_slug: targetSlug, billing_cycle: cycle,
          pending_plan_slug: null, pending_cycle: null, pending_effective_at: null,
        }).eq('user_id', user.id)
        return res.status(200).json({ ok: true, message: `Upgrade para ${target.name} aplicado imediatamente.` })
      }

      const periodEnd = stripeSub.current_period_end
      const curPrice = cycle === 'yearly' ? current.stripe_price_yearly : current.stripe_price_monthly
      const schedule = await stripe.subscriptionSchedules.create({ from_subscription: sub.stripe_subscription_id })
      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: 'release',
        phases: [
          { items: [{ price: curPrice, quantity: 1 }], start_date: schedule.phases[0].start_date, end_date: periodEnd },
          { items: [{ price: newPrice, quantity: 1 }], metadata: { user_id: user.id, plan_slug: targetSlug, cycle, app: APP } },
        ],
      })
      await admin.from('subscriptions').update({
        pending_plan_slug: targetSlug, pending_cycle: cycle,
        pending_effective_at: new Date(periodEnd * 1000).toISOString(),
      }).eq('user_id', user.id)
      return res.status(200).json({ ok: true, message: `Downgrade para ${target.name} agendado para o próximo ciclo.` })
    }

    return res.status(400).json({ error: 'unknown_action' })
  } catch (e) {
    return res.status(500).json({ error: 'stripe_error', message: e.message })
  }
}
