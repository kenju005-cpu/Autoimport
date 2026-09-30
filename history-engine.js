/* AutoImport V10 · Capa normalizada de historial VIN.
   Los conectores reales deben transformar la respuesta del proveedor a este formato.
   Nunca se deben guardar secretos/API keys en el frontend. */
(function(global){
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  const HISTORY_PROVIDERS={
    carvertical:{name:'carVertical',status:'available_b2b',statusText:'API B2B verificada · acceso por solicitud',mode:'backend',note:'API oficial para VIN/vehicle history. Requiere acuerdo/credenciales B2B.'},
    autodna:{name:'autoDNA',status:'available_b2b',statusText:'WebAPI partner verificada · acceso por solicitud',mode:'backend',note:'WebAPI oficial para partners. Requiere alta/acuerdo.'},
    demo_history:{name:'Historial DEMO',status:'demo',statusText:'DEMO activo',mode:'local',note:'Solo sirve para probar la lógica hasta disponer de credenciales reales.'}
  };

  function vinLooksValid(vin){
    return /^[A-HJ-NPR-Z0-9]{17}$/.test(String(vin||'').trim().toUpperCase());
  }

  function normalizeHistoryReport(raw={},provider='demo_history'){
    return {
      provider,
      vin:String(raw.vin||'').trim().toUpperCase(),
      status:raw.status||'complete',
      generatedAt:raw.generatedAt||new Date().toISOString(),
      vehicle:{make:raw.vehicle?.make||'',model:raw.vehicle?.model||'',year:Number(raw.vehicle?.year)||null},
      damage:{status:raw.damage?.status||'unknown',count:Number(raw.damage?.count)||0,estimatedCost:Number(raw.damage?.estimatedCost)||0},
      odometer:{status:raw.odometer?.status||'unknown',lastKm:Number(raw.odometer?.lastKm)||null,records:Number(raw.odometer?.records)||0},
      theft:raw.theft||'unknown',
      titleStatus:raw.titleStatus||'unknown',
      usage:raw.usage||'unknown',
      owners:Number(raw.owners)||null,
      serviceRecords:Number(raw.serviceRecords)||0,
      photos:Number(raw.photos)||0,
      countryRecords:Array.isArray(raw.countryRecords)?raw.countryRecords:[],
      usOrigin:Boolean(raw.usOrigin),
      sourceNote:raw.sourceNote||''
    };
  }

  function assessHistoryReport(report={},listing={}){
    let score=100;
    const blockers=[],warnings=[],positives=[];
    if(!vinLooksValid(report.vin)){score-=20;warnings.push('VIN no válido o no disponible en el informe')}

    const d=report.damage?.status||'unknown';
    if(d==='major'){score-=42;blockers.push('Daños estructurales o graves registrados')}
    else if(d==='minor'){score-=14;warnings.push('Daños/reparaciones registrados: revisar facturas y calidad')}
    else if(d==='none') positives.push('Sin daños registrados en las fuentes consultadas');
    else {score-=8;warnings.push('Cobertura de daños no concluyente')}

    const o=report.odometer?.status||'unknown';
    if(o==='rollback'){score-=45;blockers.push('Posible manipulación o retroceso de kilometraje')}
    else if(o==='consistent') positives.push('Registros de kilometraje coherentes');
    else {score-=12;warnings.push('Kilometraje sin suficiente contraste histórico')}

    if(report.theft==='stolen'){score-=70;blockers.push('Vehículo marcado como robado')}
    else if(report.theft==='clear') positives.push('Sin alerta de robo en las fuentes consultadas');
    else {score-=5;warnings.push('Estado de robo sin cobertura suficiente')}

    if(report.titleStatus==='salvage'){score-=38;blockers.push('Estado salvage/siniestro total registrado')}
    else if(report.titleStatus==='clean') positives.push('Sin estado salvage registrado');

    if(report.usage==='taxi'||report.usage==='rental'){score-=12;warnings.push(`Uso anterior declarado: ${report.usage==='taxi'?'taxi':'alquiler'}`)}
    if(report.usOrigin){score-=7;warnings.push('Origen EE. UU. detectado: revisar historial, homologación y reparaciones')}

    if(report.serviceRecords>=5) positives.push(`${report.serviceRecords} registros de servicio/mantenimiento`);
    else if(report.serviceRecords===0){score-=6;warnings.push('Sin registros de mantenimiento en el proveedor')}

    if(report.countryRecords?.length>=2) positives.push(`Historial con registros en ${report.countryRecords.length} países`);
    if(report.photos>=2) positives.push(`${report.photos} fotos históricas disponibles`);

    const last=Number(report.odometer?.lastKm||0), listed=Number(listing.km||0);
    if(last&&listed&&last>listed+5000){score-=28;blockers.push('El último kilometraje histórico supera al anunciado')}
    else if(last&&listed&&Math.abs(last-listed)<=15000) positives.push('Kilometraje histórico cercano al anunciado');

    score=Math.round(clamp(score,0,100));
    let level='Alta',decision='HISTORIAL FAVORABLE';
    if(blockers.length){level='Muy baja';decision='NO COMPRAR AÚN'}
    else if(score<55){level='Baja';decision='ALTO RIESGO'}
    else if(score<75){level='Media';decision='REVISAR INFORME'}
    else if(score<88){level='Buena';decision='REVISAR PENDIENTES'}

    let extraReserve=0;
    if(blockers.length) extraReserve=2200;
    else if(score<55) extraReserve=1600;
    else if(score<75) extraReserve=950;
    else if(score<88) extraReserve=450;

    return {score,level,decision,extraReserve,blockers,warnings:warnings.slice(0,7),positives:positives.slice(0,7)};
  }

  function historyToVerificationPatch(report){
    if(!report) return {};
    const patch={};
    if(report.damage?.status==='none') patch.accidentHistory='none';
    if(report.damage?.status==='minor'||report.damage?.status==='major') patch.accidentHistory='repaired';
    if(report.odometer?.status==='consistent') patch.mileageConsistency='yes';
    if(report.odometer?.status==='rollback') patch.mileageConsistency='no';
    if(report.serviceRecords>=5) patch.serviceHistory='full';
    else if(report.serviceRecords>0) patch.serviceHistory='partial';
    return patch;
  }

  function deterministicDemoHistory(car,vin){
    const n=[...String(car.id||'1')].reduce((a,c)=>a+c.charCodeAt(0),0);
    const cases=[
      {damage:'none',odo:'consistent',theft:'clear',title:'clean',usage:'normal'},
      {damage:'minor',odo:'consistent',theft:'clear',title:'clean',usage:'normal'},
      {damage:'none',odo:'consistent',theft:'clear',title:'clean',usage:'rental'},
      {damage:'minor',odo:'unknown',theft:'clear',title:'clean',usage:'normal'}
    ];
    const c=cases[n%cases.length];
    return normalizeHistoryReport({
      vin,vehicle:{make:car.make,model:car.model,year:car.year},
      damage:{status:c.damage,count:c.damage==='none'?0:1,estimatedCost:c.damage==='minor'?1800:0},
      odometer:{status:c.odo,lastKm:Math.max(0,car.km-(n%8000)),records:4+(n%5)},
      theft:c.theft,titleStatus:c.title,usage:c.usage,owners:car.owners||2,
      serviceRecords:car.serviceHistory==='full'?7:3,photos:n%4,countryRecords:['DE'],usOrigin:false,
      sourceNote:'Informe simulado para desarrollo. No contiene datos reales.'
    },'demo_history');
  }

  global.HISTORY_PROVIDERS=HISTORY_PROVIDERS;
  global.normalizeHistoryReport=normalizeHistoryReport;
  global.assessHistoryReport=assessHistoryReport;
  global.historyToVerificationPatch=historyToVerificationPatch;
  global.deterministicDemoHistory=deterministicDemoHistory;
})(window);
