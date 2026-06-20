#!/usr/bin/env node
// Identifica as credenciais Supabase de um projeto a partir do diretório dele.
// Varre arquivos .env* (e supabase/config.toml) procurando URL / anon / service_role.
//   node detect-project.mjs /caminho/do/projeto
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] || process.cwd();
if (!fs.existsSync(root)) {
  console.error(`Diretório não existe: ${root}`);
  process.exit(1);
}

const ENV_KEYS = {
  url: [/SUPABASE_URL/i, /NEXT_PUBLIC_SUPABASE_URL/i, /VITE_SUPABASE_URL/i, /PUBLIC_SUPABASE_URL/i],
  anon: [/SUPABASE_ANON_KEY/i, /NEXT_PUBLIC_SUPABASE_ANON_KEY/i, /VITE_SUPABASE_ANON_KEY/i, /PUBLIC_SUPABASE_ANON_KEY/i],
  service: [/SUPABASE_SERVICE_ROLE/i, /SERVICE_ROLE_KEY/i, /SUPABASE_SERVICE_KEY/i],
};

function walk(dir, depth = 0, acc = []) {
  if (depth > 3) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", ".next", "dist", "build"].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, depth + 1, acc);
    else if (/^\.env/.test(e.name) || e.name === "config.toml") acc.push(full);
  }
  return acc;
}

const found = { url: null, anon: null, service: null, sources: [] };
for (const file of walk(root)) {
  let txt;
  try { txt = fs.readFileSync(file, "utf8"); } catch { continue; }
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*[:=]\s*["']?([^"'#\s]+)/i);
    if (!m) continue;
    const [, key, val] = m;
    for (const [slot, pats] of Object.entries(ENV_KEYS)) {
      if (!found[slot] && pats.some((p) => p.test(key))) {
        found[slot] = val;
        found.sources.push(`${path.relative(root, file)} → ${key}`);
      }
    }
  }
}

if (found.url) {
  try { found.ref = new URL(found.url).hostname.split(".")[0]; } catch {}
}

console.log(JSON.stringify(found, null, 2));
if (!found.url) {
  console.error("\n⚠️  Não achei a URL do Supabase. Informe manualmente (--url) ou verifique o .env.");
  process.exit(2);
}
console.log("\nℹ️  O Personal Access Token (management_token) NÃO fica no .env — peça ao usuário e passe via --token no setup.");
