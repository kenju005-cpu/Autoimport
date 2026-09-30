/* AutoImport V10 · Motor de riesgo explicable + verificación previa
   Devuelve riesgo mecánico/comercial y una reserva sugerida. Es heurístico:
   no sustituye inspección, historial oficial ni diagnóstico del vehículo. */
(function(global){
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  function assessVehicleRisk(car, market, opts={}){
    const currentYear=opts.currentYear||2026;
    const configuredReserve=Number(opts.configuredReserve||0);
    const verification=opts.verification||null;
    const history=opts.history||null;
    let score=8;
    const reasons=[];
    const positives=[];

    const age=Math.max(0,currentYear-Number(car.year||currentYear));
    if(age>=12){score+=22;reasons.push(`Antigüedad alta: ${age} años`)}
    else if(age>=9){score+=15;reasons.push(`Antigüedad: ${age} años`)}
    else if(age>=6){score+=9;reasons.push(`Antigüedad moderada: ${age} años`)}
    else positives.push(`Antigüedad contenida: ${age} años`);

    const km=Number(car.km||0);
    if(km>180000){score+=28;reasons.push(`Kilometraje muy alto: ${km.toLocaleString('es-ES')} km`)}
    else if(km>140000){score+=20;reasons.push(`Kilometraje alto: ${km.toLocaleString('es-ES')} km`)}
    else if(km>100000){score+=12;reasons.push(`Más de 100.000 km`)}
    else if(km>70000){score+=6;reasons.push(`Kilometraje medio: ${km.toLocaleString('es-ES')} km`)}
    else positives.push(`Kilometraje relativamente bajo: ${km.toLocaleString('es-ES')} km`);

    if(car.hp>=300){score+=8;reasons.push('Potencia elevada: posible mantenimiento más caro')}
    else if(car.hp>=220){score+=4;reasons.push('Potencia alta: conviene revisar desgaste y mantenimiento')}

    if(car.fuel==='Diésel' && km>120000){score+=6;reasons.push('Diésel con kilometraje alto: revisar sistema anticontaminación')}
    if(car.fuel==='Híbrido' && age>=6){score+=5;reasons.push('Híbrido veterano: revisar batería y sistema de alta tensión')}
    if(car.fuel==='Eléctrico'){
      if(car.batteryHealth!=null){
        if(car.batteryHealth<80){score+=14;reasons.push(`Salud de batería baja: ${car.batteryHealth}%`)}
        else if(car.batteryHealth<88){score+=7;reasons.push(`Salud de batería a comprobar: ${car.batteryHealth}%`)}
        else positives.push(`Salud de batería declarada: ${car.batteryHealth}%`);
      } else {score+=5;reasons.push('Sin dato de salud de batería')}
    }

    const serviceHist=(car.serviceHistory||'unknown').toLowerCase();
    if(serviceHist==='full'){score-=9;positives.push('Historial de mantenimiento completo')}
    else if(serviceHist==='partial'){score+=6;reasons.push('Historial de mantenimiento parcial')}
    else {score+=11;reasons.push('Historial de mantenimiento no verificado')}

    const accident=(car.accidentHistory||'unknown').toLowerCase();
    if(accident==='none'){score-=5;positives.push('Sin accidentes declarados')}
    else if(accident==='repaired'){score+=16;reasons.push('Accidente/reparación declarada: requiere inspección')}
    else {score+=8;reasons.push('Historial de accidentes desconocido')}

    const owners=Number(car.owners||0);
    if(owners>=4){score+=8;reasons.push(`${owners} propietarios anteriores`)}
    else if(owners===3){score+=4;reasons.push('3 propietarios anteriores')}
    else if(owners>0){positives.push(`${owners} propietario${owners===1?'':'s'} anterior${owners===1?'':'es'}`)}
    else {score+=3;reasons.push('Número de propietarios no disponible')}

    if(car.seller==='Particular'){score+=7;reasons.push('Venta particular: menos cobertura comercial')}
    else if(car.seller==='Profesional'){score-=2;positives.push('Vendedor profesional')}

    const warranty=Number(car.warrantyMonths||0);
    if(warranty>=12){score-=6;positives.push(`Garantía declarada: ${warranty} meses`)}
    else if(warranty>=6){score-=3;positives.push(`Garantía declarada: ${warranty} meses`)}
    else if(car.seller==='Profesional'){score+=3;reasons.push('Garantía no indicada en el anuncio')}


    if(verification){
      if(verification.blockers && verification.blockers.length){
        score+=18;
        reasons.push('Verificación previa bloqueada: '+verification.blockers[0]);
      } else if(verification.score<55){
        score+=16;reasons.push('Verificación previa insuficiente: '+verification.score+'/100');
      } else if(verification.score<75){
        score+=10;reasons.push('Verificación previa incompleta: '+verification.score+'/100');
      } else if(verification.score<88){
        score+=5;reasons.push('Quedan comprobaciones antes de comprar');
      } else {
        score-=5;positives.push('Verificación previa sólida: '+verification.score+'/100');
      }
    } else {
      score+=7;reasons.push('Vehículo aún sin checklist de verificación previa');
    }

    if(history){
      if(history.blockers && history.blockers.length){
        score+=24;reasons.push('Historial VIN con bloqueo: '+history.blockers[0]);
      } else if(history.score<55){
        score+=18;reasons.push('Historial VIN de alto riesgo: '+history.score+'/100');
      } else if(history.score<75){
        score+=11;reasons.push('Historial VIN requiere revisión: '+history.score+'/100');
      } else if(history.score<88){
        score+=4;reasons.push('Historial VIN con puntos pendientes');
      } else {
        score-=7;positives.push('Historial VIN favorable: '+history.score+'/100');
      }
    } else {
      score+=5;reasons.push('Historial VIN aún no consultado');
    }

    const med=Number(market?.median||0);
    if(med>0 && car.price>0){
      const gap=1-car.price/med;
      if(gap>.42){score+=10;reasons.push('Precio extremadamente bajo frente al mercado español: verificar causa')}
      else if(gap>.32){score+=6;reasons.push('Precio muy bajo frente al mercado español: requiere comprobaciones')}
      else if(gap>.18){positives.push('Diferencia de precio atractiva frente a España')}
    }

    const confidence=market?.confidence||'Baja';
    if(confidence==='Baja'){score+=7;reasons.push('Pocos comparables o baja confianza del precio de mercado')}
    else if(confidence==='Alta'){score-=4;positives.push('Comparación de mercado con confianza alta')}

    score=Math.round(clamp(score,0,100));
    let level='Bajo';
    if(score>70) level='Muy alto';
    else if(score>50) level='Alto';
    else if(score>28) level='Medio';

    // Reserva heurística: mínimo configurable + prima por riesgo/complexidad.
    const verificationReserve=verification?Number(verification.extraReserve||0):300;
    const historyReserve=history?Number(history.extraReserve||0):250;
    const suggested=Math.round(Math.max(configuredReserve, 300 + score*18 + verificationReserve + historyReserve + (car.hp>=250?180:0) + (car.fuel==='Híbrido'?180:0) + (car.fuel==='Eléctrico'?220:0))/50)*50;

    return {
      score,level,suggestedReserve:suggested,
      extraReserve:Math.max(0,suggested-configuredReserve),
      reasons:reasons.slice(0,4),positives:positives.slice(0,3)
    };
  }

  global.assessVehicleRisk=assessVehicleRisk;
})(window);
