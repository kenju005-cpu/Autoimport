const CRM_STAGES=['Encargo recibido','Presupuesto validado','Buscando','Opciones encontradas','Cliente aprueba','Compra','Transporte','ITV / matriculación','Entregado'];

function newCrmId(){
  return 'ord-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
}
function normalizeCrmRecord(raw={}){
  const now=new Date().toISOString();
  return {
    id:raw.id||newCrmId(),
    createdAt:raw.createdAt||now,
    updatedAt:now,
    order:raw.order||{},
    proposal:raw.proposal||{payments:[]},
    contract:raw.contract||{},
    selectedCarId:raw.selectedCarId||raw.proposal?.carId||'',
  };
}
function crmSummary(records=[]){
  const total=records.length;
  const active=records.filter(r=>r.order?.status!=='Entregado').length;
  const delivered=records.filter(r=>r.order?.status==='Entregado').length;
  const searching=records.filter(r=>['Buscando','Opciones encontradas'].includes(r.order?.status)).length;
  const paymentPending=records.filter(r=>{
    const p=r.proposal||{};
    const expected=(p.paymentPlan||[]).reduce((a,x)=>a+(+x.expected||0),0);
    const received=(p.payments||[]).reduce((a,x)=>a+(+x.amount||0),0);
    return ['Aceptada','Señal pendiente'].includes(p.status)||(expected>0?received+0.01<expected:(p.depositAmount||0)>(p.paid||0));
  }).length;
  return {total,active,delivered,searching,paymentPending};
}
