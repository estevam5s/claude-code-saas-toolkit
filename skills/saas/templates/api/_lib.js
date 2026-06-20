// Helpers compartilhados pelas funções serverless (Vercel Node, ESM)
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const APP = process.env.APP_NAME || 'saas'
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

export const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Origins liberados: lista em ALLOWED_ORIGINS (csv) + qualquer *.vercel.app
const ALLOWED = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4173')
  .split(',').map((s) => s.trim()).filter(Boolean)

export function cors(req, res) {
  const origin = req.headers.origin || ''
  let host = ''
  try { host = new URL(origin).hostname } catch { /* sem origin */ }
  const ok = ALLOWED.includes(origin) || /\.vercel\.app$/.test(host)
  res.setHeader('Access-Control-Allow-Origin', ok ? origin : (ALLOWED[ALLOWED.length - 1] || '*'))
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.status(204).end(); return true }
  return false
}

// Lê o JWT do header Authorization e devolve o usuário Supabase (ou null)
export async function getUser(req) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

// Buffer cru do corpo (necessário p/ verificação de assinatura do Stripe)
export function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export async function readJson(req) {
  const buf = await rawBody(req)
  if (!buf.length) return {}
  try { return JSON.parse(buf.toString('utf8')) } catch { return {} }
}

export const siteUrl = (req) =>
  process.env.VITE_SITE_URL || `https://${req.headers.host}`
