const CONTRACT_STATUS={DRAFT:'Borrador',READY:'Listo para aceptar',ACCEPTED:'Aceptado',CHANGED:'Modificado tras aceptación'};

function contractId(){return 'ctr-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
function cleanText(v){return String(v||'').trim()}
function simpleFingerprint(text=''){
  let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(16).padStart(8,'0');
}
function normalizeContract(raw={},proposal={},order={},car=null,settings={}){
  const c={
    id:raw.id||contractId(),
    providerName:cleanText(raw.providerName||settings.providerName),
    providerTaxId:cleanText(raw.providerTaxId||settings.providerTaxId),
    providerAddress:cleanText(raw.providerAddress||settings.providerAddress),
    providerEmail:cleanText(raw.providerEmail||settings.providerEmail),
    clientName:cleanText(raw.clientName||order.client||proposal.client),
    clientId:cleanText(raw.clientId),
    clientAddress:cleanText(raw.clientAddress),
    reference:cleanText(order.reference),
    vehicleRequest:cleanText(order.query),
    selectedVehicle:car?`${car.name} · ${car.year} · ${Number(car.km||0).toLocaleString('es-ES')} km`:'',
    maxBudget:Math.max(0,+order.budget||0),
    proposalPrice:Math.max(0,+proposal.finalPrice||0),
    sellerDirectAmount:Math.max(0,+proposal.sellerPayment?.amount||car?.price||0),
    depositAmount:Math.max(0,+proposal.depositAmount||0),
    scope:cleanText(raw.scope||'Búsqueda y selección de vehículos que se aproximen al encargo del cliente; comparación de ofertas; coordinación de verificaciones documentales y mecánicas disponibles; coordinación de compra, transporte y trámites de importación cuando se hayan contratado expresamente.'),
    directPaymentClause:cleanText(raw.directPaymentClause||'El precio del vehículo será abonado por el cliente directamente al vendedor del vehículo. El intermediario no recibe ni custodia el precio de compra del vehículo.'),
    estimateClause:cleanText(raw.estimateClause||'Los importes de transporte, impuestos, matriculación, ITV, homologación, documentación y otros costes de terceros son estimaciones hasta su confirmación. Cualquier variación relevante deberá comunicarse al cliente antes de continuar.'),
    availabilityClause:cleanText(raw.availabilityClause||'La disponibilidad del vehículo y sus condiciones dependen del vendedor. La aceptación de este encargo no garantiza que una unidad concreta siga disponible hasta que el vendedor confirme la operación.'),
    cancellationTerms:cleanText(raw.cancellationTerms),
    extraTerms:cleanText(raw.extraTerms),
    checks:{
      scope:!!raw.checks?.scope,
      directPayment:!!raw.checks?.directPayment,
      estimates:!!raw.checks?.estimates,
      cancellation:!!raw.checks?.cancellation
    },
    signerName:cleanText(raw.signerName),
    acceptedAt:raw.acceptedAt||'',
    acceptanceId:raw.acceptanceId||'',
    acceptedFingerprint:raw.acceptedFingerprint||'',
    updatedAt:new Date().toISOString()
  };
  const snapshot=contractSnapshot(c);
  c.currentFingerprint=simpleFingerprint(snapshot);
  c.changedAfterAcceptance=!!c.acceptedAt&&c.acceptedFingerprint!==c.currentFingerprint;
  c.accepted=!!c.acceptedAt&&!c.changedAfterAcceptance;
  return c;
}
function contractSnapshot(c){
  return JSON.stringify({
    providerName:c.providerName,providerTaxId:c.providerTaxId,providerAddress:c.providerAddress,providerEmail:c.providerEmail,
    clientName:c.clientName,clientId:c.clientId,clientAddress:c.clientAddress,reference:c.reference,vehicleRequest:c.vehicleRequest,
    selectedVehicle:c.selectedVehicle,maxBudget:c.maxBudget,proposalPrice:c.proposalPrice,sellerDirectAmount:c.sellerDirectAmount,depositAmount:c.depositAmount,
    scope:c.scope,directPaymentClause:c.directPaymentClause,estimateClause:c.estimateClause,availabilityClause:c.availabilityClause,
    cancellationTerms:c.cancellationTerms,extraTerms:c.extraTerms
  });
}
function contractReadiness(c,proposalEconomicsResult=null){
  const missing=[];
  if(!c.providerName)missing.push('Nombre legal / profesional del intermediario');
  if(!c.providerTaxId)missing.push('NIF/CIF del intermediario');
  if(!c.providerAddress)missing.push('Domicilio profesional');
  if(!c.clientName)missing.push('Nombre del cliente');
  if(!c.clientId)missing.push('DNI/NIE/pasaporte del cliente');
  if(!c.cancellationTerms)missing.push('Condiciones de cancelación y devolución de la reserva');
  if(!c.proposalPrice)missing.push('Precio/propuesta económica');
  if(proposalEconomicsResult&&!proposalEconomicsResult.ready)missing.push('La propuesta económica no protege el beneficio mínimo');
  const allChecks=Object.values(c.checks||{}).every(Boolean);
  const signerOk=!!c.signerName;
  return {ready:missing.length===0,missing,allChecks,signerOk,canAccept:missing.length===0&&allChecks&&signerOk};
}
function acceptContract(c){
  const current={...c,checks:{...(c.checks||{})}};
  current.currentFingerprint=simpleFingerprint(contractSnapshot(current));
  current.acceptedAt=new Date().toISOString();
  current.acceptanceId='ACC-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
  current.acceptedFingerprint=current.currentFingerprint;
  current.changedAfterAcceptance=false;
  current.accepted=true;
  return current;
}
function revokeContractAcceptance(c){return {...c,acceptedAt:'',acceptanceId:'',acceptedFingerprint:'',accepted:false,changedAfterAcceptance:false,updatedAt:new Date().toISOString()}}
function contractStatus(c,ready){if(c.accepted)return CONTRACT_STATUS.ACCEPTED;if(c.changedAfterAcceptance)return CONTRACT_STATUS.CHANGED;return ready?CONTRACT_STATUS.READY:CONTRACT_STATUS.DRAFT}
