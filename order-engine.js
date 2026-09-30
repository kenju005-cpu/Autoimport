const ORDER_STAGES=[
  'Encargo recibido','Presupuesto validado','Buscando','Opciones encontradas','Cliente aprueba','Compra','Transporte','ITV / matriculación','Entregado'
];

function medianNumber(values){
  const a=values.filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length)return null;
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}

function normalizeOrder(raw={}){
  const minProfit=Math.max(0,+raw.minProfit||0);
  const targetProfit=Math.max(minProfit,+raw.targetProfit||minProfit);
  return {
    client:(raw.client||'').trim(), phone:(raw.phone||'').trim(), email:(raw.email||'').trim(), reference:(raw.reference||'').trim(), query:(raw.query||'').trim(),
    budget:Math.max(0,+raw.budget||0), minProfit, targetProfit,
    operationBuffer:Math.max(0,+raw.operationBuffer||0),
    minYear:Math.max(0,+raw.minYear||0), maxKm:Math.max(0,+raw.maxKm||0),
    fuel:raw.fuel||'', gear:raw.gear||'', body:raw.body||'', seller:raw.seller||'',
    maxRisk:+raw.maxRisk||4, equipment:(raw.equipment||'').trim(), internalNotes:(raw.internalNotes||'').trim(), status:raw.status||ORDER_STAGES[0]
  };
}

function candidateOrderEconomics(car,order){
  const o=normalizeOrder(order);
  const operationalCost=car.adjustedTotal+o.operationBuffer;
  const minimumClientPrice=operationalCost+o.minProfit;
  const targetClientPrice=operationalCost+o.targetProfit;
  const marginAtBudget=o.budget?o.budget-operationalCost:null;
  const minRoom=o.budget?o.budget-minimumClientPrice:null;
  const targetRoom=o.budget?o.budget-targetClientPrice:null;
  let status='Sin presupuesto';
  let recommendedClientPrice=targetClientPrice;
  if(o.budget>0){
    if(minimumClientPrice>o.budget){status='No viable';recommendedClientPrice=null;}
    else if(targetClientPrice>o.budget){status='Viable ajustado';recommendedClientPrice=minimumClientPrice;}
    else {status='Viable';recommendedClientPrice=targetClientPrice;}
  }
  const protectedProfit=recommendedClientPrice==null?null:recommendedClientPrice-operationalCost;
  const spanishMedian=car.market?.median||null;
  const budgetVsSpanish=spanishMedian&&o.budget?((o.budget/spanishMedian)-1)*100:null;
  return {operationalCost,minimumClientPrice,targetClientPrice,marginAtBudget,minRoom,targetRoom,status,recommendedClientPrice,protectedProfit,spanishMedian,budgetVsSpanish};
}

function assessOrder(candidates,order){
  const o=normalizeOrder(order);
  if(!o.query)return {level:'Pendiente',message:'Indica qué coche quiere el cliente para validar el encargo.',viable:0,targetViable:0,minimumRequired:null,targetRequired:null,spanishMarket:null};
  if(!candidates.length)return {level:'Sin candidatos',message:'Todavía no hay candidatos que cumplan marca/modelo y filtros. Amplía criterios o conecta más fuentes.',viable:0,targetViable:0,minimumRequired:null,targetRequired:null,spanishMarket:null};
  const e=candidates.map(c=>c.orderEconomics);
  const viable=e.filter(x=>x.status==='Viable'||x.status==='Viable ajustado').length;
  const targetViable=e.filter(x=>x.status==='Viable').length;
  const minimumRequired=Math.min(...e.map(x=>x.minimumClientPrice));
  const targetRequired=Math.min(...e.map(x=>x.targetClientPrice));
  const spanishMarket=medianNumber(candidates.map(c=>c.market?.median).filter(Boolean));
  if(!o.budget)return {level:'Pendiente',message:`El encargo tiene candidatos. Introduce el presupuesto máximo final del cliente.`,viable,targetViable,minimumRequired,targetRequired,spanishMarket};
  if(targetViable>0)return {level:'Viable',message:`Hay ${targetViable} candidato(s) que permiten cubrir costes, reserva y beneficio objetivo sin superar el presupuesto.`,viable,targetViable,minimumRequired,targetRequired,spanishMarket};
  if(viable>0)return {level:'Ajustado',message:`Hay ${viable} candidato(s) que protegen tu beneficio mínimo, pero no alcanzan el beneficio objetivo dentro del presupuesto.`,viable,targetViable,minimumRequired,targetRequired,spanishMarket};
  const gap=minimumRequired-o.budget;
  const near=gap/minimumRequired<=0.10;
  return {level:near?'Presupuesto bajo':'No viable',message:`Con los candidatos actuales faltan aproximadamente ${Math.max(0,Math.round(gap)).toLocaleString('es-ES')} € para cubrir todos los costes y tu beneficio mínimo.`,viable,targetViable,minimumRequired,targetRequired,spanishMarket};
}

function orderLevelClass(level){
  if(level==='Viable')return 'good';
  if(level==='Ajustado'||level==='Presupuesto bajo'||level==='Pendiente')return 'warn';
  return 'bad';
}
