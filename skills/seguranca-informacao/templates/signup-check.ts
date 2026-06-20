// Pré-validação de cadastro: e-mail real (DNS), já existente, anti múltiplas contas por IP,
// e descarte de e-mails temporários. Roda no servidor (service_role).
import { promises as dns } from 'dns'

const MAX_PER_IP = Number(process.env.SIGNUP_MAX_PER_IP || 3)
const WINDOW_DAYS = Number(process.env.SIGNUP_WINDOW_DAYS || 7)

// Lista curta de domínios descartáveis (amplie conforme necessário).
const DISPOSABLE = new Set([
  'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
  'yopmail.com', 'trashmail.com', 'getnada.com', 'sharklasers.com',
])

export async function emailIsReal(email: string): Promise<boolean> {
  const domain = String(email).split('@')[1]?.toLowerCase()
  if (!domain || DISPOSABLE.has(domain)) return false
  try {
    const mx = await dns.resolveMx(domain).catch(() => [] as any[])
    if (mx && mx.length) return true
    const a = await dns.resolve(domain).catch(() => [] as any[])
    return a && a.length > 0
  } catch { return false }
}

// admin = cliente Supabase service_role. Retorna { ok, reason?, message? }.
export async function signupCheck(admin: any, email: string, ip: string) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, reason: 'invalid_format', message: 'E-mail inválido.' }
  if (!(await emailIsReal(email)))
    return { ok: false, reason: 'email_unreachable', message: 'Este e-mail não recebe mensagens.' }
  const { data: prof } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
  if (prof) return { ok: false, reason: 'email_exists', message: 'Já existe uma conta com este e-mail.' }
  const since = new Date(Date.now() - WINDOW_DAYS * 864e5).toISOString()
  const { count } = await admin.from('signup_log').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', since)
  if ((count || 0) >= MAX_PER_IP)
    return { ok: false, reason: 'ip_limit', message: 'Muitas contas criadas a partir desta rede.' }
  return { ok: true }
}

// Após signUp bem-sucedido: await admin.from('signup_log').insert({ ip, email })
