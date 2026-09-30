// Registro extensible de países y plataformas.
// Añadir una fuente nueva aquí NO obliga a cambiar el motor de rentabilidad.
const COUNTRY_REGISTRY = {
  DE:{name:'Alemania',currency:'EUR',roles:['origin']},
  ES:{name:'España',currency:'EUR',roles:['destination']},
  BE:{name:'Bélgica',currency:'EUR',roles:['origin'],planned:true},
  NL:{name:'Países Bajos',currency:'EUR',roles:['origin'],planned:true},
  FR:{name:'Francia',currency:'EUR',roles:['origin'],planned:true},
  IT:{name:'Italia',currency:'EUR',roles:['origin'],planned:true},
  AT:{name:'Austria',currency:'EUR',roles:['origin'],planned:true},
  LU:{name:'Luxemburgo',currency:'EUR',roles:['origin'],planned:true}
};

const SOURCE_REGISTRY = {
  mobile_de:{name:'mobile.de',country:'DE',role:'origin',status:'requested',statusText:'API solicitada',capabilities:['search','detail','deeplink'],note:'Conector preparado; esperando activación/credenciales.'},
  autoscout24_de:{name:'AutoScout24',country:'DE',role:'origin',status:'planned',statusText:'Por evaluar',capabilities:[],note:'Fuente futura; se integrará solo mediante acceso permitido/oficial.'},
  kleinanzeigen_de:{name:'Kleinanzeigen',country:'DE',role:'origin',status:'planned',statusText:'Por evaluar',capabilities:[],note:'Fuente futura; acceso técnico y condiciones por validar.'},

  coches_net:{name:'coches.net',country:'ES',role:'destination',status:'requested',statusText:'Solicitud enviada',capabilities:['comparables'],note:'Solicitud de API/feed/colaboración enviada.'},
  milanuncios_es:{name:'Milanuncios',country:'ES',role:'destination',status:'planned',statusText:'Por solicitar/evaluar',capabilities:['comparables'],note:'Previsto como fuente adicional de comparables, especialmente particulares.'},
  autoscout24_es:{name:'AutoScout24 España',country:'ES',role:'destination',status:'planned',statusText:'Por evaluar',capabilities:['comparables'],note:'Fuente futura para diversificar el mercado español.'},
  wallapop_motor_es:{name:'Wallapop Motor',country:'ES',role:'destination',status:'planned',statusText:'Por evaluar',capabilities:['comparables'],note:'Fuente futura; integración solo si existe vía autorizada y estable.'},

  demo_de:{name:'Dataset demo Alemania',country:'DE',role:'origin',status:'demo',statusText:'DEMO activo',capabilities:['search','detail'],note:'Solo para desarrollo mientras llegan accesos reales.'},
  demo_es:{name:'Dataset demo España',country:'ES',role:'destination',status:'demo',statusText:'DEMO activo',capabilities:['comparables'],note:'Solo para validar comparables y rentabilidad.'}
};

window.COUNTRY_REGISTRY=COUNTRY_REGISTRY;
window.SOURCE_REGISTRY=SOURCE_REGISTRY;
