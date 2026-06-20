// Rate limiting em memória (linha de base por instância serverless).
// Em produção de alta escala, migrar para Upstash/Redis com a mesma interface.
const BUCKET = new Map<string, { count: number; reset: number }>()

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const b = BUCKET.get(key)
  if (!b || now > b.reset) { BUCKET.set(key, { count: 1, reset: now + windowMs }); return true }
  if (b.count >= max) return false
  b.count++
  return true
}

export function clientIp(req: { headers: any }): string {
  const h = req.headers
  const get = (k: string) => (typeof h.get === 'function' ? h.get(k) : h[k]) || ''
  const xf = String(get('x-forwarded-for')).split(',')[0].trim()
  return xf || get('x-real-ip') || '0.0.0.0'
}

// Uso (Vercel serverless):
//   if (!rateLimit(`checkout:${clientIp(req)}`, 20, 60_000)) return res.status(429).json({ error: 'rate_limited' })
// Uso (Next route handler): retorne NextResponse.json({error:'rate_limited'},{status:429})
