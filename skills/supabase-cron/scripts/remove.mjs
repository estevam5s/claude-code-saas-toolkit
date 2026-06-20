#!/usr/bin/env node
// Remove (unschedule) um job pelo nome, ou todos com --all.
//   node remove.mjs <job_name>
//   node remove.mjs --all
import { loadConfig, runSQL, sqlLit } from "./lib.mjs";

const cfg = loadConfig();
const REG = `public.${cfg.registry_table || "cron_job_registry"}`;
const all = process.argv.includes("--all");
const name = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;

if (!all && !name) {
  console.error("Uso: node remove.mjs <job_name> | --all");
  process.exit(1);
}

if (all) {
  const jobs = await runSQL(cfg, "select jobname from cron.job;");
  for (const j of jobs) {
    await runSQL(cfg, `select cron.unschedule(${sqlLit(j.jobname)});`);
    console.log(`  ✓ removido ${j.jobname}`);
  }
  await runSQL(cfg, `update ${REG} set active=false, updated_at=now();`);
  console.log(`✅ ${jobs.length} job(s) removidos.`);
} else {
  await runSQL(cfg, `select cron.unschedule(${sqlLit(name)});`);
  await runSQL(cfg, `update ${REG} set active=false, updated_at=now() where job_name=${sqlLit(name)};`);
  console.log(`✅ Job ${name} removido.`);
}
