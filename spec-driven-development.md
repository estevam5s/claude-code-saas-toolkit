# Spec-Driven Development — Transformar um projeto em SaaS completo

Documento mestre que orquestra as skills do Claude Code para transformar **qualquer projeto** em um SaaS profissional, seguro e funcional. O Claude executa passo a passo, com especificação antes da implementação.

Skills usadas: **`plano-preco`** · **`/saas`** · **`seguranca-informacao`** · **`supabase-cron`**.

## Dados que o usuário fornece
- **Supabase:** `url`, `anon key`, `service_role key`, `token` (PAT `sbp_…`).
- **Stripe:** `secret/restricted key` (`sk_live`/`rk_live`).
- **Planos:** quantos e quais (ex.: "Inicial grátis, Starter, Pro, Enterprise").
- **Admin:** e-mail e senha do administrador principal.
- **siteUrl** (domínio Vercel).

## Fase 0 — Especificação (spec antes do código)
1. **Inventário do projeto.** Leia rotas, páginas, tabelas, integrações. Documente capacidades reais × roadmap.
2. **Decisões.** Stack (Vite/Next), modelo freemium, eixos de cobrança (sem GB), domínio canônico.

## Fase 1 — Plano de preços (skill `plano-preco`)
3. Gere `plano-preco.md` com análise de mercado competitiva (BRL, mensal + anual = 2 meses grátis), funcionalidades e limites por plano.
4. Traduza para `plans.json` (slug, name, monthly/yearly, features[], limits{}).

## Fase 2 — Billing + banco (skill `/saas`)
5. Preencha `config.json` (Stripe key + Supabase url/anon/service_role/token + admin + siteUrl).
6. `node scripts/verify.mjs` → `setup-stripe.mjs` → `setup-supabase.mjs`:
   - Stripe: 1 produto por plano, preços mensal/anual (+vitalício se houver) e **webhook** que ativa o plano no checkout.
   - Supabase: schema (`plans`, `subscriptions`, `payment_events`, `cancellation_feedback`) + RLS + triggers + seed dos planos.
7. Copie `templates/api/*` para `/api` (checkout/webhook/portal/subscription). Checkout com **trial 7 dias**; webhook idempotente que **ativa/sincroniza** a assinatura e registra pagamentos recorrentes.
8. **Schema extra:** profiles(role, plan, referral), support_messages (Pro prioritário), payments, visitor_events, e módulos do admin (saas_products/finance/offers/seo/monitoring/audit/api_keys). Crie o admin principal (role=admin) e ative o autoconfirm de e-mail.
9. **Fluxo do usuário:** signup → dashboard → banner de escolha de plano (toggle mensal/anual) → checkout → webhook ativa → gating (grátis = limitado). Gestão de assinatura: upgrade (proração), downgrade (agendado), cancelar/reativar, **cancelar conta com tela de feedback** (salva para o admin), reembolso até 7 dias.

## Fase 3 — Segurança (skill `seguranca-informacao`)
10. Aplique os templates: rate-limit, CORS, headers (HSTS/CSP/etc.), signup-check (e-mail real/duplicado/anti-IP), força de senha, login-attempts (brute force), CAPTCHA, sessões/refresh, RBAC (admin protegido), validação de webhook. Marque o `checklist.md` (OWASP/NIST/LGPD).
11. Garanta: usuário comum **não** acessa `/admin`; logout invalida refresh; cobrança recorre nos próximos meses; suporte a milhares de usuários (índices, pooler, teste de carga).

## Fase 4 — Site institucional + SEO
12. Rotas: home, sobre, preço (design do `price.md`), changelog, contato. Botão "ir ao dashboard" quando logado; login/criar conta quando não. Login/registro no design do `login.md`.
13. SEO/compartilhamento: Open Graph, Twitter Cards, imagem de destaque, sitemap, robots, metadados profissionais (LinkedIn, WhatsApp, Telegram, Discord, Facebook, Instagram, Gmail, Google, X).

## Fase 5 — Painel admin (18 módulos)
14. Dashboard, SaaS, Usuários, Clientes, Assinaturas, Planos, Financeiro, Visitantes, Globo Interativo, SEO, Monitoramento, Promoções, Cupons, Logs, Backup, API, Suporte, Configurações. Métricas: MRR, ARR, ARPU, LTV, churn, conversão, clientes ativos/cancelados/teste/pagantes.

## Fase 6 — Cron jobs (skill `supabase-cron`)
15. Agende rotinas via pg_cron usando `url`, `anon key`, `service_role` e `token`: backups semanais, agregação de métricas, limpeza de logs, verificação de assinaturas vencendo, monitoramento de saúde.

## Fase 7 — Deploy contínuo
16. GitHub (versionamento) + Vercel (deploy automático do branch principal). Configure as env vars no projeto Vercel correto (atenção a múltiplos projetos ligados ao mesmo repo). Registre o SaaS no painel central (`novos-sistemas-saas/dashboard`).

## Princípios
- **Spec antes do código**; honestidade sobre o que é roadmap.
- **Sem GB**; cobrança por valor.
- **Segredos** nunca no bundle; `service_role` só no backend; `.env`/`config.json` no `.gitignore`.
- **Verificável**: smoke-test (site 200, checkout 401, admin 403, webhook 400, planos legíveis).
