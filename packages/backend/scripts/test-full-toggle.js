// test-full-toggle.js — 完整模拟前端全链路
const http = require('http')

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    if (token) headers['Authorization'] = '***' + token
    const req = http.request({ hostname: 'localhost', port: 3000, path, method: 'POST', headers }, (res) => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => resolve({ status: res.statusCode, body: d }))
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')) })
    req.write(data)
    req.end()
  })
}

function log(msg) { console.log(msg) }

;(async () => {
  // 1. Login
  log('1. Login...')
  const login = await post('/api/auth/login', { username: 'admin', password: 'admin123' })
  const loginData = JSON.parse(login.body)
  const token = loginData.accessToken || loginData.data?.accessToken
  log(`   Token: ${token ? 'OK' : 'FAILED'}`)
  if (!token) { log('   ' + login.body); return }

  // 2. Toggle Qwen 3.6 Plus to ON
  const qwenProvider = 'qwen'
  const qwenModel = 'qwen3.6-plus'
  
  log(`\n2. Toggle ${qwenProvider}/${qwenModel}...`)
  const r1 = await post('/api/system/llm/config/set-default', { provider: qwenProvider, modelCode: qwenModel }, token)
  log(`   Status: ${r1.status}`)
  log(`   Body: ${r1.body}`)

  // 3. Toggle back
  log(`\n3. Toggle ${qwenProvider}/${qwenModel} again...`)
  const r2 = await post('/api/system/llm/config/set-default', { provider: qwenProvider, modelCode: qwenModel }, token)
  log(`   Status: ${r2.status}`)
  log(`   Body: ${r2.body}`)

  // 4. Toggle again
  log(`\n4. Toggle ${qwenProvider}/${qwenModel} third time...`)
  const r3 = await post('/api/system/llm/config/set-default', { provider: qwenProvider, modelCode: qwenModel }, token)
  log(`   Status: ${r3.status}`)
  log(`   Body: ${r3.body}`)
})()
