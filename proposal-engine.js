const PROPOSAL_STATUSES=['Borrador','Enviada al cliente','Aceptada','Señal pendiente','Señal pagada','Operación en curso','Cerrada','Cancelada'];
const SELLER_PAYMENT_STATUSES=['Pendiente','Ordenado por el cliente','Pagado al vendedor','Confirmado por vendedor'];

function normalizeProposal(raw={},car=null,order={}){
  const suggested=car?.orderEconomics?.recommendedClientPrice||car?.orderEconomics?.minimumClientPrice||0;
  const finalPrice=Math.max(0,+raw.finalPrice||suggested||0);
  const depositMode=raw.depositMode==='percent'?'percent':'fixed';
  const depositValue=Math.max(0,+raw.depositValue||2500);
  const depositAmount=depositMode==='percent'?finalPrice*depositValue/100:depositValue;
  const payments=Array.isArray(raw.payments)?raw.payments.filter(x=>+x.amount>0).map(x=>({id:x.id||'',chargeId:x.chargeId||'',date:x.date||new Date().toISOString().slice(0,10),concept:(x.concept||'Pago').trim(),amount:+x.amount,method:x.method||'Transferencia bancaria',reference:(x.reference||'').trim()})) : [];
  const paymentPlan=Array.isArray(raw.paymentPlan)?raw.paymentPlan.map(x=>({id:x.id||'',type:x.type||'Otro',concept:(x.concept||'Cobro').trim(),expected:Math.max(0,+x.expected||0),dueDate:x.dueDate||'',notes:(x.notes||'').trim()})) : [];
  const paid=payments.reduce((a,x)=>a+x.amount,0);
  const sp=raw.sellerPayment||{};
  const sellerPayment={
    seller:(sp.seller||'').trim(),
    amount:Math.max(0,+sp.amount||car?.price||0),
    status:SELLER_PAYMENT_STATUSES.includes(sp.status)?sp.status:'Pendiente',
    date:sp.date||'',
    reference:(sp.reference||'').trim(),
    proofName:(sp.proofName||'').trim()
  };
  const sellerPaid=['Pagado al vendedor','Confirmado por vendedor'].includes(sellerPayment.status)?sellerPayment.amount:0;
  const operationPaid=paid+sellerPaid;
  return {
    carId:raw.carId||car?.id||'',client:(raw.client||order.client||'').trim(),contact:(raw.contact||order.phone||order.email||'').trim(),
    status:raw.status||PROPOSAL_STATUSES[0],finalPrice,depositMode,depositValue,depositAmount,payments,paymentPlan,paid,
    sellerPayment,sellerPaid,operationPaid,
    balance:Math.max(0,finalPrice-operationPaid),signalCovered:paid+0.01>=depositAmount,
    delivery:(raw.delivery||'Entrega estimada tras compra, transporte y matriculación').trim(),
    validity:(raw.validity||'7 días').trim(),
    includes:(raw.includes||'Búsqueda y selección del vehículo; verificación; coordinación de compra; transporte a España; trámites de importación, ITV y matriculación según presupuesto; seguimiento del encargo.').trim(),
    notes:(raw.notes||'El vehículo se paga directamente al vendedor por el cliente. La propuesta queda sujeta a disponibilidad, verificación y confirmación de costes externos.').trim(),
    updatedAt:raw.updatedAt||new Date().toISOString()
  };
}

function proposalEconomics(proposal,car,order){
  if(!car)return {ready:false,reason:'Selecciona un vehículo.',profit:null};
  const p=normalizeProposal(proposal,car,order),operational=car.orderEconomics?.operationalCost||car.adjustedTotal+(order.operationBuffer||0),profit=p.finalPrice-operational;
  const minAllowed=operational+(order.minProfit||0),target=operational+(order.targetProfit||0);
  const meetsMin=profit>=(order.minProfit||0),meetsTarget=profit>=(order.targetProfit||0),withinBudget=!order.budget||p.finalPrice<=order.budget;
  const serviceFee=Math.max(0,profit);
  const thirdPartyCosts=Math.max(0,operational-car.price);
  const warnings=[];
  if(!meetsMin)warnings.push(`El precio final no protege el beneficio mínimo de ${Math.round(order.minProfit||0).toLocaleString('es-ES')} €.`);
  if(!withinBudget)warnings.push('El precio final supera el presupuesto máximo indicado por el cliente.');
  if(p.depositAmount>p.finalPrice)warnings.push('La señal no puede superar el precio final.');
  if(p.sellerPayment.amount<=0)warnings.push('Indica el importe que el cliente pagará directamente al vendedor.');
  return {ready:meetsMin&&p.finalPrice>0,operational,profit,minAllowed,target,meetsMin,meetsTarget,withinBudget,serviceFee,thirdPartyCosts,warnings};
}

function proposalClientText(p,car,order){
  const eur=n=>Math.round(n||0).toLocaleString('es-ES')+' €';
  const sellerStatus=p.sellerPayment?.status||'Pendiente';
  return `${order.reference?`Encargo ${order.reference}\n`:''}${p.client?`Cliente: ${p.client}\n`:''}\nVehículo propuesto: ${car.name}\n${car.year} · ${car.km.toLocaleString('es-ES')} km · ${car.fuel} · ${car.gear}\n\nPrecio total estimado de la operación: ${eur(p.finalPrice)}\nPago del vehículo al vendedor: ${eur(p.sellerPayment?.amount||car.price)} · ${sellerStatus}\nSeñal / reserva a la intermediación: ${eur(p.depositAmount)}\nPagado a la intermediación: ${eur(p.paid)}\nPendiente estimado de la operación: ${eur(p.balance)}\n\nIMPORTANTE: el precio del vehículo se paga directamente por el cliente al vendedor. Ese importe no se cobra por la intermediación.\n\nIncluye: ${p.includes}\nEntrega: ${p.delivery}\nValidez: ${p.validity}\n\n${p.notes}`;
}
