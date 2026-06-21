// test-default-toggle.js — 直接测试默认模型 toggle
const http = require('http')

// 先拿 JWT
const loginBody = JSON.stringify({ username: 'admin', password: 'admin123' })

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
    req.write(data)
    req.end()
  })
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {}
    if (token) headers['Authorization'] = '***' + token
    const req = http.request({ hostname: 'localhost', port: 3000, path, method: 'GET', headers }, (res) => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => resolve({ status: res.statusCode, body: d }))
    })
    req.on('error', reject)
    req.end()
  })
}

;(async () => {
  // 1. Login
  console.log('1. Login...')
  const loginRes = await post('/api/auth/login', { username: 'admin', password: 'admin123' })
  console.log('   Status:', loginRes.status)
  let token = ''
  try { const j = JSON.parse(loginRes.body); token = j.data?.accessToken || j.accessToken } catch {}
  if (!token) { console.log('   Login failed:', loginRes.body); return }
  console.log('   Token OK')

  // 2. Get providers
  console.log('\n2. Get providers...')
  const provRes = await get('/api/system/llm/providers', token)
  console.log('   Status:', provRes.status)
  const provBody = JSON.parse(provRes.body)
  console.log('   Providers:', provBody.providers?.length || 0)
  if (provBody.providers?.length) {
    for (const p of provBody.providers) {
      console.log(`   - ${p.providerCode}: ${p.models?.length || 0} models`)
      if (p.models) {
        for (const m of p.models) {
          console.log(`     • ${m.modelCode}  id=${m.id}  isDefault=${m.isDefault}`)
        }
      }
    }
  }

  // 3. Test toggle on first model
  if (provBody.providers?.[0]?.models?.[0]) {
    const m = provBody.providers[0].models[0]
    console.log(`\n3. Toggle default on: ${m.modelCode} (id=${m.id})`)
    const toggleRes = await post('/api/system/llm/config/set-default', { modelRegistryId: m.id }, token)
    console.log('   Status:', toggleRes.status)
    console.log('   Body:', toggleRes.body)
  } else {
    console.log('\n3. No models to test')
  }
})()
