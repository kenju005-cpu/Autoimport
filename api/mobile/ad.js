const DEFAULT_BASE = 'https://services.sandbox.mobile.de';
module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
  const id=String(req.query?.id||'').replace(/[^0-9A-Za-z_-]/g,'');
  if(!id) return res.status(400).json({error:'missing_id'});
  const username=process.env.MOBILE_DE_USERNAME,password=process.env.MOBILE_DE_PASSWORD;
  const base=process.env.MOBILE_DE_BASE_URL||DEFAULT_BASE;
  if(!username||!password) return res.status(503).json({ok:false,configured:false,error:'mobile_de_not_configured'});
  try{
    const auth=Buffer.from(username+':'+password).toString('base64');
    const upstream=await fetch(base.replace(/\/$/,'')+'/search-api/ad/'+encodeURIComponent(id),{
      headers:{Authorization:'Basic '+auth,Accept:'application/vnd.de.mobile.api+json','User-Agent':'AutoImport-V22-Sandbox'}
    });
    const text=await upstream.text();let body;try{body=text?JSON.parse(text):{}}catch{body={raw:text}}
    if(!upstream.ok)return res.status(upstream.status).json({ok:false,error:'mobile_de_upstream_error',upstreamStatus:upstream.status,details:body});
    return res.status(200).json({ok:true,environment:'sandbox',sandbox:true,ad:body});
  }catch(err){return res.status(500).json({ok:false,error:'mobile_de_connector_error',message:err.message})}
};