// Abre o Billing Portal do Stripe (gerenciar cartão, faturas, cancelar)
import { stripe, admin, cors, getUser, siteUrl } from './_lib.js'

export default async function handler(req, res) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })

  const { data: sub } = await admin.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).single()
  if (!sub?.stripe_customer_id) return res.status(400).json({ error: 'no_customer' })

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${siteUrl(req)}/dashboard/billing`,
  })
  return res.status(200).json({ url: session.url })
}
