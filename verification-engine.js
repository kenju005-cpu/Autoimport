(function(global){
  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
  function vinLooksValid(vin){
    const v=String(vin||'').trim().toUpperCase();
    return /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
  }

  function assessPrePurchaseVerification(data={}){
    let score=100;
    const blockers=[];
    const warnings=[];
    const positives=[];
    const vin=String(data.vin||'').trim().toUpperCase();

    if(!vin){score-=12;warnings.push('VIN no introducido')}
    else if(!vinLooksValid(vin)){score-=18;warnings.push('El VIN no tiene un formato estándar válido de 17 caracteres')}
    else positives.push('VIN con formato válido (no verifica autenticidad)');

    if(data.registrationDocs!=='yes'){
      score-=28;blockers.push('Falta la documentación original de matriculación del vehículo');
    } else positives.push('Documentación original del vehículo disponible');

    if(data.ownershipProof!=='yes'){
      score-=22;blockers.push('Falta factura o contrato que acredite la compra');
    } else positives.push('Factura/contrato de compra disponible');

    if(data.technicalDocs!=='yes'){
      score-=14;warnings.push('Falta documentación técnica suficiente para ITV/homologación (CoC o alternativa válida)');
    } else positives.push('Documentación técnica disponible');

    if(data.roadworthiness==='valid') positives.push('Inspección técnica/HU-TÜV declarada en vigor');
    else if(data.roadworthiness==='expired'){score-=10;warnings.push('Inspección técnica/HU-TÜV caducada')}
    else {score-=6;warnings.push('No se ha confirmado el estado de la inspección técnica/HU-TÜV')}

    if(data.serviceHistory==='full') positives.push('Historial de mantenimiento completo');
    else if(data.serviceHistory==='partial'){score-=6;warnings.push('Historial de mantenimiento parcial')}
    else {score-=12;warnings.push('Sin historial de mantenimiento verificable')}

    if(data.accidentHistory==='none') positives.push('Sin accidentes declarados');
    else if(data.accidentHistory==='repaired'){score-=10;warnings.push('Accidente/reparación declarada: revisar calidad de reparación')}
    else {score-=7;warnings.push('Historial de accidentes sin verificar')}

    if(data.independentInspection==='pass') positives.push('Inspección mecánica independiente superada');
    else if(data.independentInspection==='issues'){score-=18;warnings.push('La inspección independiente detectó problemas')}
    else {score-=9;warnings.push('Aún no se ha realizado inspección mecánica independiente')}

    if(data.mileageConsistency==='yes') positives.push('Kilometraje/documentación coherentes');
    else if(data.mileageConsistency==='no'){score-=24;blockers.push('Inconsistencia de kilometraje detectada')}
    else {score-=9;warnings.push('Kilometraje todavía no contrastado')}

    if(data.sellerIdentity==='yes') positives.push('Identidad/datos del vendedor comprobados');
    else {score-=15;blockers.push('Identidad o datos del vendedor sin comprobar')}

    if(data.modified==='no') positives.push('Sin modificaciones relevantes declaradas');
    else if(data.modified==='yes'){score-=9;warnings.push('Vehículo modificado: revisar homologación y documentación')}
    else {score-=3;warnings.push('No se ha confirmado si el vehículo tiene modificaciones')}

    score=Math.round(clamp(score,0,100));
    let level='Alta';
    let decision='DOCUMENTACIÓN BIEN';
    if(blockers.length){level='Muy baja';decision='NO COMPRAR AÚN'}
    else if(score<55){level='Baja';decision='ALTO RIESGO'}
    else if(score<75){level='Media';decision='REVISAR ANTES DE COMPRAR'}
    else if(score<88){level='Buena';decision='REVISAR PENDIENTES'}

    let extraReserve=0;
    if(blockers.length) extraReserve=1800;
    else if(score<55) extraReserve=1400;
    else if(score<75) extraReserve=900;
    else if(score<88) extraReserve=400;

    return {score,level,decision,extraReserve,blockers,warnings:warnings.slice(0,6),positives:positives.slice(0,6),vinValid:vinLooksValid(vin),vin};
  }

  global.vinLooksValid=vinLooksValid;
  global.assessPrePurchaseVerification=assessPrePurchaseVerification;
})(window);
