---
name: supabase-cron
description: Configura cron jobs (pg_cron) num projeto Supabase. Use quando o usuário pedir para agendar/instalar cron jobs no Supabase, espelhar um diretório de crons, criar a tabela de log/registro de jobs, ou listar/remover jobs agendados. Pede token (PAT), URL do projeto, anon key e service_role — ou detecta a partir do diretório do projeto.
---

# Supabase Cron

Agenda jobs recorrentes diretamente no Postgres do Supabase usando a extensão **pg_cron**,
aplicando tudo via **Management API** (`/v1/projects/{ref}/database/query`). Cria duas tabelas:
`cron_job_registry` (registro simples das cron jobs) e `cron_log` (execuções).

## Quando usar
- "configura os cron jobs no Supabase", "agenda esses crons", "instala o cron de backup diário"
- "espelha o diretório cron/ no Supabase"
- "lista/remove os jobs agendados", "mostra o log das crons"

## Passo a passo (o que o Claude deve fazer)

### 1. Obter as credenciais
São necessárias 4 informações. **Pergunte ao usuário** (ou detecte):

| Credencial | Para quê | De onde |
|---|---|---|
| `management_token` (PAT, começa com `sbp_`) | agendar via Management API | **só o usuário tem** — peça (supabase.com/dashboard/account/tokens) |
| `project_url` (`https://<ref>.supabase.co`) | derivar o ref do projeto | .env do projeto ou usuário |
| `anon_key` | jobs/integrações que chamam a REST | .env do projeto |
| `service_role` | idem (operações privilegiadas) | .env do projeto |

**Detecção automática (opcional):** se o usuário informar o diretório do projeto Supabase, rode:
```
node ~/.claude/skills/supabase-cron/scripts/detect-project.mjs <dir-do-projeto>
```
Isso varre os `.env*` e devolve `url`/`anon`/`service`/`ref`. O **PAT não fica no .env** — peça ao usuário.

### 2. Definir os jobs
Por padrão usa `jobs/default-jobs.json` (10 jobs: heartbeat 6h, backup diário, fila 10min,
sync horário, relatório semanal, fechamento mensal, limpeza, backup, reindex, lote 3x/dia).
Para outro conjunto, crie um JSON no mesmo formato e passe `--jobs <arquivo>`.
Use `--prefix <slug>_` para namespacar os jobs por projeto (ex.: `pytrack_`).

> Antes de agendar a partir de um diretório de crons existente (ex.: `cron/scripts` + `supabase-cron.sql`),
> **leia esses arquivos** para entender o padrão e, se preciso, gere um `jobs.json` equivalente.

### 3. Configurar (cria tabelas + agenda)
```
node ~/.claude/skills/supabase-cron/scripts/setup.mjs \
  --token sbp_xxx --url https://REF.supabase.co \
  --anon eyJ... --service eyJ... --prefix meuapp_
```
(rodadas seguintes podem omitir as flags — ele reusa o `config.json`).

### 4. Verificar
```
node ~/.claude/skills/supabase-cron/scripts/list.mjs
```

### Remover
```
node ~/.claude/skills/supabase-cron/scripts/remove.mjs <job_name>   # um
node ~/.claude/skills/supabase-cron/scripts/remove.mjs --all        # todos
```

## Notas
- `config.json` guarda as credenciais e é **gitignorado** — nunca faça commit dele.
- pg_cron precisa estar disponível no projeto (planos pagos/recentes já têm; o setup roda `create extension if not exists pg_cron`).
- Os jobs do template apenas registram execução em `cron_log`. Para um job "de verdade",
  edite o `sql` do job (pode chamar funções, `net.http_post` para webhooks, etc.).
