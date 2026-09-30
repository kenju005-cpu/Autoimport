(function(){
  const $=id=>document.getElementById(id);
  const euro=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n)||0);
  function estimate(){
    const budget=+$('pubBudget').value||0, year=+$('pubYear').value||0, km=+$('pubKm').value||0;
    const brand=$('pubCar').value.trim();
    const targetMargin=Math.max(1200, Math.round(budget*0.065));
    const importCosts=Math.max(1800, Math.round(budget*0.09));
    const maxPurchase=Math.max(0,budget-targetMargin-importCosts);
    let realism='Presupuesto orientativo'; let cls='warn';
    if(budget<12000){realism='Muy ajustado para importación por encargo';cls='bad'}
    else if(budget>=22000){realism='Rango con margen para buscar opciones';cls='good'}
    const age=new Date().getFullYear()-year;
    if(year && age<0){realism='Revisa el año indicado';cls='bad'}
    $('pubResult').innerHTML=`<div class="public-result ${cls}"><div><span>Lectura inicial</span><b>${realism}</b></div><div><span>Presupuesto máximo</span><b>${euro(budget)}</b></div><div><span>Compra máxima orientativa en origen</span><b>${euro(maxPurchase)}</b></div><div><span>Reserva estimada para costes + servicio</span><b>${euro(importCosts+targetMargin)}</b></div><p>Esta es una estimación inicial, no una oferta. El precio real depende de la unidad, impuestos, emisiones, transporte, documentación y verificación.</p></div>`;
    $('leadVehicle').value=brand||'';$('leadBudget').value=budget||'';$('leadYear').value=year||'';$('leadKm').value=km||'';
  }
  async function submitLead(e){
    e.preventDefault();
    const payload={name:$('leadName').value.trim(),phone:$('leadPhone').value.trim(),email:$('leadEmail').value.trim(),vehicle:$('leadVehicle').value.trim(),budget:+$('leadBudget').value||0,min_year:+$('leadYear').value||null,max_km:+$('leadKm').value||null,status:'nuevo'};
    if(!payload.name||(!payload.phone&&!payload.email)){alert('Indica tu nombre y al menos teléfono o email.');return;}
    try{await window.AutoImportCloud.createLead(payload);const email=payload.email; $('leadStatus').innerHTML='Solicitud guardada. Te contactaremos para validar el encargo.'+(email?` <a href="client.html?signup=1&email=${encodeURIComponent(email)}">Crear acceso de cliente</a>`:''); e.target.reset();}
    catch(err){$('leadStatus').textContent='No se pudo guardar: '+err.message;}
  }
  window.addEventListener('DOMContentLoaded',()=>{
    $('estimateBtn').addEventListener('click',estimate);$('leadForm').addEventListener('submit',submitLead);
    $('cloudMode').textContent=window.AutoImportCloud.enabled?'Nube conectada':'Modo local · nube pendiente';
    estimate();
  });
})();
