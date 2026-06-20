#!/usr/bin/env node
// Lista os jobs agendados (cron.job), o registry e as últimas execuções (log).
import { loadConfig, runSQL } from "./lib.mjs";

const cfg = loadConfig();
const LOG = `public.${cfg.log_table || "cron_log"}`;

console.log(`\n=== Jobs agendados no pg_cron (projeto ${cfg.ref}) ===`);
const jobs = await runSQL(cfg, "select jobid, jobname, schedule, active from cron.job order by jobname;");
if (Array.isArray(jobs) && jobs.length) {
  for (const j of jobs) console.log(`  [${j.active ? "on " : "off"}] ${j.jobname}  ${j.schedule}`);
} else {
  console.log("  (nenhum)");
}

console.log(`\n=== Últimas execuções (${cfg.log_table || "cron_log"}) ===`);
try {
  const logs = await runSQL(cfg, `select job_name, description, ran_at from ${LOG} order by ran_at desc limit 15;`);
  if (Array.isArray(logs) && logs.length) {
    for (const l of logs) console.log(`  ${l.ran_at}  ${l.job_name}  — ${l.description ?? ""}`);
  } else {
    console.log("  (sem execuções ainda — os jobs rodam conforme o agendamento)");
  }
} catch (e) {
  console.log(`  (log indisponível: ${e.message})`);
}
console.log("");
