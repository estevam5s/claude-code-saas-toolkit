#!/usr/bin/env node
// Configura tudo no Supabase: cria as tabelas (registry + log), habilita pg_cron
// e agenda os jobs. Lê config.json (ou aceita flags para gravá-lo antes).
//
// Uso:
//   node setup.mjs                              # usa config.json existente
//   node setup.mjs --token PAT --url URL \
//        --anon ANON --service SR [--prefix pytrack_] [--jobs caminho.json]
//
import fs from "node:fs";
import path from "node:path";

import { SKILL_DIR, CONFIG_PATH, loadConfig, saveConfig, refFromUrl, runSQL, sqlLit } from "./lib.mjs";

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

// 1) Monta/atualiza config.json se vierem flags.
let cfg;
const token = arg("token");
if (token) {
  const url = arg("url");
  if (!url) throw new Error("--url é obrigatório junto com --token");
  cfg = {
    management_token: token,
    project_url: url,
    ref: refFromUrl(url),
    anon_key: arg("anon", ""),
    service_role: arg("service", ""),
    prefix: arg("prefix", ""),
    log_table: arg("log-table", "cron_log"),
    registry_table: arg("registry-table", "cron_job_registry"),
  };
  saveConfig(cfg);
  console.log(`✓ Credenciais gravadas em ${CONFIG_PATH}`);
} else {
  cfg = loadConfig();
  cfg.prefix = arg("prefix", cfg.prefix || "");
  cfg.log_table = cfg.log_table || "cron_log";
  cfg.registry_table = cfg.registry_table || "cron_job_registry";
}

const LOG = `public.${cfg.log_table}`;
const REG = `public.${cfg.registry_table}`;
const PREFIX = cfg.prefix || "";

// 2) Carrega os jobs.
const jobsPath = arg("jobs", path.join(SKILL_DIR, "jobs", "default-jobs.json"));
const { jobs } = JSON.parse(fs.readFileSync(jobsPath, "utf8"));
console.log(`→ ${jobs.length} job(s) de ${path.relative(process.cwd(), jobsPath)} · prefix="${PREFIX}" · projeto=${cfg.ref}`);

// 3) Extensão + tabelas (registry simples para armazenar as cron jobs).
const ddl = `
create extension if not exists pg_cron;
create table if not exists ${LOG} (
  id bigint generated always as identity primary key,
  num int, job_name text not null, description text,
  ran_at timestamptz not null default now()
);
alter table ${LOG} enable row level security;
create table if not exists ${REG} (
  job_name text primary key,
  num int,
  schedule text not null,
  description text,
  sql text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table ${REG} enable row level security;`;
await runSQL(cfg, ddl);
console.log(`✓ Extensão pg_cron + tabelas ${cfg.log_table} / ${cfg.registry_table} prontas.`);

// 4) Agenda cada job + grava no registry.
let ok = 0;
for (const j of jobs) {
  const jobName = `${PREFIX}${j.name}`;
  const body = j.sql.replaceAll("{{LOG}}", LOG).replaceAll("{{PREFIX}}", PREFIX);
  const schedSql = `select cron.unschedule(${sqlLit(jobName)}) where exists (select 1 from cron.job where jobname = ${sqlLit(jobName)});
select cron.schedule(${sqlLit(jobName)}, ${sqlLit(j.schedule)}, $job$ ${body} $job$);
insert into ${REG}(job_name, num, schedule, description, sql, active)
  values (${sqlLit(jobName)}, ${j.num ?? "null"}, ${sqlLit(j.schedule)}, ${sqlLit(j.description ?? "")}, ${sqlLit(body)}, true)
  on conflict (job_name) do update set schedule=excluded.schedule, description=excluded.description, sql=excluded.sql, active=true, updated_at=now();`;
  try {
    await runSQL(cfg, schedSql);
    console.log(`  ✓ ${jobName}  [${j.schedule}]  ${j.description ?? ""}`);
    ok++;
  } catch (e) {
    console.error(`  ✗ ${jobName}: ${e.message}`);
  }
}

console.log(`\n✅ Concluído: ${ok}/${jobs.length} jobs agendados no projeto ${cfg.ref}.`);
console.log(`   Verifique com: node ${path.relative(process.cwd(), path.join(SKILL_DIR, "scripts", "list.mjs"))}`);
