(function(){
 const $=id=>document.getElementById(id),PENDING='autoimport-v21-pending-action';
 const cars=[
  {listing_key:'demo-bmw-330e',source_platform:'demo_de',source_country:'DE',make:'BMW',model:'330e',version:'M Sport',year:2020,mileage:97000,price_origin:18900},
  {listing_key:'demo-audi-a5',source_platform:'demo_de',source_country:'DE',make:'Audi',model:'A5 Sportback',version:'40 TDI',year:2019,mileage:118000,price_origin:17950},
  {listing_key:'demo-golf-gti',source_platform:'demo_de',source_country:'DE',make:'Volkswagen',model:'Golf GTI',version:'Performance',year:2018,mileage:89000,price_origin:17400},
  {listing_key:'demo-kona-ev',source_platform:'demo_de',source_country:'DE',make:'Hyundai',model:'Kona Electric',version:'64 kWh',year:2020,mileage:68000,price_origin:15900}
 ];
 const euro=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n||0);
 const title=v=>[v.make,v.model,v.version].filter(Boolean).join(' ');
 function queue(type,vehicle){localStorage.setItem(PENDING,JSON.stringify({type,vehicle,created_at:new Date().toISOString()}));location.href='client.html?signup=1'}
 async function act(type,vehicle,btn){
  try{
   const u=await window.AutoImportCloud.currentUser();if(!u){queue(type,vehicle);return}
   if(type==='favorite'){await window.AutoImportCloud.saveFavorite(vehicle);btn.textContent='Guardado ✓'}
   else{await window.AutoImportCloud.saveFavorite(vehicle);await window.AutoImportCloud.createLead({vehicle:title(vehicle),source:'vehicle_quote',message:'Presupuesto solicitado para vehículo guardado',vehicle_snapshot:vehicle});btn.textContent='Solicitud enviada ✓'}
  }catch(e){btn.textContent='Error';alert(e.message)}
 }
 function render(){
  const root=$('publicCars');if(!root)return;
  root.innerHTML=cars.map((v,i)=>`<article class="market-card"><div class="market-top"><span class="demo-pill">DEMO · Alemania</span><span>${v.year}</span></div><h3>${title(v)}</h3><div class="market-meta"><span>${Number(v.mileage).toLocaleString('es-ES')} km</span><span>Precio origen: <b>${euro(v.price_origin)}</b></span></div><p class="muted">Vehículo de demostración para probar favoritos y solicitudes. La conexión con anuncios reales llegará en el siguiente bloque.</p><div class="market-actions"><button class="secondary" data-fav="${i}">♡ Guardar coche</button><button data-quote="${i}">Pedir presupuesto</button></div></article>`).join('');
  root.querySelectorAll('[data-fav]').forEach(b=>b.addEventListener('click',()=>act('favorite',cars[+b.dataset.fav],b)));
  root.querySelectorAll('[data-quote]').forEach(b=>b.addEventListener('click',()=>act('quote',cars[+b.dataset.quote],b)))
 }
 window.addEventListener('DOMContentLoaded',render);
})();