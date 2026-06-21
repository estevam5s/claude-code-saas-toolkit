// Orquestra: verify → stripe → supabase, num único comando.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
// repassa flags extras (ex.: --account=linkium) aos sub-scripts; SAAS_ACCOUNT já é herdado
const passthru = process.argv.slice(2)
const run = (script) => {
  console.log(`\n========== ${script} ==========`)
  const r = spawnSync(process.execPath, [join(HERE, script), ...passthru], { stdio: 'inherit' })
  if (r.status !== 0) { console.error(`\n❌ ${script} falhou. Abortando.`); process.exit(r.status || 1) }
}

run('verify.mjs')
run('setup-stripe.mjs')
run('setup-supabase.mjs')
console.log('\n🎉 Bootstrap de billing concluído. Cole as env vars no host e copie templates/api/*.js para o /api.')
