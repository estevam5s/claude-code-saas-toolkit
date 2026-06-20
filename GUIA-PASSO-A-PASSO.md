# Guia passo a passo — Spec-Driven para transformar projetos em SaaS

Este guia mostra **como usar o toolkit** em 4 situações diferentes de ponto de partida:

- **Cenário A** — você já tem **sistema (dashboard) + site**.
- **Cenário B** — você só tem o **site**.
- **Cenário C** — você só tem o **dashboard**.
- **Cenário D** — você **não tem nada** ainda.

> O fluxo é sempre o mesmo (especificar → billing → segurança → site/admin → cron → deploy). O que muda é **quanto** o Claude precisa **construir do zero** em cada cenário.

---

## Passo 0 — Pré-requisitos (todos os cenários)

1. **Instale as skills** (copie as pastas de `skills/` para `~/.claude/skills/` ou `.claude/skills/` do projeto):
   - `plano-preco`, `saas`, `seguranca-informacao`, `supabase-cron`.
2. **Crie uma conta/projeto no Supabase** e pegue: `url`, `anon key`, `service_role key`, `token (sbp_…)`.
3. **Conta Stripe** (modo live ou test) e a `secret/restricted key` (`sk_live`/`rk_live`).
4. **Decida os planos** (ex.: "Inicial grátis, Starter, Pro, Enterprise") e o **e-mail/senha do admin**.
5. **Vercel** conectada ao GitHub (deploy contínuo).

Tenha à mão (o Claude vai pedir):
```
Supabase: url / anon key / service_role key / token
Stripe:   secret key
Planos:   quantos e quais
Admin:    email + senha
siteUrl:  https://meu-saas.vercel.app
```

---

## Cenário A — Já tenho sistema + site

O Claude **aproveita** o que existe e só adiciona a camada SaaS.

1. **Aponte o Claude ao projeto e ao spec mestre:**
   > "Use o `spec-driven-development.md`. Já tenho sistema e site no diretório `X`. Transforme em SaaS. Dados do Supabase: … Stripe: … Planos: Inicial/Starter/Pro/Enterprise. Admin: …"
2. **Fase 0 (spec):** o Claude faz o inventário das rotas/tabelas existentes e documenta capacidades reais.
3. **Fase 1 (plano-preco):** gera `plano-preco.md` analisando **o seu sistema** + mercado, e traduz para `plans.json`.
4. **Fase 2 (saas):** `verify → setup-stripe → setup-supabase`. Cria produtos/preços/**webhook** e aplica schema + RLS + seed. Copia `/api/*`.
5. **Reaproveite a auth existente:** o Claude **repõe o Supabase** (env) e liga o `useSubscription`/gating no seu dashboard atual, adiciona a rota **"Meu plano"** (pagar/upgrade/downgrade/cancelar/reembolso) e a de **suporte**.
6. **Fase 3 (segurança):** aplica rate-limit, CORS, headers, signup-check, brute-force, RBAC no painel admin.
7. **Fase 4/5:** ajusta o site (home/sobre/preço/changelog/contato + SEO/OG) e monta/integra o **admin (18 módulos)**.
8. **Fase 6 (cron) + Fase 7 (deploy):** agenda rotinas e faz GitHub + Vercel.

> Cuidado clássico: se o repo estiver ligado a **mais de um projeto Vercel**, configure as env vars no projeto correto.

---

## Cenário B — Só tenho o site

Falta **todo o produto/dashboard + billing**.

1. Comece igual ao Cenário A (Passo 0 + apontar o spec).
2. **Fase 1:** gere o `plano-preco.md` com base na **proposta do site** (o que ele promete).
3. **Fase 2 (saas):** billing + schema no Supabase.
4. **Construa o dashboard do usuário** (o Claude cria): onboarding (escolher plano) → painel com os recursos do produto, **gating freemium**, "Meu plano", suporte, conta (histórico de pagamentos, cancelar conta com feedback).
5. **Auth** no design do `login.md`; cadastro com nome/email/senha/confirmar + validações.
6. **Fase 3–7:** segurança, admin, SEO no site existente, cron, deploy.

> Resultado: o site passa a ter **login → dashboard funcional → assinatura**.

---

## Cenário C — Só tenho o dashboard

Falta o **site institucional + billing**.

1. Passo 0 + apontar o spec.
2. **Fase 1–2:** plano-preco + billing/banco.
3. **Ligue o billing ao dashboard atual:** repor Supabase, `useSubscription`, gating, "Meu plano", suporte.
4. **Construa o site institucional** (o Claude cria): **home, sobre, preço (design `price.md`), changelog, contato**, com botão "ir ao dashboard" quando logado e "criar conta/login" quando não. **SEO/OG completo**.
5. **Fase 3, 5–7:** segurança, admin, cron, deploy.

> Resultado: o dashboard ganha uma **vitrine pública + planos + assinatura**.

---

## Cenário D — Não tenho nada

O Claude constrói **tudo do zero**.

1. **Defina a ideia** e o stack (recomendado: Vite+React+shadcn **ou** Next.js + Supabase + Stripe).
2. Passo 0 (credenciais + planos).
3. **Fase 0 (spec):** o Claude escreve a especificação do produto (entidades, rotas, fluxos) antes de codar.
4. **Fase 1:** `plano-preco.md` por análise de mercado.
5. **Fase 2:** scaffolding do projeto + billing/banco (saas).
6. **Construir:** site institucional + auth (`login.md`) + dashboard do usuário + **admin 18 módulos**.
7. **Fase 3 (segurança), 6 (cron), 7 (deploy):** endurecimento, rotinas e GitHub + Vercel.

> Resultado: um SaaS completo, do zero ao deploy.

---

## Checklist de aceitação (todos os cenários)

Ao final, valide (smoke-test):

- [ ] Site público responde `200`; `/price` mostra os planos do banco.
- [ ] Cadastro cria sessão e leva ao dashboard (freemium); "onde nos encontrou" salvo.
- [ ] `/api/checkout` → `401` sem login; `/api/webhook` → `400` sem assinatura; `/api/admin` → `403` sem ser admin.
- [ ] Checkout real ativa o plano via webhook; **cobrança recorre** no próximo ciclo.
- [ ] Usuário gerencia o plano: upgrade (proração), downgrade (agendado), cancelar/reativar, **reembolso até 7 dias**, cancelar conta com **feedback** (visível no admin).
- [ ] Usuário comum **não** acessa `/admin`; rate-limit, CORS, headers e RLS ativos.
- [ ] Plano grátis **limitado** (cotas por plano no banco).
- [ ] Deploy automático GitHub → Vercel; env vars no projeto certo.

---

## Dica de prompt (copie e ajuste)

```
Use o spec-driven-development.md deste toolkit.
Cenário: [A/B/C/D]. Projeto em: [caminho ou "criar do zero"].
Supabase → url: ...  anon: ...  service_role: ...  token: sbp_...
Stripe → secret key: ...
Planos: Inicial (grátis), Starter, Pro, Enterprise.  Admin: email/senha: ...
siteUrl: https://....vercel.app
Siga as fases 0→7, gere plano-preco.md antes, e faça smoke-test no final.
```
