/* Twin-specific bridge: domain input P -> API -> confirmed KPIs.
 * This file does not build meshes, modify equations, or calculate finance.
 */
(function(){
 const client=window.CarbonTwinClient;
 const status=document.getElementById('syncStatus');
 let site=new URLSearchParams(location.search).get('site')||client.loadDraft()?.siteId||'generic';
 const hasURLInputs=[...new URLSearchParams(location.search).keys()].some(k=>[...Object.keys(E.P0),'year'].includes(k));
 const previous=client.loadDraft();
 if(previous&&!hasURLInputs&&previous.params){
  Object.assign(P,E.validate({...P,...previous.params}).p);
  if(Number.isInteger(previous.year))SY=Math.max(2025,Math.min(2050,previous.year));
  if(previous.finance)Object.assign(window.TEA_CONFIG,previous.finance);
  update();
 }
 const provenance=document.createElement('div');provenance.id='apiValidation';
 provenance.textContent='Numerical values are an illustrative local preview until confirmed by the API. Scene geometry remains conceptual.';
 document.getElementById('kpis').insertAdjacentElement('afterend',provenance);
 window.CarbonTwinSync=client.connect({
  read:()=>({params:{...P},year:SY,finance:{...window.TEA_CONFIG},siteId:site}),
  onStatus:(state,message)=>{status.textContent=message;status.classList.toggle('online',state==='online');status.classList.toggle('warning',state==='warning')},
  onResult:data=>{
   const m=data.metrics,local=E.at(P,SY,window.TEA_CONFIG).r;
   const mismatch=Math.max(Math.abs(local.net-m.netMt),Math.abs(local.cap-m.capturedMt),Math.abs(fin(P).npv-m.npvMUsd));
   provenance.textContent=mismatch>1e-7?
     'WARNING: Local preview differs from backend model; check engine version and configuration.':
     `API result · ${data.modelVersion} · input ${data.inputHash} · 26-year pathway · ${data.quality} assumptions`;
   provenance.style.borderLeftColor=mismatch>1e-7?'#ef995c':'#2ac4bb';
   if(simOn&&data.finance){
    const fx=data.finance;
    renderFinance({...fx,npv:fx.npvMUsd,capexGross:fx.grossCapexMUsd,opex:fx.opexMUsdPerYear,
      payback:fx.paybackYear,lcoc:fx.lcocUsdPerTon});
    document.getElementById('financeFlow').dataset.source='backend';
   }
   // Numeric cards now reflect the server result, not independent frontend math.
   const cards=[
    ['Horizon-adjusted CO₂ (Mt)',m.netMt,'var(--or)'],
    ['CO₂ per t steel',m.intensityTonPerTon,'var(--or)'],
    ['Captured / stored (Mt)',m.capturedMt,'var(--cy)',m.storedRetainedMt],
    ['Avoided vs baseline',m.avoidedVsBauMt,'var(--gr)',null]
   ];
   document.getElementById('kpis').innerHTML=cards.map(([title,value,color,other],i)=>{
    const display=i===2?value.toFixed(2)+' / '+other.toFixed(2):i===3?
      value.toFixed(2)+' ('+(m.baselineNetMt?((value/m.baselineNetMt)*100).toFixed(0):'0')+'%)':value.toFixed(2);
    return `<div class="k"><small>${title}</small><b style="color:${color}">${display}</b></div>`;
   }).join('');
   // 3D particle rates are sourced from the accepted backend values.
   rate[0]=m.scope1ReleasedMt*28;rate[1]=m.scope2ProxyMt*30;
   rate[2]=m.capturedMt*55;rate[3]=m.scope1GrossMt*10;
   if(data.physical){tint(data.physical);skin(data.physical);}
  }
 });
 window.CarbonTwinSync.schedule();
 window.addEventListener('storage',event=>{
  if(event.key!==client.key)return;
  const data=client.loadDraft();if(!data?.params)return;
  site=data.siteId||site;
  Object.assign(P,E.validate({...P,...data.params}).p);
  if(Number.isInteger(data.year))SY=data.year;
  if(data.finance)Object.assign(window.TEA_CONFIG,data.finance);
  update();
 });
})();
