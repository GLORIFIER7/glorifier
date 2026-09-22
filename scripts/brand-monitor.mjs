const base = process.env.BRAND_MONITOR_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:3000';
const secret = process.env.BRAND_MONITOR_WEBHOOK_SECRET;
async function main(){
  const url = base.replace(/\/$/,'') + '/api/brand-monitor/scan';
  const headers = {'content-type':'application/json'};
  if(secret) headers['x-brand-monitor-secret']=secret;
  const r = await fetch(url,{method:'POST',headers,body:JSON.stringify({source:'scheduled-worker',timestamp:new Date().toISOString()})});
  const body = await r.text();
  if(!r.ok) throw new Error(`Brand monitor scan failed: HTTP ${r.status} ${body}`);
  console.log(body);
}
main().catch(e=>{console.error(e);process.exit(1)});
