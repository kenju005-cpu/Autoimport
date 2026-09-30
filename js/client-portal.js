(function(){
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const eur=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n)||0);
 async function load(){
   const root=$('clientOrders'); if(!root)return;
   const cloud=window.AutoImportCloud;
   if(!cloud.enabled){root.innerHTML='<div class="client-order"><b>Modo local</b><span>El portal real se activará al conectar Supabase.</span></div>';return;}
   try{
     const orders=await cloud.myOrders();
     if(!orders.length){root.innerHTML='<div class="client-order"><b>No tienes encargos todavía</b><span>Cuando abramos uno a tu nombre aparecerá aquí.</span></div>';return;}
     root.innerHTML=orders.map(o=>`<article class="client-order"><div class="client-order-head"><div><b>${esc(o.requested_vehicle)}</b><span>${esc(o.reference||'Sin referencia')} · ${esc(o.status)}</span></div><button class="secondary smallbtn" data-order="${o.id}">Ver detalle</button></div><div class="client-mini"><span>Presupuesto</span><b>${eur(o.budget)}</b></div><div id="bundle-${o.id}" class="client-bundle hidden"></div></article>`).join('');
     root.querySelectorAll('[data-order]').forEach(btn=>btn.addEventListener('click',async()=>{
       const id=btn.dataset.order, box=$('bundle-'+id); box.classList.toggle('hidden'); if(box.dataset.loaded)return; box.textContent='Cargando…';
       try{const b=await cloud.myOrderBundle(id); const prop=b.proposals[0], con=b.contracts[0]; const paid=b.payments.filter(x=>x.status==='paid'&&x.direction==='to_intermediary').reduce((a,x)=>a+Number(x.amount||0),0);
         box.innerHTML=`<div class="portal-grid"><div><span>Precio final propuesto</span><b>${prop?eur(prop.final_price):'Pendiente'}</b></div><div><span>Pagado a intermediación</span><b>${eur(paid)}</b></div><div><span>Contrato</span><b>${con?.accepted_at?'Aceptado':'Pendiente'}</b></div><div><span>Opciones visibles</span><b>${b.candidates.length}</b></div></div><div class="portal-events"><b>Seguimiento</b>${b.events.length?b.events.map(e=>`<p><strong>${esc(e.status)}</strong> · ${esc(e.message||'')}</p>`).join(''):'<p class="muted">Sin novedades publicadas.</p>'}</div>`; box.dataset.loaded='1';
       }catch(e){box.textContent='No se pudo cargar el detalle: '+e.message;}
     }));
   }catch(e){root.innerHTML='<div class="client-order bad">No se pudieron cargar tus encargos: '+esc(e.message)+'</div>';}
 }
 window.addEventListener('autoimport:authorized',load); window.addEventListener('DOMContentLoaded',()=>{if(window.AutoImportCloud&&!window.AutoImportCloud.enabled)setTimeout(load,0)});
})();
