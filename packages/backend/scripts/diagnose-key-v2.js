// diagnose-key-v2.js — 修正列名查询
const dotenv = require('dotenv')
dotenv.config({ path: __dirname + '/../.env' })

const { createHash, createDecipheriv } = require('crypto')
const vaultKey = createHash('sha256').update(process.env.SKILL_VAULT_KEY || 'change_me').digest()
console.log('VAULT_HASH:', vaultKey.subarray(0, 8).toString('hex'))

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

  const keys = await c.query("SELECT provider_code, agent_code, is_enabled, api_key_enc, iv, auth_tag FROM sys_model_key WHERE is_enabled=1")
  console.log(`DB KEYS: ${keys.length}`)
  
  for (const r of keys) {
    console.log(`  ${r.provider_code}: enc=${r.api_key_enc ? r.api_key_enc.substring(0,20)+'...' : 'NULL'} iv=${r.iv ? r.iv.substring(0,20)+'...' : 'NULL'} tag=${r.auth_tag ? r.auth_tag.substring(0,20)+'...' : 'NULL'}`)
    
    try {
      const iv = Buffer.from(r.iv, 'hex')
      const at = Buffer.from(r.auth_tag, 'hex')
      const dc = createDecipheriv('aes-256-gcm', vaultKey, iv)
      dc.setAuthTag(at)
      let d2 = dc.update(r.api_key_enc, 'hex', 'utf8')
      d2 += dc.final('utf8')
      console.log(`    ✅ DECRYPTED: ${d2.substring(0, 20)}...`)
    } catch (e) {
      console.log(`    ❌ DECRYPT FAILED: ${e.message}`)
    }
  }
  
  await c.close()
})()
