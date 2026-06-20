---
name: plano-preco
description: Gera um plano de preços SaaS (plano-preco.md) por spec-driven development — analisa o projeto atual e o mercado, define N planos com funcionalidades por plano, preços competitivos em BRL (mensal + anual com 2 meses grátis) e justificativa de mercado. Sem limites por GB.
---

# Plano de Preços (spec-driven)

Esta skill produz um arquivo **`plano-preco.md`** na raiz do projeto, pronto para ser traduzido em `plans.json` da skill `/saas`. Ela segue **spec-driven development**: primeiro entende o produto e o mercado, depois especifica os planos, e só então escreve o documento.

## Quando usar

Quando o usuário disser algo como:

> "Analisar o projeto atual de **[nome-projeto]** e quero transformar em um SaaS. Quero **[N]** planos (ex.: Inicial grátis, Starter, Pro, Enterprise). Coloque valores reais com base no mercado atual, funcionalidades completas por plano, gere em `plano-preco.md`, sem armazenamento em GB, com análise de mercado para ficar competitivo e nada fora da curva."

O usuário define **quantos planos** e **quais tipos**. A skill respeita isso.

## Passo a passo que o Claude executa

1. **Inventário do produto.** Leia o código do projeto (rotas, páginas, componentes, tabelas Supabase, integrações). Liste as **capacidades reais já existentes** e as **planejadas** (roadmap). Não venda o que não existe.
2. **Eixos de cobrança (sem GB).** Escolha limitadores que façam sentido para o domínio — ex.: usuários/assentos, registros ativos, projetos, itens, mensagens de IA, exportações/mês, automações, integrações, nível de suporte, nível de auditoria. **Nunca** limite por GB de armazenamento.
3. **Análise de mercado.** Pesquise (WebSearch quando disponível) 3–5 concorrentes diretos/indiretos, anote faixas de preço públicas e a data da consulta, e conclua uma faixa **competitiva para o Brasil** (BRL), evitando paridade direta em dólar quando o público é nacional. Cite fontes.
4. **Especificação dos planos.** Para cada plano definido pelo usuário:
   - Objetivo comercial (aquisição / conversão / operação / B2B).
   - **Limites** concretos (os eixos do passo 2).
   - **Funcionalidades incluídas** e **restrições** (o que NÃO inclui).
   - Justificativa de preço.
   - CTA sugerido.
5. **Preços.** Mensal em BRL + **anual com 2 meses grátis** (`anual = mensal * 10`) — previsível e competitivo. Plano gratuito útil, mas limitado o suficiente para estimular upgrade. Enterprise/Vitalício quando o usuário pedir (Enterprise = "fale com vendas" por contrato; Vitalício = pagamento único, se aplicável).
6. **Matriz comparativa** de funcionalidades por plano.
7. **Riscos e conformidade.** Seção sobre LGPD, CDC/comércio eletrônico (preço final, renovação, cancelamento, reembolso), e o que **não anunciar** sem implementação (ex.: certificações, SSO, zero-knowledge).
8. **Escreva `plano-preco.md`** seguindo o esqueleto abaixo. Use `template.md` como ponto de partida.

## Esqueleto do `plano-preco.md`

```
# Plano de Preços SaaS — <Produto>
Data da análise: <data>
1. Posicionamento do produto
2. Premissas comerciais (moeda BRL, mensal+anual 2 meses grátis, trial, sem GB)
3. Análise de mercado (concorrentes + fontes + data + conclusão competitiva)
4. Planos recomendados (resumo em tabela: nome | mensal | anual | público)
5. Detalhamento por plano (limites, funcionalidades, restrições, justificativa, CTA)
6. Matriz comparativa de funcionalidades
7. Análise de regularidade e cuidados legais (LGPD, CDC, o que não vender ainda)
8. Recomendação de página de preços (ordem visual, copy, CTA)
9. Roadmap comercial (fases)
10. Conclusão
```

## Regras de qualidade

- **Nada fora da curva**: preços defensáveis, ancorados em concorrentes reais.
- **Honestidade**: marque claramente o que é roadmap ("planejado/em desenvolvimento").
- **Sem GB**: zero limites por armazenamento.
- **Competitivo e local**: BRL, suporte em português, faixas acessíveis ao público-alvo brasileiro.
- O resultado precisa ser **diretamente traduzível** para `plans.json` (slug, name, monthly/yearly, features[], limits{}).

## Integração com a skill `/saas`

Depois de gerar `plano-preco.md`, traduza-o para `plans.json` e rode a skill `/saas`:
- `monthlyPrice`/`yearlyPrice` (yearly = monthly*10), `features` (bullets), `limits` (cotas por plano).
- A `/saas` cria os produtos/preços/webhook no Stripe e aplica o schema/seed no Supabase.

Playbook persistente: este documento é a fonte de verdade dos preços de cada SaaS.
