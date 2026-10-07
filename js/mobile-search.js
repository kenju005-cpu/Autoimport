(function(){
 const $=id=>document.getElementById(id), PENDING='autoimport-v21-pending-action';
 const eur=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n)||0);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const title=v=>[v.make,v.model,v.version].filter(Boolean).join(' ')||'Vehículo';
 let current=[];
 function queue(type,vehicle){localStorage.setItem(PENDING,JSON.stringify({type,vehicle,created_at:new Date().toISOString()}));location.href='client.html?signup=1'}
 async function action(type,v,btn){
   try{
     const u=await window.AutoImportCloud.currentUser();
     if(!u){queue(type,v);return}
     if(type==='favorite'){await window.AutoImportCloud.saveFavorite(v);btn.textContent='Guardado ✓'}
     else{await window.AutoImportCloud.saveFavorite(v);await window.AutoImportCloud.createLead({vehicle:title(v),source:'mobile_de_sandbox_quote',message:'Presupuesto solicitado para vehículo mobile.de sandbox',vehicle_snapshot:v});btn.textContent='Solicitud enviada ✓'}
   }catch(e){alert(e.message)}
 }
 function card(v,i){
   return `<article class="market-card"><div class="market-top"><span class="demo-pill">SANDBOX · mobile.de</span><span>${v.year||'Año —'}</span></div><h3>${esc(title(v))}</h3><div class="market-meta"><span>${v.mileage==null?'Km —':Number(v.mileage).toLocaleString('es-ES')+' km'}</span><span>Precio origen: <b>${v.price_origin==null?'—':eur(v.price_origin)}</b></span></div><p class="muted">${esc([v.fuel,v.category,v.location_text].filter(Boolean).join(' · ')||'Datos de prueba del sandbox')}</p><div class="market-actions"><button class="secondary" data-fav="${i}">♡ Guardar coche</button><button data-quote="${i}">Pedir presupuesto</button>${v.original_url?`<a class="secondary" style="text-decoration:none;padding:10px 13px;border-radius:10px" href="${esc(v.original_url)}" target="_blank" rel="noopener">Ver ficha</a>`:''}</div></article>`;
 }
 function render(rows){
   const root=$('publicCars');if(!root)return;
   current=rows||[];
   if(!current.length){root.innerHTML='<div class="market-card"><b>Sin resultados del sandbox</b><p class="muted">Prueba otros filtros. El sandbox no contiene datos reales de concesionarios ni vehículos.</p></div>';return}
   root.innerHTML=current.map(card).join('');
   root.querySelectorAll('[data-fav]').forEach(b=>b.addEventListener('click',()=>action('favorite',current[+b.dataset.fav],b)));
   root.querySelectorAll('[data-quote]').forEach(b=>b.addEventListener('click',()=>action('quote',current[+b.dataset.quote],b)))
 }
 async function search(){
   const status=$('mobileSearchStatus'),btn=$('mobileSearchBtn');if(status)status.textContent='Consultando mobile.de sandbox…';if(btn)btn.disabled=true;
   const p=new URLSearchParams({q:$('mobileQ')?.value||'',yearMin:$('mobileYear')?.value||'',kmMax:$('mobileKm')?.value||'',budget:$('mobileBudget')?.value||''});
   try{
     const r=await fetch('/api/mobile/search?'+p.toString(),{headers:{Accept:'application/json'}});
     const d=await r.json();
     if(!r.ok||!d.ok){
       if(d.error==='mobile_de_not_configured'){
         status.textContent='Conector V22 instalado. Falta activar las credenciales privadas del sandbox en Vercel.';
         return;
       }
       throw new Error(d.message||d.error||'Error de mobile.de');
     }
     render(d.vehicles||[]);
     status.textContent=`Sandbox conectado ✓ · ${d.returned||0} resultado(s) mostrados. No son anuncios reales.`;
   }catch(e){status.textContent='No se pudo consultar el sandbox: '+e.message}
   finally{if(btn)btn.disabled=false}
 }
 window.addEventListener('DOMContentLoaded',()=>{
   $('mobileSearchBtn')?.addEventListener('click',search);
   ['mobileQ','mobileYear','mobileKm','mobileBudget'].forEach(id=>$(id)?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search()}}));
   search();
 });
})();