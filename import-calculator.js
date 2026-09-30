// Motor fiscal y de costes de importación España (V7).
// Los importes administrativos variables se mantienen configurables.
// Bizkaia: IEDMT por CO2: <120 0%, 120-<160 4,75%, 160-<200 9,75%, >=200 14,75%.
// Compra de usado UE a particular: ITP estimado 4% en Bizkaia.

const SPAIN_IMPORT_RULES = {
  ES_BI: {
    name: 'Bizkaia',
    dgtFee: 99.77,
    privateUsedItpRate: 0.04,
    registrationTaxBands: [
      {min:0,max:120,rate:0,label:'< 120 g/km'},
      {min:120,max:160,rate:0.0475,label:'120–159 g/km'},
      {min:160,max:200,rate:0.0975,label:'160–199 g/km'},
      {min:200,max:Infinity,rate:0.1475,label:'≥ 200 g/km'}
    ]
  }
};

function registrationTaxRate(co2, region='ES_BI'){
  const rules=SPAIN_IMPORT_RULES[region] || SPAIN_IMPORT_RULES.ES_BI;
  const value=Math.max(0,Number(co2)||0);
  const band=rules.registrationTaxBands.find(b=>value>=b.min && value<b.max) || rules.registrationTaxBands.at(-1);
  return {...band};
}

function calculateSpainImport(input={}){
  const region=input.region || 'ES_BI';
  const rules=SPAIN_IMPORT_RULES[region] || SPAIN_IMPORT_RULES.ES_BI;
  const purchasePrice=Math.max(0,Number(input.purchasePrice)||0);
  const fiscalBase=Math.max(0,Number(input.fiscalBase ?? purchasePrice)||0);
  const co2=Math.max(0,Number(input.co2)||0);
  const sellerType=input.sellerType || 'professional';
  const fiscalStatus=input.fiscalStatus || 'used';
  const band=registrationTaxRate(co2,region);

  // Vehículo "nuevo" a efectos de IVA intracomunitario: el tratamiento fiscal es distinto.
  // V7 no calcula IVA nuevo automáticamente: lo marca para revisión para evitar duplicarlo.
  const needsNewVehicleVatReview=fiscalStatus==='new';
  const itp=(fiscalStatus==='used' && sellerType==='private') ? fiscalBase*rules.privateUsedItpRate : 0;
  const registrationTax=fiscalBase*band.rate;
  const dgt=Number(input.dgtFee ?? rules.dgtFee)||0;
  const transport=Number(input.transport)||0;
  const itv=Number(input.itv)||0;
  const homologation=Number(input.homologation)||0;
  const plates=Number(input.plates)||0;
  const municipalTax=Number(input.municipalTax)||0;
  const gestor=Number(input.gestor)||0;
  const prep=Number(input.prep)||0;
  const risk=Number(input.risk)||0;
  const other=Number(input.other)||0;

  const acquisitionTaxes=itp;
  const adminCosts=dgt+transport+itv+homologation+plates+municipalTax+gestor+prep+risk+other;
  const totalExtras=acquisitionTaxes+registrationTax+adminCosts;
  const landedCost=purchasePrice+totalExtras;

  return {
    region,purchasePrice,fiscalBase,co2,sellerType,fiscalStatus,
    band,registrationTax,itp,dgt,transport,itv,homologation,plates,municipalTax,gestor,prep,risk,other,
    totalExtras,landedCost,needsNewVehicleVatReview
  };
}

window.SPAIN_IMPORT_RULES=SPAIN_IMPORT_RULES;
window.registrationTaxRate=registrationTaxRate;
window.calculateSpainImport=calculateSpainImport;
