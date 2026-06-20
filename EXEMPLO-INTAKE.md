# Exemplo de INTAKE preenchido — caso ponta a ponta

Exemplo real de como um intake fica respondido, para o Claude seguir direto às Fases 1→7.
Cenário fictício: **"EstudaFácil"** — plataforma para professores de reforço gerenciarem alunos e simulados.

## 1. Ponto de partida
- [x] Só tenho o **dashboard** (falta site institucional + billing).
- Caminho do projeto: `~/projetos/estudafacil`

## 2. Stack & infra
- Stack: **Vite + React + shadcn**.
- GitHub: `estevam5s/estudafacil` (existe).
- Vercel: projeto `estudafacil` · domínio canônico `https://estudafacil.vercel.app` (1 projeto só).

## 3. Credenciais (`.env` já preenchido)
```
APP_NAME=estudafacil
SITE_URL=https://estudafacil.vercel.app
STRIPE_SECRET_KEY=rk_live_•••• (no .env, não aqui)
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_ANON_KEY=eyJ•••• 
SUPABASE_SERVICE_ROLE=eyJ•••• 
SUPABASE_ACCESS_TOKEN=sbp_••••
ADMIN_EMAIL=contato@estevamsouza.com.br
ADMIN_PASSWORD=•••• (no .env)
ALLOWED_ORIGINS=https://estudafacil.vercel.app,http://localhost:5173
```

## 4. Produto
- O que faz: professores cadastram alunos, montam simulados, acompanham desempenho.
- Para quem: professores de reforço e cursinhos pequenos.
- Entidades: `professores`, `alunos`, `turmas`, `simulados`, `resultados`.
- Hoje existe: dashboard com alunos/turmas/simulados. Roadmap: relatórios avançados, certificados.

## 5. Planos & preços
- 4 planos: **Inicial (grátis)**, **Starter**, **Pro** (destaque), **Enterprise** (contrato).
- Eixos (sem GB): alunos ativos, turmas, simulados/mês, relatórios, suporte.
- Grátis: até 15 alunos, 1 turma, 2 simulados/mês. Pago libera mais + relatórios + suporte prioritário.
- Moeda/idioma: BRL / pt-BR. Anual = 2 meses grátis.

## 6. Identidade & UX (UI/UX Pro Max)
- Cor primária: índigo (#4f46e5). Tom: corporativo-amigável.
- Modo claro **e** escuro.
- Seção 3D: **sim** — hero com um globo/partículas (react-three-fiber), animação **média**.
- Referências: linear.app, vercel.com (clean, com profundidade).

## 7. Administração & operação
- Admin principal: `contato@estevamsouza.com.br` / (senha no `.env`).
- Domínio canônico: `estudafacil.vercel.app`. Nome do app: EstudaFácil.
- Integrações extras: e-mail transacional (depois), Google Analytics no site.

## 8. Confirmação
> Resumo: Cenário C (só dashboard) · Vite+shadcn · 4 planos BRL (anual 2 meses grátis) · índigo claro+escuro com hero 3D · admin contato@estevamsouza.com.br · deploy `estudafacil` na Vercel.
> **Posso seguir com as Fases 1→7?** → (usuário: "sim")

## O que o Claude faz a seguir (Fases 1→7, resumido)
1. **plano-preco** → gera `plano-preco.md` (mercado: Kahoot/Classroom/etc.) → `plans.json`.
2. **/saas** lê o `.env` → cria produtos/preços/webhook no Stripe + schema/RLS/seed no Supabase + admin.
3. **seguranca-informacao** → rate-limit, CORS, headers, signup-check (IP/e-mail), brute force, RBAC.
4. **UI/UX Pro Max** → constrói o **site institucional** (home/sobre/preço/changelog/contato) com hero 3D + SEO/OG; aplica design system ao dashboard.
5. Painel **admin 18 módulos**.
6. **supabase-cron** → backups semanais + métricas + limpeza de logs.
7. **GitHub + Vercel** (deploy contínuo) + smoke-test do checklist.
