# Guias rápidos (RBAC · Sessões · CAPTCHA · Webhook · Carga)

## RBAC e rotas admin
- `is_admin()` em SQL como **SECURITY DEFINER** (ignora RLS, evita recursão de policy). Nunca faça uma policy de `profiles` que selecione `profiles` — use a função.
- Middleware/guard de rota: usuário comum bloqueado em `/admin` (redirect para o painel dele).
- Super-admin (dono da plataforma) × admin de tenant: distinga por e-mail/flag dedicada, não só por `role`.

## Sessões e refresh
- Logout global: `await supabase.auth.signOut({ scope: 'global' })` — invalida o refresh token em todos os dispositivos.
- Expiração por inatividade: timer no cliente que faz signOut após X min sem atividade.
- Cookies de sessão (SSR): `Secure`, `HttpOnly`, `SameSite=Lax`.
- Reduza o tempo de vida do JWT no Supabase (Auth settings) para sessões mais curtas.

## CAPTCHA
- Use hCaptcha ou Cloudflare Turnstile em **login, cadastro e recuperação de senha**.
- Verifique o token **no servidor** (endpoint `/api/verify-captcha`) antes de prosseguir.
- O Supabase Auth tem suporte nativo a CAPTCHA (Auth → Settings → Enable CAPTCHA).

## Webhook Stripe (recorrência)
- Verifique a assinatura: `stripe.webhooks.constructEvent(rawBody, sig, whsec)`.
- Idempotência: insira `stripe_event_id` numa tabela `payment_events` (unique) e ignore duplicados.
- Cobrança nos próximos meses: trate `invoice.paid`/`invoice.payment_succeeded` (registra pagamento) e `customer.subscription.updated` (mantém `current_period_end`). `customer.subscription.deleted` volta ao plano grátis.
- Para conferir a recorrência sem esperar 30 dias: use o **Stripe CLI** (`stripe trigger invoice.paid`) ou clocks de teste (test clocks) no modo test.

## Teste de carga / escala
- Ferramentas: k6, Artillery ou autocannon contra os endpoints `/api/*` e páginas-chave.
- Metas: p95 de latência aceitável, zero 5xx sob carga, sem vazamento de memória nas funções.
- Banco: confira índices (ex.: `idx_*` por `user_id`/`ip`/`created_at`), RLS sem full scans, e connection pooling (Supabase Pooler) para milhares de usuários simultâneos.
