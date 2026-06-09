const m=require('mysql2/promise');
(async()=>{
const c=await m.createConnection({host:'localhost',user:'99tan',password:'',database:'miaojing_erp',charset:'utf8mb4'});
const[r]=await c.query('SELECT id,provider_code,is_enabled,LENGTH(api_key_enc) as klen,updated_at FROM sys_model_key');
console.log(JSON.stringify(r));
await c.end();
})().catch(e=>console.error(e.message));
