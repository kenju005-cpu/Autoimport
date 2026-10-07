const DEFAULT_BASE = 'https://services.sandbox.mobile.de';

function safeText(v){ return String(v ?? '').trim(); }
function num(v){ const n = Number(v); return Number.isFinite(n) ? n : null; }
function yearFromFirstRegistration(v){
  const s = safeText(v);
  if (/^\d{6}$/.test(s)) return Number(s.slice(0,4));
  if (/^\d{4}-\d{2}/.test(s)) return Number(s.slice(0,4));
  return null;
}
function normalizeAd(ad){
  const id = safeText(ad.mobileAdId || ad.id);
  const seller = ad.seller || {};
  const address = seller.address || {};
  const price = ad.price || {};
  return {
    listing_key: id ? 'mobilede-' + id : '',
    external_listing_id: id,
    source_platform: 'mobile.de',
    source_country: safeText(address.country || 'DE') || 'DE',
    original_url: safeText(ad.detailPageUrl),
    make: safeText(ad.make),
    model: safeText(ad.model),
    version: safeText(ad.modelDescription),
    year: yearFromFirstRegistration(ad.firstRegistration),
    mileage: num(ad.mileage),
    fuel: safeText(ad.fuel),
    transmission: safeText(ad.transmission),
    category: safeText(ad.category),
    condition: safeText(ad.condition),
    price_origin: num(price.consumerPriceGross),
    currency: safeText(price.currency || 'EUR') || 'EUR',
    seller_type: safeText(seller.type),
    seller_name: safeText(seller.companyName),
    location_text: [address.city,address.country].filter(Boolean).join(', '),
    image_url: safeText(ad.images?.[0]?.xxl || ad.images?.[0]?.xl || ad.images?.[0]?.m || ''),
    sandbox: true
  };
}
function matchesLocal(v, filters){
  const q = safeText(filters.q).toLowerCase();
  if(q){
    const hay = [v.make,v.model,v.version].join(' ').toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    if(!words.every(w=>hay.includes(w))) return false;
  }
  const yearMin = num(filters.yearMin);
  if(yearMin && v.year && v.year < yearMin) return false;
  const kmMax = num(filters.kmMax);
  if(kmMax && v.mileage != null && v.mileage > kmMax) return false;
  const budget = num(filters.budget);
  if(budget && v.price_origin != null && v.price_origin > budget) return false;
  return true;
}

module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'GET') return res.status(405).json({error:'method_not_allowed'});
  const username = process.env.MOBILE_DE_USERNAME;
  const password = process.env.MOBILE_DE_PASSWORD;
  const base = process.env.MOBILE_DE_BASE_URL || DEFAULT_BASE;
  if(!username || !password){
    return res.status(503).json({
      ok:false,
      configured:false,
      environment:'sandbox',
      error:'mobile_de_not_configured',
      message:'El conector mobile.de está instalado, pero faltan las credenciales privadas del sandbox en Vercel.'
    });
  }
  try{
    const params = new URLSearchParams();
    params.set('country','DE');
    params.set('page.number', safeText(req.query?.page || '1') || '1');
    params.set('page.size', '50');
    params.set('sort.field','modificationTime');
    params.set('sort.order','DESCENDING');
    const auth = Buffer.from(username + ':' + password).toString('base64');
    const upstream = await fetch(base.replace(/\/$/,'') + '/search-api/search?' + params.toString(),{
      headers:{
        'Authorization':'Basic ' + auth,
        'Accept':'application/vnd.de.mobile.api+json',
        'User-Agent':'AutoImport-V22-Sandbox'
      }
    });
    const text = await upstream.text();
    let body;
    try { body = text ? JSON.parse(text) : {}; }
    catch { body = {raw:text}; }
    if(!upstream.ok){
      return res.status(upstream.status).json({
        ok:false,configured:true,environment:'sandbox',
        error:'mobile_de_upstream_error',
        upstreamStatus:upstream.status,
        details:body
      });
    }
    const ads = Array.isArray(body.ads) ? body.ads : [];
    const normalized = ads.map(normalizeAd).filter(v=>v.listing_key).filter(v=>matchesLocal(v,req.query||{}));
    return res.status(200).json({
      ok:true,
      configured:true,
      environment:'sandbox',
      sandbox:true,
      total:Number(body.total || normalized.length),
      currentPage:Number(body.currentPage || 1),
      maxPages:Number(body.maxPages || 1),
      returned:normalized.length,
      vehicles:normalized
    });
  }catch(err){
    return res.status(500).json({ok:false,configured:true,environment:'sandbox',error:'mobile_de_connector_error',message:err.message});
  }
};