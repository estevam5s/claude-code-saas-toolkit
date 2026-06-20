# INTAKE — Questionário do Spec-Driven (o Claude pergunta antes de construir)

Quando o usuário pedir para usar o spec-driven, o Claude **faz estas perguntas** (agrupadas, usando `AskUserQuestion` quando ajudar), confirma um resumo e só então executa as Fases 1→7. Não comece a construir sem isso.

## 1. Ponto de partida
- [ ] Já tenho **sistema + site**
- [ ] Só tenho o **site**
- [ ] Só tenho o **dashboard**
- [ ] **Não tenho nada** (criar do zero)
- Caminho do projeto (ou "criar do zero"): ______

## 2. Stack & infra
- Stack: **Vite+React+shadcn** ou **Next.js**?
- Repositório GitHub (existe? nome): ______
- Projeto Vercel (existe? nome / domínio): ______ — ⚠️ se o repo estiver ligado a mais de um projeto Vercel, qual é o canônico?

## 3. Credenciais (`.env`)
- O `.env` já está preenchido? (`.env.example` → `.env`)
- Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`, `SUPABASE_ACCESS_TOKEN`
- Stripe: `STRIPE_SECRET_KEY`

## 4. Produto
- O que o produto faz e para quem (público-alvo)?
- Entidades principais (ex.: alunos/turmas, pets/tutores, projetos/links, itens…)?
- Quais recursos existem hoje × quais são roadmap?

## 5. Planos & preços
- Quantos planos e quais nomes? (ex.: Inicial grátis, Starter, Pro, Enterprise)
- Tem plano **grátis**? Tem **Enterprise** (contrato) e/ou **Vitalício**?
- Eixos de cobrança (sem GB): usuários, registros ativos, projetos, IA/mês, exportações…?
- Quais recursos liberar no grátis × pago?
- Moeda/idioma (padrão pt-BR/BRL)?

## 6. Identidade & UX (plugin UI/UX Pro Max)
- Cor primária e tom (sóbrio / divertido / corporativo)?
- Modo claro/escuro (um ou ambos)?
- Quer uma **seção 3D** (hero com three/react-three-fiber)? Nível de animação (sutil/médio/intenso)?
- Referências visuais (links/prints)?

## 7. Administração & operação
- E-mail e senha do **admin principal**.
- Domínio canônico e nome do app.
- Integrações extras (e-mail/SMTP, Telegram, Analytics, etc.)?

## 8. Confirmação
Resuma tudo em uma lista curta e pergunte: **"Posso seguir com as Fases 1→7?"** Só então construa.

---

### Saída esperada do intake
Um bloco de decisões que alimenta:
- `plano-preco.md` (Fase 1) → `plans.json`
- `.env` (Fase 2)
- design system + uso do `ui-ux-pro-max` (Fases 4–5)
- checklist de segurança (Fase 3) e cron (Fase 6)
- alvo de deploy GitHub/Vercel (Fase 7)
