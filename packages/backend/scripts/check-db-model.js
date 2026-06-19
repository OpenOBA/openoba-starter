const dotenv = require('dotenv')
dotenv.config({ path: __dirname + '/../.env' })
require('reflect-metadata')
const { createConnection } = require('typeorm')

;(async () => {
  const c = await createConnection({
    type:'mysql', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  })
  
  const tables = await c.query(`SHOW TABLES LIKE 'sys_model%'`)
  console.log('TABLES:', JSON.stringify(tables))
  
  const d1 = await c.query(`DESCRIBE sys_model_provider`)
  console.log('PROVIDER COLS:', JSON.stringify(d1.map(r=>({Field:r.Field,Type:r.Type}))))
  
  const rows = await c.query(`SELECT * FROM sys_model_provider`)
  console.log('PROVIDER ROWS:', JSON.stringify(rows))
  
  const d2 = await c.query(`DESCRIBE sys_model_registry`)
  console.log('REGISTRY COLS:', JSON.stringify(d2.map(r=>({Field:r.Field,Type:r.Type}))))
  
  const mrows = await c.query(`SELECT * FROM sys_model_registry`)
  console.log('REGISTRY ROWS:', JSON.stringify(mrows))
  
  await c.close()
})()
