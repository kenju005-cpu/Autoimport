(function(){
 const $=id=>document.getElementById(id),PENDING='autoimport-v21-pending-action';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const eur=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n)||0);
 const carTitle=v=>[v.make,v.model,v.version].filter(Boolean).join(' ')||'Vehículo';
 function status(msg){const e=$('clientActionStatus');if(!e)return;e.textContent=msg;e.classList.remove('hidden')}
 async function processPending(){
  const raw=localStorage.getItem(PENDING);if(!raw)return;
  let a;try{a=JSON.parse(raw)}catch{localStorage.removeItem(PENDING);return}
  try{
   if(a.type==='favorite'){await window.AutoImportCloud.saveFavorite(a.vehicle);status('Coche guardado en tus favoritos ✓')}
   if(a.type==='quote'){await window.AutoImportCloud.saveFavorite(a.vehicle);await window.AutoImportCloud.createLead({vehicle:carTitle(a.vehicle),source:'vehicle_quote',message:'Presupuesto solicitado para vehículo guardado',vehicle_snapshot:a.vehicle});status('Solicitud de presupuesto enviada. Te contactaremos por WhatsApp ✓')}
   if(a.type==='search_request'){await window.AutoImportCloud.createLead(a.payload||{});status('Solicitud de búsqueda enviada. Te contactaremos por WhatsApp ✓')}
   localStorage.removeItem(PENDING)
  }catch(e){status('No se pudo completar la acción pendiente: '+e.message)}
 }
 async function loadFavorites(){
  const root=$('clientFavorites');if(!root)return;
  try{
   const rows=await window.AutoImportCloud.myFavorites();
   if(!rows.length){root.innerHTML='<div class="favorite-card"><b>No tienes coches guardados todavía</b><span>Vuelve al buscador y pulsa “Guardar coche”.</span></div>';return}
   root.innerHTML=rows.map((r,i)=>`<article class="favorite-card"><div class="favorite-head"><div><b>${esc(carTitle(r))}</b><span>${esc(r.source_country||'DE')} · ${r.year||'Año sin indicar'}</span></div><div class="favorite-actions"><button class="secondary" data-remove="${i}">Eliminar</button><button data-quote="${i}">Pedir presupuesto</button></div></div><div class="favorite-meta"><span>${Number(r.mileage||0).toLocaleString('es-ES')} km</span><span>Precio origen: <b>${eur(r.price_origin)}</b></span></div></article>`).join('');
   root.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',async()=>{const r=rows[+b.dataset.remove];await window.AutoImportCloud.removeFavorite(r.listing_key);await loadFavorites()}));
   root.querySelectorAll('[data-quote]').forEach(b=>b.addEventListener('click',async()=>{const r=rows[+b.dataset.quote];const v=r.snapshot&&Object.keys(r.snapshot).length?r.snapshot:r;await window.AutoImportCloud.createLead({vehicle:carTitle(v),source:'favorite_quote',message:'Presupuesto solicitado desde favoritos',vehicle_snapshot:v});b.textContent='Enviado ✓';status('Solicitud enviada. Te contactaremos por WhatsApp.') }))
  }catch(e){root.innerHTML='<div class="favorite-card bad">No se pudieron cargar tus favoritos: '+esc(e.message)+'</div>'}
 }
 async function loadOrders(){
   const root=$('clientOrders');if(!root)return;const cloud=window.AutoImportCloud;
   if(!cloud.enabled){root.innerHTML='<div class="client-order"><b>Modo local</b><span>El portal real se activará al conectar Supabase.</span></div>';return}
   try{
     const orders=await cloud.myOrders();if(!orders.length){root.innerHTML='<div class="client-order"><b>No tienes encargos todavía</b><span>Cuando abramos uno a tu nombre aparecerá aquí.</span></div>';return}
     root.innerHTML=orders.map(o=>`<article class="client-order"><div class="client-order-head"><div><b>${esc(o.requested_vehicle)}</b><span>${esc(o.reference||'Sin referencia')} · ${esc(o.status)}</span></div><button class="secondary smallbtn" data-order="${o.id}">Ver detalle</button></div><div class="client-mini"><span>Presupuesto</span><b>${eur(o.budget)}</b></div><div id="bundle-${o.id}" class="client-bundle hidden"></div></article>`).join('');
     root.querySelectorAll('[data-order]').forEach(btn=>btn.addEventListener('click',async()=>{const id=btn.dataset.order,box=$('bundle-'+id);box.classList.toggle('hidden');if(box.dataset.loaded)return;box.textContent='Cargando…';try{const b=await cloud.myOrderBundle(id),prop=b.proposals[0],con=b.contracts[0],paid=b.payments.filter(x=>x.status==='paid'&&x.direction==='to_intermediary').reduce((a,x)=>a+Number(x.amount||0),0);box.innerHTML=`<div class="portal-grid"><div><span>Precio final propuesto</span><b>${prop?eur(prop.final_price):'Pendiente'}</b></div><div><span>Pagado a intermediación</span><b>${eur(paid)}</b></div><div><span>Contrato</span><b>${con?.accepted_at?'Aceptado':'Pendiente'}</b></div><div><span>Opciones visibles</span><b>${b.candidates.length}</b></div></div><div class="portal-events"><b>Seguimiento</b>${b.events.length?b.events.map(e=>`<p><strong>${esc(e.status)}</strong> · ${esc(e.message||'')}</p>`).join(''):'<p class="muted">Sin novedades publicadas.</p>'}</div>`;box.dataset.loaded='1'}catch(e){box.textContent='No se pudo cargar el detalle: '+e.message}}))
   }catch(e){root.innerHTML='<div class="client-order bad">No se pudieron cargar tus encargos: '+esc(e.message)+'</div>'}
 }
 async function init(){await processPending();await Promise.all([loadFavorites(),loadOrders()])}
 window.addEventListener('autoimport:authorized',()=>init().catch(e=>status(e.message)));
 window.addEventListener('DOMContentLoaded',()=>{if(window.AutoImportCloud&&!window.AutoImportCloud.enabled)setTimeout(()=>Promise.all([loadFavorites(),loadOrders()]),0)})
})();