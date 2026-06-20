// Medidor de força de senha (0–4) + regra mínima de aceitação.
export function passwordStrength(pw: string): number {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^a-zA-Z0-9]/.test(pw)) s++
  return Math.min(s, 4)
}

export const STRENGTH_LABEL = ['Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte']

// Aceitar a partir de "Média" (>= 2). Bloquear senhas comuns/igual ao e-mail no servidor.
export function passwordAcceptable(pw: string, email = ''): boolean {
  if (passwordStrength(pw) < 2) return false
  if (email && pw.toLowerCase().includes(email.split('@')[0].toLowerCase())) return false
  return true
}
