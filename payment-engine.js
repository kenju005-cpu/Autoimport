const PAYMENT_PLAN_TYPES=['Reserva / anticipo','Gastos gestionados','Comisión restante','Otro'];
const PAYMENT_METHODS=['Transferencia bancaria','Reserva coordinada por WhatsApp','Otro'];

function newPaymentId(prefix='pay'){
  return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
}
function normalizeScheduleItem(x={}){
  return {
    id:x.id||newPaymentId('chg'),
    type:PAYMENT_PLAN_TYPES.includes(x.type)?x.type:'Otro',
    concept:(x.concept||x.type||'Cobro').trim(),
    expected:Math.max(0,+x.expected||0),
    dueDate:x.dueDate||'',
    notes:(x.notes||'').trim()
  };
}
function normalizeReceipt(x={}){
  return {
    id:x.id||newPaymentId('rcp'),
    chargeId:x.chargeId||'',
    date:x.date||new Date().toISOString().slice(0,10),
    concept:(x.concept||'Pago').trim(),
    amount:Math.max(0,+x.amount||0),
    method:PAYMENT_METHODS.includes(x.method)?x.method:'Transferencia bancaria',
    reference:(x.reference||'').trim()
  };
}
function buildAutomaticPaymentPlan(proposal, economics){
  const totalToUs=Math.max(0,(proposal.finalPrice||0)-(proposal.sellerPayment?.amount||0));
  const serviceFee=Math.max(0,economics?.profit||0);
  const managedCosts=Math.max(0,totalToUs-serviceFee);
  const deposit=Math.min(Math.max(0,proposal.depositAmount||0),totalToUs);
  const depositAppliedToFee=Math.min(deposit,serviceFee);
  const depositExcess=Math.max(0,deposit-serviceFee);
  const commissionRemaining=Math.max(0,serviceFee-depositAppliedToFee);
  const managedRemaining=Math.max(0,managedCosts-depositExcess);
  const items=[];
  if(deposit>0)items.push(normalizeScheduleItem({id:'auto-deposit',type:'Reserva / anticipo',concept:'Señal / reserva',expected:deposit}));
  if(managedRemaining>0)items.push(normalizeScheduleItem({id:'auto-expenses',type:'Gastos gestionados',concept:'Gastos de importación y gestiones',expected:managedRemaining}));
  if(commissionRemaining>0)items.push(normalizeScheduleItem({id:'auto-commission',type:'Comisión restante',concept:'Comisión / servicio restante',expected:commissionRemaining}));
  const planned=items.reduce((a,x)=>a+x.expected,0);
  const diff=totalToUs-planned;
  if(diff>0.01)items.push(normalizeScheduleItem({id:'auto-adjust',type:'Otro',concept:'Ajuste de operación',expected:diff}));
  return items;
}
function paymentSummary(plan=[],receipts=[]){
  plan=(plan||[]).map(normalizeScheduleItem);receipts=(receipts||[]).map(normalizeReceipt);
  const expected=plan.reduce((a,x)=>a+x.expected,0);
  const received=receipts.reduce((a,x)=>a+x.amount,0);
  const byCharge={};
  receipts.forEach(r=>{byCharge[r.chargeId]=(byCharge[r.chargeId]||0)+r.amount});
  const rows=plan.map(x=>{
    const paid=byCharge[x.id]||0,remaining=Math.max(0,x.expected-paid);
    const status=paid+0.01>=x.expected?'Pagado':paid>0?'Parcial':'Pendiente';
    return {...x,paid,remaining,status};
  });
  return {expected,received,pending:Math.max(0,expected-received),rows};
}
