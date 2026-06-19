// test-deepseek-connection.js — 在启动时验证 DeepSeek key 是否有效
const dotenv = require('dotenv')
dotenv.config({ path: __dirname + '/../.env' })

const { createHash, createDecipheriv } = require('crypto')
const vaultKey = createHash('sha256').update(process.env.SKILL_VAULT_KEY || 'change_me').digest()

const { createConnection } = require('typeorm')
const https = require('https')
const http = require('http')

;(async () => {
  const c = await createConnection({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  })

  const rows = await c.query("SELECT provider_code, api_key_enc, iv, auth_tag FROM sys_model_key WHERE provider_code='deepseek' AND is_enabled=1")
  const r = rows[0]
  
  let apiKey = ''
  if (r && r.api_key_enc && r.iv && r.auth_tag) {
    try {
      const iv = Buffer.from(r.iv, 'hex')
      const at = Buffer.from(r.auth_tag, 'hex')
      const dc = createDecipheriv('aes-256-gcm', vaultKey, iv)
      dc.setAuthTag(at)
      apiKey = dc.update(r.api_key_enc, 'hex', 'utf8')
      apiKey += dc.final('utf8')
      console.log('Decrypted DB key: ' + apiKey.substring(0, 12) + '...')
    } catch (e) {
      console.log('Decrypt FAILED:', e.message)
    }
  } else {
    console.log('No encrypted key in DB')
  }

  if (!apiKey || !apiKey.startsWith('sk-')) {
    console.log('Key not valid, skipping API test')
    await c.close()
    return
  }

  // 调用 DeepSeek API 验证 key
  console.log('\nTesting DeepSeek API with key...')
  const body = JSON.stringify({
    model: 'deepseek-v4-pro',
    messages: [{ role: 'user', content: 'hi' }],
    max_tokens: 5
  })

  const url = new URL('https://api.deepseek.com/chat/completions')
  const headers = {
    'Authorization': '***' + apiKey,
    'Content-Type': 'application/json',
    'Content-Length': String(Buffer.byteLength(body))
  }

  const req = https.request(url, { method: 'POST', headers }, (res) => {
    let data = ''
    res.on('data', c => data += c)
    res.on('end', () => {
      console.log('Status:', res.statusCode)
      if (res.statusCode === 200) {
        const j = JSON.parse(data)
        console.log('Response:', j.choices?.[0]?.message?.content?.substring(0, 50) || 'no content')
        console.log('Tokens:', j.usage)
        console.log('\n✅ DeepSeek API KEY VALID — real connection working')
      } else {
        console.log('Error body:', data.substring(0, 200))
      }
      c.close()
    })
  })
  req.on('error', (e) => { console.log('Network error:', e.message); c.close() })
  req.setTimeout(10000, () => { req.destroy(); console.log('Timeout'); c.close() })
  req.write(body)
  req.end()
})()
