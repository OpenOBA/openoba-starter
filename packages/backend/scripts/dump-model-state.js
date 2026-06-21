// dump-model-state.js
require('reflect-metadata')
require('dotenv').config({ path: __dirname + '/../.env' })
const { createConnection } = require('typeorm')

;(async () => {
  const c = await createConnection({
    type:'mysql', host:process.env.DB_HOST, port:parseInt(process.env.DB_PORT||'3306'),
    username:process.env.DB_USERNAME, password:process.env.DB_PASSWORD, database:process.env.DB_DATABASE
  })

  console.log('=== sys_model_key (API Keys) ===')
  const keys = await c.query('SELECT id, provider_code, agent_code, is_enabled FROM sys_model_key WHERE is_enabled=1')
  for (const k of keys) console.log(`  ${k.provider_code} | id=${k.id} | agent=${k.agent_code}`)

  console.log('\n=== sys_model_registry (Models) ===')
  const reg = await c.query('SELECT id, provider_code, model_code, model_name, is_default, is_enabled FROM sys_model_registry ORDER BY provider_code')
  for (const r of reg) console.log(`  ${r.provider_code}/${r.model_code} | enabled=${r.is_enabled} | default=${r.is_default} | id=${r.id?.substring(0,8)}...`)

  console.log('\n=== sys_model_key_models (Key→Model defaults) ===')
  const kms = await c.query('SELECT km.key_id, km.registry_id, km.is_default, mr.model_code FROM sys_model_key_models km LEFT JOIN sys_model_registry mr ON km.registry_id=mr.id')
  for (const km of kms) console.log(`  key_id=${km.key_id?.substring(0,8)}... → ${km.model_code || km.registry_id} | default=${km.is_default}`)

  // Key check: which providers actually have api keys?
  console.log('\n=== Key availability ===')
  const pCodes = [...new Set(reg.map(r => r.provider_code))]
  for (const pc of pCodes) {
    const hasKey = keys.some(k => k.provider_code === pc)
    console.log(`  ${pc}: ${hasKey ? 'HAS KEY' : 'NO KEY'}`)
  }

  await c.close()
})()
