// Capa común para cualquier marketplace. Los conectores reales deberán devolver
// este mismo formato normalizado para que el resto de la app no dependa del proveedor.
function normalizeListing(raw, providerId){
  const p=SOURCE_REGISTRY[providerId];
  if(!p) throw new Error('Proveedor desconocido: '+providerId);
  return {
    id:String(raw.id), provider:providerId, country:p.country, role:p.role,
    make:raw.make||'', model:raw.model||'', version:raw.version||'',
    name:raw.name||[raw.make,raw.model,raw.version].filter(Boolean).join(' '),
    year:Number(raw.year)||0, km:Number(raw.km)||0, price:Number(raw.price)||0,
    fuel:raw.fuel||'', gear:raw.gear||'', body:raw.body||'', seller:raw.seller||'',
    hp:Number(raw.hp)||0, co2:Number(raw.co2)||0, tax:Number(raw.tax)||0,
    listingUrl:raw.listingUrl||'', location:raw.location||'', sourceListingId:raw.sourceListingId||String(raw.id),
    key:raw.key||[raw.make,raw.model].filter(Boolean).join('-').toLowerCase().replace(/\s+/g,'-')
  };
}

function listingFingerprint(x){
  // No depende de un marketplace concreto. Más adelante podremos incorporar VIN parcial,
  // vendedor, localidad y fotos perceptuales cuando las fuentes lo permitan.
  return [x.make,x.model,x.version,x.year,Math.round((x.km||0)/1000),Math.round((x.price||0)/100)]
    .join('|').toLowerCase().replace(/\s+/g,'');
}

function dedupeListings(items){
  const seen=new Map();
  for(const item of items){
    const fp=listingFingerprint(item);
    const existing=seen.get(fp);
    if(!existing){seen.set(fp,{...item,alsoOn:[]});continue;}
    // Conservamos el primer registro y anotamos fuentes duplicadas para evitar
    // inflar el número de comparables y sesgar la mediana.
    existing.alsoOn.push(item.provider);
  }
  return [...seen.values()];
}

function sourcesFor(country,role){
  return Object.entries(SOURCE_REGISTRY)
    .filter(([,p])=>p.country===country && (!role||p.role===role))
    .map(([id,p])=>({id,...p}));
}

window.normalizeListing=normalizeListing;
window.listingFingerprint=listingFingerprint;
window.dedupeListings=dedupeListings;
window.sourcesFor=sourcesFor;
