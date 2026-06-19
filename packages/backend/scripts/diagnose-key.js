// diagnose-key.js — 诊断 DB Key 恢复全链路
const dotenv = require('dotenv')
dotenv.config({ path: __dirname + '/../.env' })

console.log('=== 1. ENV VARS ===')
console.log('SKILL_VAULT_KEY:', process.env.SKILL_VAULT_KEY ? `SET (len=${process.env.SKILL_VAULT_KEY.length})` : 'NOT SET')
console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? `SET (len=${process.env.DEEPSEEK_API_KEY.length})` : 'NOT SET')
console.log('DASHSCOPE_API_KEY:', process.env.DASHSCOPE_API_KEY ? `SET (len=${process.env.DASHSCOPE_API_KEY.length})` : 'NOT SET')

const { createHash, createDecipheriv } = require('crypto')

// 模拟 ModelRegistryService.getVaultKey()
function getVaultKey(raw) {
  return createHash('sha256').update(raw).digest()
}

const vaultKey = getVaultKey(process.env.SKILL_VAULT_KEY || 'change_me')
console.log('\n=== 2. VAULT KEY HASH (first 8 hex) ===')
console.log(vaultKey.subarray(0, 8).toString('hex'))

const { createConnection } = require('typeorm')
;(async () => {
  const c = await createConnection({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  })

  const keys = await c.query(
    "SELECT provider_code, agent_code, is_enabled, LENGTH(api_key_enc) as enc_len, iv, auth_tag FROM sys_model_key WHERE is_enabled=1"
  )
  console.log(`\n=== 3. DB KEYS (${keys.length} records) ===`)
  
  for (const r of keys) {
    console.log(`  ${r.provider_code} / ${r.agent_code} | enc_len=${r.enc_len} | iv_len=${r.iv?.length || 0} | tag_len=${r.auth_tag?.length || 0}`)
    if (!r.api_key_enc || !r.iv || !r.auth_tag) {
      console.log(`    ⚠️  Missing encrypted data`)
      continue
    }
    try {
      const iv = Buffer.from(r.iv, 'hex')
      const at = Buffer.from(r.auth_tag, 'hex')
      const dc = createDecipheriv('aes-256-gcm', vaultKey, iv)
      dc.setAuthTag(at)
      let d2 = dc.update(r.api_key_enc, 'hex', 'utf8')
      d2 += dc.final('utf8')
      console.log(`    ✅ Decrypted: ${d2.substring(0, 12)}... (len=${d2.length})`)
    } catch (e) {
      console.log(`    ❌ Decrypt FAILED: ${e.message}`)
    }
  }

  // 也查 sys_model_provider
  const providers = await c.query("SELECT * FROM sys_model_provider WHERE is_enabled=1")
  console.log(`\n=== 4. DB PROVIDERS (${providers.length} records) ===`)
  for (const p of providers) {
    console.log(`  ${p.provider_code} | name=${p.provider_name} | baseUrl=${p.baseUrl || 'null'} | builtin=${p.is_builtin}`)
  }

  // 查 sys_model_registry (models)
  const models = await c.query("SELECT provider_code, model_code, model_name, is_enabled, is_default FROM sys_model_registry WHERE is_enabled=1")
  console.log(`\n=== 5. DB MODELS (${models.length} records) ===`)
  for (const m of models) {
    console.log(`  ${m.provider_code} / ${m.model_code} | name=${m.model_name} | default=${m.is_default}`)
  }

  await c.close()
  console.log('\n=== DONE ===')
})()
