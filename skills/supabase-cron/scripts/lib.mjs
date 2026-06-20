// Helpers compartilhados: config + Supabase Management API.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CONFIG_PATH = path.join(SKILL_DIR, "config.json");

export function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`config.json não encontrado em ${CONFIG_PATH}. Rode o setup com as credenciais primeiro.`);
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  if (!cfg.management_token) throw new Error("config.json sem management_token (PAT do Supabase).");
  if (!cfg.project_url) throw new Error("config.json sem project_url.");
  cfg.ref = cfg.ref || refFromUrl(cfg.project_url);
  return cfg;
}

export function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + "\n");
}

export function refFromUrl(url) {
  try {
    const host = new URL(url).hostname; // <ref>.supabase.co
    return host.split(".")[0];
  } catch {
    return null;
  }
}

// Executa SQL arbitrário via Management API (/database/query).
export async function runSQL(cfg, query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${cfg.ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.management_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok || (data && data.message)) {
    throw new Error(`SQL falhou (${res.status}): ${data?.message || text}`);
  }
  return data;
}

// String SQL escapada com aspas simples.
export const sqlLit = (s) => `'${String(s).replace(/'/g, "''")}'`;
