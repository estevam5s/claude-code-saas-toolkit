---
name: saas
description: Bootstrap completo de billing SaaS (Stripe + Supabase). Cria produtos/preços e webhook no Stripe, aplica o schema de planos/assinaturas/eventos no Supabase e semeia os planos já com os price IDs. Use quando o usuário quiser "configurar pagamentos/Stripe", "criar os planos", "configurar o webhook", "deixar o billing pronto no Supabase" ou montar a base de assinaturas de um novo SaaS. O usuário coloca a API key da Stripe e o token do Supabase em config.json; o Claude roda os scripts.
---

# SaaS — Bootstrap de billing (Stripe + Supabase)

Configura **do zero** a infraestrutura de assinaturas de um SaaS:

1. **Stripe** — cria 1 produto por plano, os preços (mensal/anual/vitalício) e o **webhook endpoint** (devolvendo o `whsec_…`).
2. **Supabase** — aplica o schema (`plans`, `subscriptions`, `payment_events` + RLS + triggers) via Management API e **semeia os planos** já com os `price_…` gerados.
3. Imprime as **variáveis de ambiente** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`) para colar no Vercel/host.

Baseado numa implementação **testada live e2e** (trial 7d → sync de assinatura + eventos idempotentes). Os endpoints serverless prontos estão em `templates/api/`.

## Pré-requisitos (o usuário fornece)

Copie `config.example.json` → `config.json` e preencha. **`config.json` é gitignored — nunca é commitado.**

- `stripe.accounts` — **multi-conta** (recomendado): mapa `{ "<nome>": { label, secretKey, publishableKey, mode } }` + `stripe.defaultAccount`. Cada chave pode ser `sk_live_…`/`sk_test_…` ou **restricted** `rk_live_…` (precisa de **write** em Products, Prices, Webhook Endpoints, Customers, Checkout Sessions, Coupons). Compatível com o formato antigo de conta única `stripe.secretKey`.

### Múltiplas contas Stripe (separar empresas)

Defina cada empresa em `stripe.accounts` e escolha qual usar:

```bash
node scripts/verify.mjs                            # usa stripe.defaultAccount
node scripts/setup-stripe.mjs --account=linkium    # usa a conta "linkium"
SAAS_ACCOUNT=linkium node scripts/run-all.mjs       # via variável de ambiente
```

**Transparência obrigatória:** todo script imprime no início **qual conta e qual chave (mascarada)** está usando — ex.: `🏦 Conta Stripe: Linkium (empresa nova) [linkium] · TEST 🧪`. Ao operar pelo `/saas`, **sempre diga ao usuário qual conta e qual chave serão usadas antes de criar produtos/cobranças**, distinguindo **LIVE** de **TEST**.

- `supabase.accessToken` — Personal Access Token do Supabase (`sbp_…`), em https://supabase.com/dashboard/account/tokens.
- `supabase.projectRef` — o ref do projeto (ex.: `jiszhmiavuxfdoxsyewm`), na URL do dashboard.
- `siteUrl` — URL pública do app (ex.: `https://meu-saas.vercel.app`) — usada no `return_url`/`webhook`.

Defina os planos em `plans.json` (copie de `plans.example.json`): nome, preços, `features` (bullets do pricing) e `limits` (cotas por plano).

## Como o Claude executa (ordem)

```bash
cd .claude/skills/saas

# 0. Validar credenciais e escopos (recomendado antes de tudo)
node scripts/verify.mjs

# 1. Stripe: cria produtos, preços e webhook. Gera plans.generated.json + webhook secret.
node scripts/setup-stripe.mjs

# 2. Supabase: aplica schema + semeia planos (usa plans.generated.json).
node scripts/setup-supabase.mjs

# (ou tudo de uma vez)
node scripts/run-all.mjs
```

### O que cada script faz

- **`verify.mjs`** — testa a Stripe key (`GET /v1/account`) e o token Supabase (`GET /v1/projects/{ref}`); reporta escopos faltantes.
- **`setup-stripe.mjs`** — idempotente por `metadata.plan_slug`: reusa produto existente, cria preços que faltam, cria/atualiza o webhook em `{siteUrl}{webhook.path}`. Escreve os IDs em `plans.generated.json` e imprime o `STRIPE_WEBHOOK_SECRET`.
- **`setup-supabase.mjs`** — roda `scripts/schema.sql` e o seed dos planos via `POST /v1/projects/{ref}/database/query`. Cria `is_admin()`/`touch_updated_at()` se não existirem; só liga o sync com `profiles` se a tabela existir.
- **`run-all.mjs`** — encadeia verify → stripe → supabase e imprime o resumo de env vars.

## Depois de rodar

1. Cole no host (Vercel) as env vars impressas: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `VITE_SITE_URL`.
2. Copie `templates/api/*.js` para o `/api` do seu projeto (Vercel serverless, ESM) — checkout, portal, subscription, webhook.
3. No frontend, chame `POST /api/checkout` com `{ plan_slug, cycle }` e redirecione para a `url` retornada.

## Segurança

- `config.json`, `plans.generated.json` e qualquer `.env` ficam no `.gitignore` da skill. **Nunca commite chaves.**
- Use **restricted keys** sempre que possível e **rotacione** se a chave for exposta.
- O `SERVICE_ROLE` do Supabase só deve viver no backend/host (nunca no bundle do frontend).

## Fluxo SaaS completo (end-to-end)

Esta skill cobre o bootstrap técnico (Stripe + Supabase). Para **transformar um projeto inteiro em SaaS**, use o comando `/saas` (em `.claude/commands/saas.md`), que orquestra:

1. **Fonte dos planos:** analise/gere um **`plano-preco.md`** na raiz do projeto — 5 planos (Inicial grátis, Starter, Pro [destaque], Enterprise, Vitalício), **mensal + anual com -20%** (`anual = round(mensal*12*0.8)`), funcionalidades específicas por plano, **sem armazenamento em GB**, e uma **análise de mercado** (concorrentes + justificativa de preço). Traduza para `plans.json`.
2. **Histórico:** leia `doc/historico.txt` (se existir) para entender o estado do projeto antes de mudar.
3. **Stripe:** `setup-stripe.mjs` cria produtos + preços (mensal/anual/vitalício) + webhook. Checkout com **trial de 7 dias** (já em `templates/api/checkout.js`, `TRIAL_DAYS`).
4. **Supabase:** `setup-supabase.mjs` aplica schema (inclui `cancellation_feedback`) + seed.
5. **Fluxo do usuário:** signup → **dashboard** → **banner de escolha de plano** (toggle mensal/anual, selo -20%) → **checkout Stripe** → **webhook ativa o plano** → **gating** (grátis = limitado).
6. **Gestão de assinatura** (`templates/api/subscription.js` já implementa): upgrade imediato (proração), downgrade agendado (subscription schedule), cancelar/reativar, consultar; **cancelar conta com tela de feedback** (`reason`+`comment` → `cancellation_feedback`, visível no admin); **reembolso em até 7 dias**.
7. **Teste real do webhook** com a Stripe (checkout/trial → sincroniza `subscriptions` + `payment_events`).

## Reaproveitar em outro SaaS

Cada projeto tem seu próprio `config.json` + `plans.json` + `plano-preco.md`. Rode `/saas [nome-projeto]` apontando para o projeto desejado; a skill é genérica e não assume schema prévio além de `auth.users`. Playbook persistente: [[saas-bootstrap-playbook]].
