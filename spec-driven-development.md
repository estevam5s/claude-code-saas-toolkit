# Spec-Driven Development — Transformar um projeto em SaaS completo

Documento mestre que orquestra as skills do Claude Code para transformar **qualquer projeto** em um SaaS profissional, seguro e funcional. O Claude executa passo a passo, com especificação antes da implementação.

Skills usadas: **`plano-preco`** · **`/saas`** · **`seguranca-informacao`** · **`supabase-cron`** · **`ui-ux-pro-max`** (plugin de UI/UX).

## Credenciais via `.env` (recomendado)
O usuário **copia `.env.example` → `.env`** (na pasta da skill `saas/` ou na raiz do projeto) e preenche — as skills leem dele automaticamente (não precisa de `config.json`):
```
APP_NAME, SITE_URL
STRIPE_SECRET_KEY, TRIAL_DAYS, CURRENCY, LOCALE
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE, SUPABASE_ACCESS_TOKEN
ADMIN_EMAIL, ADMIN_PASSWORD
ALLOWED_ORIGINS
```
> `.env` é **gitignored** — nunca é commitado. O `service_role` e a chave Stripe vivem só no backend/host.

## Plugin UI/UX Pro Max (site/dashboard impecável + 3D)
Antes de construir telas, instale e use o plugin de UI/UX:
```
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```
O Claude usa essa skill para: **design system** consistente (cores/tipografia/espaçamento), componentes profissionais, **animações** e microinterações (respeitando `prefers-reduced-motion`), responsividade (mobile→desktop), acessibilidade (contraste, foco, ARIA) e, quando fizer sentido, **uma seção 3D** (no máximo — hero/herói com `react-three-fiber`/`three`, ou efeitos parallax/glow), sem comprometer performance (lazy-load, CLS baixo). Aplique a TODAS as superfícies: **site institucional, painel do usuário e painel admin**.

## Fase 0 — Intake: o Claude PERGUNTA antes de construir
Ao receber o pedido de spec-driven, o Claude **faz um questionário completo** (use `INTAKE.md`) e só depois prepara o SaaS. Perguntas essenciais (agrupe e use `AskUserQuestion` quando útil):
1. **Ponto de partida:** já tem sistema+site / só site / só dashboard / nada?
2. **Stack:** Vite+React+shadcn ou Next.js? Repo GitHub existente? Projeto Vercel?
3. **Credenciais:** `.env` preenchido? (Supabase url/anon/service_role/token + Stripe key.)
4. **Produto:** o que faz, para quem, entidades principais (ex.: alunos/turmas, pets/tutores, projetos…).
5. **Planos:** quantos e quais nomes? Grátis incluso? Enterprise/Vitalício?
6. **Domínio canônico** e nome do app.
7. **Admin principal:** e-mail/senha.
8. **Identidade visual:** cor primária, tom (sóbrio/divertido), quer seção **3D**? Modo claro/escuro?
9. **Recursos do produto** por plano (o que liberar no grátis vs pago).
10. **Idioma/moeda** (pt-BR/BRL por padrão) e quaisquer integrações extras.
Depois do questionário, o Claude **confirma o resumo** e executa as Fases 1→7.

## Fase 0.1 — Especificação (spec antes do código)
1. **Inventário do projeto.** Leia rotas, páginas, tabelas, integrações. Documente capacidades reais × roadmap.
2. **Decisões.** Stack (Vite/Next), modelo freemium, eixos de cobrança (sem GB), domínio canônico, **design system + uso do plugin UI/UX Pro Max**.

## Fase 1 — Plano de preços (skill `plano-preco`)
3. Gere `plano-preco.md` com análise de mercado competitiva (BRL, mensal + anual = 2 meses grátis), funcionalidades e limites por plano.
4. Traduza para `plans.json` (slug, name, monthly/yearly, features[], limits{}).

