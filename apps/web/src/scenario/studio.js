(function(){
 'use strict';
 const E=window.CarbonEngine,F=window.FinancialEngine,api=window.CarbonTwinClient;
 const $=s=>document.querySelector(s);
 const fmt=(n,d=2)=>Number(n).toLocaleString('en-US',{maximumFractionDigits:d});
 const defs={...E.P0},fdefs={...F.DEFAULTS};
 const cfg=[
  ['so','Solar share',0,100,1,'%'],['wi','Wind share',0,100,1,'%'],['ot','Other low-carbon share',0,100,1,'%'],
  ['eff','Efficiency improvement',0,50,1,'%'],['el','Electrification',0,100,1,'%'],['cap','Capture rate',0,100,1,'%'],
  ['pen','Capture electricity penalty',0,1,.01,' MWh/t'],['perm','100-year storage retention',90,100,1,'%'],
  ['cp','Carbon price',0,250,5,' $/t'],['yr','Adoption start',2025,2050,1,''],['dur','Deployment duration',1,25,1,' yr'],
  ['ed','Base electricity demand',100,5000,50,' GWh'],['ef','Fossil power factor',0,1.2,.01,' kg/kWh']
 ];
 const fcfg=[['discount','Discount rate',0,25,.5,'%'],['captureCapex','Capture CAPEX',0,900,10,' $/t-year'],
  ['transportCapex','Transport CAPEX',0,300,5,' $/t-year'],['storageCapex','Storage CAPEX',0,300,5,' $/t-year'],
  ['captureOpex','Capture OPEX',0,100,1,' $/t'],['transportOpex','Transport OPEX',0,100,1,' $/t'],
  ['storageOpex','Storage OPEX',0,100,1,' $/t'],['powerPrice','Power price',0,.3,.005,' $/kWh'],
  ['policyEligible','Hypothetical monetization',0,100,5,'%'],['utilShare','Utilization share',0,100,5,'%']];
 let draft={params:defs,finance:fdefs,year:2050,siteId:new URLSearchParams(location.search).get('site')||'generic'};
 const stored=api.loadDraft();if(stored){draft.params={...defs,...stored.params};draft.finance={...fdefs,...stored.finance};draft.year=stored.year||2050;draft.siteId=stored.siteId||draft.siteId}
 const q=new URLSearchParams(location.search);
 let urlPatch=false;
 for(const key of Object.keys(defs))if(q.has(key)){
  const v=key==='ccs'?q.get(key)==='1'||q.get(key)==='true':Number(q.get(key));
  if(key==='ccs'||Number.isFinite(v)){draft.params[key]=v;urlPatch=true}
 }
 if(urlPatch)draft.params.re=draft.params.so+draft.params.wi+draft.params.ot;
 if(q.has('year')&&Number.isInteger(Number(q.get('year'))))draft.year=Number(q.get('year'));
 if(draft.params.so+draft.params.wi+draft.params.ot>100){const factor=100/(draft.params.so+draft.params.wi+draft.params.ot);for(const k of ['so','wi','ot'])draft.params[k]*=factor;draft.params.re=100}
 const field=(k,title,min,max,step,u,value,kind)=>`<div class="control"><label for="${kind}_${k}">${title}<output id="out_${kind}_${k}">${fmt(value,2)}${u}</output></label><input type="range" id="${kind}_${k}" data-kind="${kind}" data-key="${k}" min="${min}" max="${max}" step="${step}" value="${value}"></div>`;
 function renderInputs(){
  $('#scenarioControls').innerHTML=`<div class="control"><label for="studioYear">Display year <output id="outYear">${draft.year}</output></label><input id="studioYear" type="range" min="2025" max="2050" step="1" value="${draft.year}"></div><div class="control"><label for="ccsEnable">Install carbon capture (CCS)</label><input id="ccsEnable" type="checkbox" ${draft.params.ccs?'checked':''}></div>`+cfg.map(([k,...v])=>field(k,...v,draft.params[k],'p')).join('');
  $('#financeControls').innerHTML=fcfg.map(([k,...v])=>field(k,...v,draft.finance[k],'f')).join('');
 }
 renderInputs();
 function adjustShares(changed){
  const p=draft.params;let total=p.so+p.wi+p.ot;
  if(total>100){let remaining=Math.max(0,100-p[changed]);const others=['so','wi','ot'].filter(k=>k!==changed);const sum=others.reduce((s,k)=>s+p[k],0);for(const k of others)p[k]=sum?+(p[k]*remaining/sum).toFixed(4):0;total=p.so+p.wi+p.ot}
  p.re=total;
  for(const k of ['so','wi','ot']){$('#p_'+k).value=p[k];$('#out_p_'+k).textContent=fmt(p[k])+'%'}
 }
 $('#scenarioControls').addEventListener('input',e=>{
  if(e.target.id==='studioYear'){draft.year=Number(e.target.value);$('#outYear').textContent=draft.year}
  else if(e.target.id==='ccsEnable')draft.params.ccs=e.target.checked;
  else if(e.target.dataset.kind==='p'){
   const k=e.target.dataset.key;draft.params[k]=Number(e.target.value);
   $('#out_p_'+k).textContent=fmt(draft.params[k])+cfg.find(i=>i[0]===k)[5];
   if(['so','wi','ot'].includes(k))adjustShares(k)
  }else return;
  session.schedule();
 });
 $('#financeControls').addEventListener('input',e=>{
  const k=e.target.dataset.key;if(!k)return;
  draft.finance[k]=Number(e.target.value);
  $('#out_f_'+k).textContent=fmt(draft.finance[k])+fcfg.find(i=>i[0]===k)[5];session.schedule()
 });
 $('#reset').onclick=()=>{draft={params:{...defs},finance:{...fdefs},year:2050,siteId:draft.siteId};renderInputs();session.refresh()};
 $('#openTwin').onclick=()=>api.saveDraft(draft);
 function makeSeries(data,key,{max,maxLabel}={}){
  const W=690,H=230,L=45,B=29,T=12,R=13;
  const values=data.map(d=>Number(d[key])||0),min=Math.min(0,...values),hi=max??Math.max(1,...values),span=hi-min||1;
  const pt=(v,i)=>[L+i/(values.length-1)*(W-L-R),T+(hi-v)/span*(H-T-B)];
  let out=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${key} per year" style="width:100%">`;
  for(let i=0;i<=4;i++){const v=min+(hi-min)*i/4,y=pt(v,0)[1];out+=`<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="#2c4b61"/><text x="${L-6}" y="${y+4}" fill="#a1b9c9" text-anchor="end" font-size="11">${fmt(v,0)}</text>`}
  out+=`<polyline points="${values.map((v,i)=>pt(v,i).join(',')).join(' ')}" fill="none" stroke="#43d7ce" stroke-width="3"/>`;
  for(const i of [0,5,10,15,20,25])out+=`<text x="${pt(values[i],i)[0]}" y="${H-8}" fill="#b3c5d2" font-size="11" text-anchor="middle">${data[i].year}</text>`;
  return out+'</svg>';
 }
 function bars(data){const mx=Math.max(1,...Object.values(data).map(Math.abs));return Object.entries(data).map(([name,value])=>`<div style="margin:8px 0"><div style="display:flex;justify-content:space-between"><span>${name}</span><b>${fmt(value)}</b></div><div style="height:9px;background:#183243;border-radius:6px"><div style="width:${Math.max(0,value)/mx*100}%;height:100%;background:#4fcac2;border-radius:6px"></div></div></div>`).join('')}
 function render(res){
  const m=res.metrics;
  const cards=[['Net emissions',fmt(m.netMt)+' Mt'],['Avoided vs BAU',fmt(m.avoidedVsBauMt)+' Mt'],['Captured CO₂',fmt(m.capturedMt)+' Mt'],['Stored (100-year adjusted)',fmt(m.storedRetainedMt)+' Mt'],['NPV',fmt(m.npvMUsd)+' $M'],['Gross CAPEX',fmt(m.grossCapexMUsd)+' $M'],['IRR',m.irr],['Payback',m.paybackYear]];
  $('#studioMetrics').innerHTML=cards.map(([k,v])=>`<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
  $('#emissionsChart').innerHTML=makeSeries(res.annualSeries,'netMt');
  $('#cashChart').innerHTML=makeSeries(res.finance.years,'cumulativeCash');
  $('#breakdown').innerHTML=bars({'Gross direct':m.scope1GrossMt,'Post-capture Scope 1':m.scope1ReleasedMt,'Scope 2 proxy':m.scope2ProxyMt,'Stored (100y adj)':m.storedRetainedMt});
  $('#capex').innerHTML=bars(res.finance.capexBoxes);
  $('#modelContext').textContent=`Model ${res.modelVersion} · input hash ${res.inputHash} · ${res.boundary}. ${res.warnings.join(' ')}`;
  $('#messages').textContent='Backend-confirmed model · '+res.year+' · synced across Twin and Studio with the same draft inputs.';
 }
 const session=api.connect({read:()=>({...draft,params:{...draft.params},finance:{...draft.finance}}),onResult:render,
  onStatus:(state,message)=>{$('#studioStatus').textContent=message;$('#studioStatus').className='sync-indicator '+(state==='online'?'online':state==='warning'?'warning':'')},delay:260});
 $('#compare').onclick=async()=>{
  try{
   const body={schemaVersion:'1',finance:draft.finance,scenarios:[{year:draft.year,legacyParams:{...E.bau(draft.params),...{re:E.P0.re}}},{year:draft.year,legacyParams:draft.params}]};
   const data=await api.json('/api/v1/scenarios/compare',{body});
   const [b,c]=data.scenarios;
   $('#comparison').hidden=false;
   $('#comparisonBody').textContent=`BAU ${fmt(b.netMt)} Mt → selected ${fmt(c.netMt)} Mt; avoided ${fmt(b.netMt-c.netMt)} Mt. Selected NPV ${fmt(c.npvMUsd)} $M. Both are model outputs, not verified forecasts.`;
  }catch(err){$('#messages').textContent='Comparison failed: '+err.message}
 };
 window.addEventListener('storage',e=>{if(e.key!==api.key)return;const next=api.loadDraft();if(next){draft={...draft,...next,params:{...draft.params,...next.params},finance:{...draft.finance,...next.finance}};renderInputs();session.refresh()}});
 session.schedule();
})();
