# Skill `saas` — Bootstrap de billing (Stripe + Supabase)

Skill do Claude Code que configura, do zero, a infraestrutura de assinaturas de um SaaS:

- **Stripe** — cria 1 produto por plano, os preços (mensal / anual / vitalício) e o **webhook endpoint**.
- **Supabase** — aplica o schema (`plans`, `subscriptions`, `payment_events`, `cancellation_feedback` + RLS + triggers) via Management API e **semeia os planos** com os `price_…` gerados.
- **Endpoints serverless prontos** (`templates/api/`) — checkout, portal, subscription, webhook.

Baseada numa implementação **testada live e2e** (trial 7 dias → sincronização de assinatura + eventos idempotentes).

## Estrutura

```
.claude/skills/saas/
├── SKILL.md                 # instruções para o Claude (fluxo end-to-end)
├── config.example.json      # copie para config.json e preencha (Stripe key + Supabase token)
├── plans.example.json       # modelo de planos (slug, preços, features, limits)
├── scripts/
│   ├── lib.mjs              # helpers (config, Stripe form-encode, Supabase Mgmt API)
│   ├── verify.mjs           # valida chaves e escopos
│   ├── setup-stripe.mjs     # cria produtos + preços + webhook (idempotente)
│   ├── setup-supabase.mjs   # aplica schema + seed dos planos
│   ├── schema.sql           # schema de billing genérico (idempotente)
│   └── run-all.mjs          # verify → stripe → supabase
└── templates/api/           # checkout, portal, subscription, webhook, _lib (ESM/Vercel)
```

## Pré-requisitos

1. Copie `config.example.json` → `config.json` (gitignored) e preencha:
   - `stripe.secretKey` — `sk_live_…`/`sk_test_…` ou **restricted key** `rk_live_…` (precisa de write em Products, Prices, Webhook Endpoints, Customers, Checkout, Coupons).
   - `supabase.accessToken` — Personal Access Token (`sbp_…`).
   - `supabase.projectRef` — ref do projeto.
   - `siteUrl` — URL pública do app.
2. Defina os planos em `plans.json` (copie de `plans.example.json`).

> **Nunca** commite `config.json` nem chaves reais. O `.gitignore` da skill já cobre `config.json`, `plans.json` e `plans.generated.json`.

## Uso

```bash
cd .claude/skills/saas
node scripts/verify.mjs          # 0. valida credenciais/escopos
node scripts/setup-stripe.mjs    # 1. Stripe: produtos + preços + webhook (gera plans.generated.json)
node scripts/setup-supabase.mjs  # 2. Supabase: schema + seed
# ou tudo de uma vez:
node scripts/run-all.mjs
```

Depois: cole as env vars impressas no host (Vercel) e copie `templates/api/*.js` para o `/api` do projeto.

## Requisitos técnicos

- Node ≥ 18 (usa `fetch` nativo).
- Acesso à API da Stripe e ao Supabase Management API.

Veja o `SKILL.md` para o fluxo SaaS completo (planos, gating, gestão de assinatura, trial, reembolso) e o comando `/saas` (`.claude/commands/saas.md`) que orquestra tudo.