## Fase 2 — Billing + banco (skill `/saas`)
5. Preencha o **`.env`** (ou `config.json`) com Stripe key + Supabase url/anon/service_role/token + admin + siteUrl. As skills leem do `.env` automaticamente.
6. `node scripts/verify.mjs` → `setup-stripe.mjs` → `setup-supabase.mjs`:
   - Stripe: 1 produto por plano, preços mensal/anual (+vitalício se houver) e **webhook** que ativa o plano no checkout.
   - Supabase: schema (`plans`, `subscriptions`, `payment_events`, `cancellation_feedback`) + RLS + triggers + seed dos planos.
7. Copie `templates/api/*` para `/api` (checkout/webhook/portal/subscription). Checkout com **trial 7 dias**; webhook idempotente que **ativa/sincroniza** a assinatura e registra pagamentos recorrentes.
8. **Schema extra:** profiles(role, plan, referral), support_messages (Pro prioritário), payments, visitor_events, e módulos do admin (saas_products/finance/offers/seo/monitoring/audit/api_keys). Crie o admin principal (role=admin) e ative o autoconfirm de e-mail.
9. **Fluxo do usuário:** signup → dashboard → banner de escolha de plano (toggle mensal/anual) → checkout → webhook ativa → gating (grátis = limitado). Gestão de assinatura: upgrade (proração), downgrade (agendado), cancelar/reativar, **cancelar conta com tela de feedback** (salva para o admin), reembolso até 7 dias.

## Fase 3 — Segurança (skill `seguranca-informacao`)
10. Aplique os templates: rate-limit, CORS, headers (HSTS/CSP/etc.), signup-check (e-mail real/duplicado/anti-IP), força de senha, login-attempts (brute force), CAPTCHA, sessões/refresh, RBAC (admin protegido), validação de webhook. Marque o `checklist.md` (OWASP/NIST/LGPD).
11. Garanta: usuário comum **não** acessa `/admin`; logout invalida refresh; cobrança recorre nos próximos meses; suporte a milhares de usuários (índices, pooler, teste de carga).

## Fase 4 — Site institucional + SEO (com UI/UX Pro Max)
12. Rotas: home, sobre, preço (design do `price.md`), changelog, contato. Botão "ir ao dashboard" quando logado; login/criar conta quando não. Login/registro no design do `login.md`. **Aplique o plugin `ui-ux-pro-max`** para design system, animações e, no hero, uma **seção 3D** opcional (react-three-fiber) — no máximo uma, com lazy-load.
13. SEO/compartilhamento: Open Graph, Twitter Cards, imagem de destaque, sitemap, robots, metadados profissionais (LinkedIn, WhatsApp, Telegram, Discord, Facebook, Instagram, Gmail, Google, X).

## Fase 5 — Painel admin (18 módulos, com UI/UX Pro Max)
14. Dashboard, SaaS, Usuários, Clientes, Assinaturas, Planos, Financeiro, Visitantes, Globo Interativo, SEO, Monitoramento, Promoções, Cupons, Logs, Backup, API, Suporte, Configurações. Métricas: MRR, ARR, ARPU, LTV, churn, conversão, clientes ativos/cancelados/teste/pagantes. **Use o `ui-ux-pro-max`** para um dashboard impecável (gráficos, cards, responsivo) e o **Globo Interativo** em 3D dos visitantes.

## Fase 6 — Cron jobs (skill `supabase-cron`)
15. Agende rotinas via pg_cron usando `url`, `anon key`, `service_role` e `token`: backups semanais, agregação de métricas, limpeza de logs, verificação de assinaturas vencendo, monitoramento de saúde.

## Fase 7 — Deploy contínuo
16. GitHub (versionamento) + Vercel (deploy automático do branch principal). Configure as env vars no projeto Vercel correto (atenção a múltiplos projetos ligados ao mesmo repo). Registre o SaaS no painel central (`novos-sistemas-saas/dashboard`).

## Princípios
- **Spec antes do código**; honestidade sobre o que é roadmap.
- **Sem GB**; cobrança por valor.
- **Segredos** nunca no bundle; `service_role` só no backend; `.env`/`config.json` no `.gitignore`.
- **Verificável**: smoke-test (site 200, checkout 401, admin 403, webhook 400, planos legíveis).
