# supabase-cron — skill do Claude Code

Configura **cron jobs (pg_cron)** num projeto **Supabase**, criando uma tabela simples de
registro das jobs (`cron_job_registry`) + uma de execuções (`cron_log`), e agendando tudo
via **Management API**. Pensada para ser usada pelo Claude Code, mas os scripts rodam soltos também.

## Instalação

**Já instalada** se este diretório está em `~/.claude/skills/supabase-cron/`.

Para instalar a partir do GitHub:
```bash
git clone https://github.com/estevam5s/claude-skill-supabase-cron.git \
  ~/.claude/skills/supabase-cron
```
Reinicie o Claude Code (ou rode `/skills`) e a skill **supabase-cron** aparece.

Requisitos: Node 18+ (usa `fetch` nativo). Sem dependências externas.

## Uso pelo Claude

Peça em linguagem natural, ex.:
- "Usa a skill supabase-cron pra agendar os crons nesse projeto" (e aponte o diretório)
- "Lista os cron jobs do Supabase"
- "Remove o job meuapp_daily_backup"

O Claude vai pedir o **PAT** (token `sbp_...`), a **URL** do projeto, a **anon key** e a
**service_role** — ou detectar URL/anon/service a partir do `.env` do diretório que você indicar.

## Uso manual (CLI)

```bash
# detectar credenciais a partir de um projeto
node scripts/detect-project.mjs /caminho/do/projeto

# configurar (cria tabelas + agenda os 10 jobs padrão)
node scripts/setup.mjs --token sbp_xxx --url https://REF.supabase.co \
  --anon eyJ... --service eyJ... --prefix meuapp_

# usar um conjunto próprio de jobs
node scripts/setup.mjs --jobs ./meus-jobs.json

# verificar
node scripts/list.mjs

# remover
node scripts/remove.mjs meuapp_daily_backup
node scripts/remove.mjs --all
```

## Formato de um job (`jobs/*.json`)

```json
{
  "jobs": [
    {
      "num": 1,
      "name": "daily_backup",
      "schedule": "0 4 * * *",
      "description": "backup automático",
      "sql": "insert into {{LOG}}(num, job_name, description) values (8, '{{PREFIX}}daily_backup', 'backup')"
    }
  ]
}
```
- `{{LOG}}` é substituído pela tabela de log (`public.cron_log`).
- `{{PREFIX}}` é o prefixo passado em `--prefix`.
- `schedule` é uma expressão cron padrão (5 campos).
- O `sql` pode ser qualquer SQL (chamar funções, `net.http_post`, etc.).

## Segurança
`config.json` (com seus tokens) é **gitignorado**. Nunca faça commit dele.
