// CORS com allowlist por ALLOWED_ORIGINS (csv) + qualquer *.vercel.app.
const ALLOWED = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',').map((s) => s.trim()).filter(Boolean)

export function corsHeaders(origin: string) {
  let host = ''
  try { host = new URL(origin).hostname } catch { /* sem origin */ }
  const ok = ALLOWED.includes(origin) || /\.vercel\.app$/.test(host)
  return {
    'Access-Control-Allow-Origin': ok ? origin : (ALLOWED[ALLOWED.length - 1] || '*'),
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

// Vercel serverless:
//   const h = corsHeaders(req.headers.origin || '')
//   Object.entries(h).forEach(([k,v]) => res.setHeader(k, v))
//   if (req.method === 'OPTIONS') { res.status(204).end(); return }
