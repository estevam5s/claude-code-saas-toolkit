---
name: seguranca-informacao
description: Aplica camadas de segurança (cyber-sec) em um SaaS — rate limiting, anti brute-force, CORS, sessões/refresh, RBAC, validação de cadastro (e-mail real, força de senha, anti múltiplas contas por IP), proteção XSS/CSRF, headers, validação de webhook Stripe, auditoria/logs e conformidade LGPD. Inclui templates prontos e um checklist OWASP/NIST.
---

# Segurança da Informação (cyber-sec) para SaaS

Skill que **endurece** a segurança de um SaaS (Vite/Next + Supabase + Stripe). Traz templates reutilizáveis em `templates/` e um `checklist.md`. Use junto da skill `/saas`.

## Como o Claude aplica (ordem)

1. **Auditoria inicial.** Verifique o que já existe: CORS, headers, RLS, gating de rotas admin, validação de cadastro. Marque o `checklist.md`.
2. **Rate limiting** (`templates/rate-limit.ts`). Por IP + usuário + rota nas funções serverless. Bloqueia abuso (ex.: 1M de requisições). Em produção séria, migrar para Upstash/Redis; o template em memória é a linha de base por instância.
3. **Anti brute-force / login** (`templates/login-attempts.sql` + `templates/auth-guard.ts`). Registra tentativas (IP, e-mail, sucesso), bloqueio progressivo após N falhas, e expõe os dados na rota **Logs** do admin.
4. **CORS** (`templates/cors.ts`). Allowlist por `ALLOWED_ORIGINS` (csv) + `*.vercel.app`. Preflight tratado.
5. **Headers de segurança** (`templates/security-headers.json` para `vercel.json` / `next.config`). HSTS, X-Frame SAMEORIGIN, nosniff, Referrer-Policy, Permissions-Policy, CSP base.
6. **Cadastro seguro** (`templates/signup-check.ts`). No registro: nome + e-mail + senha + confirmar senha; **verifica e-mail já existente**, **e-mail real (MX/A DNS)** e **bloqueia e-mails temporários**; **anti múltiplas contas por IP** (janela configurável); **força de senha** (`templates/password.ts`).
7. **CAPTCHA** (`templates/captcha.md`). hCaptcha/Turnstile em login, cadastro e recuperação de senha — verificação no servidor.
8. **Sessões & refresh** (`templates/session.md`). Expiração por inatividade; logout invalida refresh token (`supabase.auth.signOut({ scope: 'global' })`); cookies `Secure`, `HttpOnly`, `SameSite=Lax`.
9. **RBAC / rotas admin** (`templates/rbac.md`). `is_admin()` SECURITY DEFINER (sem recursão de RLS), middleware que bloqueia usuário comum no `/admin`, e separação super-admin × admin de tenant.
10. **Webhook Stripe** (`templates/webhook-validation.md`). Verificação de assinatura (`constructEvent`), idempotência por `stripe_event_id`, e confirmação de que a cobrança recorre nos próximos meses (`invoice.paid`/`customer.subscription.updated`).
11. **XSS / CSRF / Injection.** Sanitização de entrada, escape de saída, prepared statements/PostgREST (sem SQL cru no cliente), CSRF via SameSite + verificação de origem em mutações.
12. **Senhas em repouso.** Supabase Auth já usa bcrypt; para hashing próprio, **Argon2id**. Nunca enviar a senha mestra ao backend em produtos zero-knowledge.
13. **Auditoria & monitoramento.** `audit_logs` para ações críticas; alertas de atividade suspeita; tentativas de invasão na rota Logs.
14. **LGPD.** Consentimento, exportação e exclusão de dados; ao remover usuário, apagar dados e liberar o e-mail.
15. **Carga & escala.** Roteiro de teste de carga/estresse (`templates/load-test.md`) para validar milhares de usuários sem bugs.

## Conteúdo dos templates

- `templates/rate-limit.ts` — limitador por chave (IP/rota), janela deslizante, resposta 429.
- `templates/cors.ts` — CORS com allowlist + preflight.
- `templates/signup-check.ts` — e-mail real (DNS), duplicado, anti-IP, descarte de e-mail temporário.
- `templates/password.ts` — medidor de força (0–4) + regra mínima.
- `templates/login-attempts.sql` — tabela + função de bloqueio progressivo (RLS admin).
- `templates/security-headers.json` — headers para `vercel.json`.
- `templates/webhook-validation.md` — assinatura + idempotência + recorrência.
- `templates/rbac.md`, `templates/session.md`, `templates/captcha.md`, `templates/load-test.md`.
- `checklist.md` — checklist resumido (OWASP Top 10, NIST, LGPD).

## Objetivo

Minimizar risco de vazamento de dados, invasões, fraudes, abuso da plataforma e acessos não autorizados — alinhado a **OWASP Top 10**, **NIST** e **LGPD**.
