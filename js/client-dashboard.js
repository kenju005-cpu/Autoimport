(function(){
 const $=id=>document.getElementById(id), eur=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(+n||0);
 function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
 function orderHtml(o){
   const proposal=o.proposal||{}, contract=o.contract||{}, payments=o.payments||[], docs=o.documents||[];
   const paid=payments.filter(x=>x.status==='paid'&&x.direction==='to_intermediary').reduce((a,x)=>a+(+x.amount||0),0);
   const seller=payments.find(x=>x.direction==='to_seller');
   return `<article class="client-order"><div class="client-order-head"><div><b>${esc(o.reference||'Encargo')}</b><span>${esc(o.requested_vehicle||'')}</span></div><strong>${esc(o.status||'')}</strong></div>
   <div class="client-grid"><div><span>Presupuesto máximo</span><b>${eur(o.budget)}</b></div><div><span>Precio propuesta</span><b>${proposal.final_price?eur(proposal.final_price):'Pendiente'}</b></div><div><span>Señal prevista</span><b>${proposal.deposit_amount?eur(proposal.deposit_amount):'—'}</b></div><div><span>Pagado a intermediación</span><b>${eur(paid)}</b></div><div><span>Pago directo vendedor</span><b>${seller?`${eur(seller.amount)} · ${esc(seller.status)}`:'Pendiente'}</b></div><div><span>Contrato</span><b>${contract?.accepted_at?'Aceptado':'Pendiente'}</b></div></div>
   ${proposal.client_payload?.includes?`<div class="client-section"><h3>Qué incluye</h3><p>${esc(proposal.client_payload.includes)}</p></div>`:''}
   <div class="client-section"><h3>Documentos disponibles</h3>${docs.length?docs.map(d=>`<button class="secondary client-doc" data-doc-id="${d.id}">${esc(d.original_name||d.kind||'Documento')}</button>`).join(' '):'<p class="muted">Todavía no hay documentos compartidos.</p>'}</div></article>`;
 }
 async function load(){
   if(!window.AutoImportCloud.enabled) return;
   const app=$('privateApp'); if(!app||app.classList.contains('hidden')){setTimeout(load,300);return;}
   const box=$('clientOrders');
   try{
     box.innerHTML='<p class="muted">Cargando tus encargos…</p>';
     const data=await window.AutoImportCloud.clientDashboard(), orders=data?.orders||[];
     box.innerHTML=orders.length?orders.map(orderHtml).join(''):'<div class="client-order"><b>Aún no tienes encargos vinculados.</b><span>Si ya hablaste con nosotros, usa el mismo email con el que hiciste la solicitud.</span></div>';
     box.querySelectorAll('.client-doc').forEach(b=>b.addEventListener('click',async()=>{try{const u=await window.AutoImportCloud.clientDocumentUrl(b.dataset.docId);window.open(u,'_blank','noopener')}catch(e){alert(e.message)}}));
   }catch(e){box.innerHTML=`<p class="bad">No se pudieron cargar los encargos: ${esc(e.message)}</p>`}
 }
 window.addEventListener('DOMContentLoaded',()=>setTimeout(load,350));
})();
