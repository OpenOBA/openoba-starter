const dotenv = require('dotenv')
dotenv.config({path:'./.env'})
const { createHash, createDecipheriv } = require('crypto')
const { createConnection } = require('typeorm')

;(async()=>{
  const c = await createConnection({
    type:'mysql', host:process.env.DB_HOST, port:parseInt(process.env.DB_PORT||'3306'),
    username:process.env.DB_USERNAME, password:process.env.DB_PASSWORD, database:process.env.DB_DATABASE
  })
  const rows = await c.query("SELECT provider_code, api_key_enc, iv, auth_tag FROM sys_model_key WHERE provider_code='deepseek' AND is_enabled=1")
  const r = rows[0]
  if (!r) { console.log('NO KEY FOUND'); await c.close(); process.exit(0) }
  
  const k = createHash('sha256').update(process.env.SKILL_VAULT_KEY||'change_me').digest()
  try {
    const iv = Buffer.from(r.iv, 'hex')
    const at = Buffer.from(r.auth_tag, 'hex')
    const dc = createDecipheriv('aes-256-gcm', k, iv)
    dc.setAuthTag(at)
    let d2 = dc.update(r.api_key_enc, 'hex', 'utf8')
    d2 += dc.final('utf8')
    console.log('DECRYPTED value:', d2)
  } catch(e) {
    console.log('DECRYPT FAILED:', e.message)
  }
  await c.close()
})()
