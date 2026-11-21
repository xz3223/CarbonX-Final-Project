/* ===== Scenario Simulator view ===== */
let simOn=false,SM=null;
const SL={so:['Solar',0,60,1,'%'],wi:['Wind',0,60,1,'%'],ot:['Other low-carbon (hydro/nuclear)',0,40,1,'%'],ef:D.ef,eff:D.eff,el:['Electrify heating',0,50,1,'%'],cap:D.cap,pen:D.pen,perm:D.perm,cp:D.cp,sub:['CAPEX subsidy',0,50,1,'%'],yr:['Adoption start year',2026,2040,1,''],dur:['Deployment duration',1,25,1,' yr'],ed:['Electricity demand',500,2000,50,' GWh']};
for(const [key,definition] of Object.entries(SL)){if(E.R[key]){definition[1]=E.R[key][0];definition[2]=E.R[key][1]}}
const GP=[['Electricity supply',['so','wi','ot','ef']],['Fuel & process',['ed','eff','el']],['Carbon capture & storage',['cap','pen','perm']],['Policy & timing',['cp','sub','yr','dur']]];
$('#sl').innerHTML=GP.map(([t,ks])=>`<div class="cd"><h3>${t}</h3>`+(t[0]=='C'?'<label style="margin:0 0 4px"><span><input type="checkbox" data-c="1"> Install CCS</span></label>':'')+ks.map(k=>`<label>${SL[k][0]}<output id="z_${k}"></output></label><input type="range" data-k="${k}" min="${SL[k][1]}" max="${SL[k][2]}" step="${SL[k][3]}"><input class="finance-number" type="number" data-k="${k}" aria-label="${SL[k][0]} value" min="${SL[k][1]}" max="${SL[k][2]}" step="${SL[k][3]}">`).join('')+'</div>').join('');
$('#sl').oninput=e=>{if(e.target.type==='number'&&!e.target.validity.valid)return;const k=e.target.dataset.k,before={...P};if(e.target.dataset.c){P.ccs=e.target.checked}else if(k){P[k]=+e.target.value;if(['so','wi','ot'].includes(k)){P.re=Math.min(100,P.so+P.wi+P.ot);norm(P)}}markInput(k||'ccs',before);update()};
$('#vw').onclick=()=>{location.href='scenario.html'};
/* ===== Interactive techno-economic studio; conceptual CCUS Box Model ===== */
const MONEY=x=>!Number.isFinite(x)?'—':(x<0?'−':'')+'$'+Math.abs(x).toLocaleString('en-US',{maximumFractionDigits:1})+'M';
const USD=x=>x==null||!Number.isFinite(x)?'—':'$'+x.toFixed(1)+'/t';
const ESC=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TEA_VARS={
 discount:['Discount rate',0,20,.5,'%'],captureCapex:['Capture CAPEX',100,900,10,' $/t-yr'],
 transportCapex:['Transport CAPEX',0,280,5,' $/t-yr'],storageCapex:['Storage CAPEX',0,300,5,' $/t-yr'],
 electrifyCapex:['Electrification investment',0,9,.25,' $M/point'],renewCapex:['Renewable upgrade investment',0,6,.25,' $M/point'],
 captureOpex:['Capture OPEX',5,90,1,' $/t'],transportOpex:['Transport OPEX',0,60,1,' $/t'],
 storageOpex:['Storage OPEX',0,70,1,' $/t'],mrvOpex:['Monitoring / MRV',0,25,1,' $/t'],
 powerPrice:['Electricity cost',.01,.25,.005,' $/kWh'],transportLoss:['Transport CO₂ loss',0,8,.1,'%'],
 utilShare:['CO₂ utilization share',0,50,1,'%'],utilPrice:['Utilization sales price',0,150,5,' $/t'],
 storageFee:['Storage service fee',0,80,2,' $/t'],policyEligible:['Hypothetical monetizable avoided CO₂',0,100,5,'%'],
 uncertainty:['Monte Carlo uncertainty',0,50,5,'%']
};
const TEA_GROUPS=[['Investment & discount',['discount','captureCapex','transportCapex','storageCapex','electrifyCapex','renewCapex']],
 ['Operating costs',['captureOpex','transportOpex','storageOpex','mrvOpex','powerPrice']],
 ['CO₂ routing & optional revenue',['transportLoss','utilShare','utilPrice','storageFee','policyEligible','uncertainty']]];
$('#teaControls').innerHTML=TEA_GROUPS.map(([title,keys])=>`<div class="cd"><h3>${title}</h3>${keys.map(k=>{
 const d=TEA_VARS[k];return `<label for="te_${k}">${d[0]} <output id="teo_${k}"></output></label><input id="te_${k}" data-tea="${k}" type="range" min="${d[1]}" max="${d[2]}" step="${d[3]}" value="${window.TEA_CONFIG[k]}"><input class="finance-number" id="ten_${k}" type="number" data-tea="${k}" aria-label="${d[0]} value" min="${d[1]}" max="${d[2]}" step="${d[3]}" value="${window.TEA_CONFIG[k]}">`;
 }).join('')}</div>`).join('');
let MONTE=null,MONTE_KEY='';
$('#teaControls').addEventListener('input',e=>{
 if(e.target.type==='number'&&!e.target.validity.valid)return;
 const key=e.target.dataset.tea;if(!key)return;
 window.TEA_CONFIG[key]=+e.target.value;
 update();
});
$('#mcRun').onclick=()=>{
 const c={...window.TEA_CONFIG},p={...P},n=+$('#mcSamples').value;
 $('#mcStatus').textContent='Computing '+n+' illustrative scenarios…';
 // Yield one frame to show status before the CPU-only batch.
 requestAnimationFrame(()=>{
  try {MONTE=FinancialEngine.monteCarlo(p,c,n);MONTE_KEY=JSON.stringify([p,c]);renderMonte();}
  catch(e){$('#mcStatus').textContent='Simulation error: '+e.message;}
 });
};
const f4=x=>Number.isFinite(x)?x.toLocaleString('en-US',{maximumFractionDigits:2}):'—';
function financialLine(values,title,unit='$M'){
 const W=750,H=205,L=55,R=18,T=23,B=30;
 const allZero=values.every(v=>Math.abs(v)<1e-9);
 const max=Math.max(...values,0),min=Math.min(...values,0),pad=(max-min||1)*.12;
 const maxY=max+pad,minY=min-pad;const X=i=>L+i/(values.length-1)*(W-L-R),Y=v=>T+(maxY-v)/(maxY-minY)*(H-T-B);
 let str=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}" style="width:100%;max-height:230px">`;
 for(let k=0;k<=4;k++){const v=allZero?0:(minY+(maxY-minY)*k/4),y=allZero?Y(0):Y(v);str+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="#25405b"/><text x="${L-9}" y="${y+4}" fill="#91abc0" font-size="10" text-anchor="end">${v.toFixed(0)}</text>`}
 str+=`<line x1="${L}" x2="${W-R}" y1="${Y(0)}" y2="${Y(0)}" stroke="#87a1af" stroke-dasharray="4 4"/>`;
 const pts=values.map((v,i)=>`${X(i).toFixed(1)},${Y(allZero?0:v).toFixed(1)}`).join(' ');
 str+=`<polyline points="${pts}" stroke="#38d2cb" stroke-width="2.8" fill="none"/>`;
 for(let i=0;i<values.length;i++){if(i%5===0||i===values.length-1)str+=`<text x="${X(i)}" y="${H-9}" fill="#91abc0" font-size="10" text-anchor="middle">${2025+i}</text>`;
 if(i%2===0)str+=`<circle cx="${X(i)}" cy="${Y(allZero?0:values[i])}" r="2.7" fill="#a7f1e7"><title>${2025+i}: ${(allZero?0:values[i]).toFixed(2)} ${unit}</title></circle>`}
 if(allZero)str+=`<text x="${(W+L-R)/2}" y="${T+22}" text-anchor="middle" fill="#b8cad9" font-size="11">BAU / no-investment case: cumulative modeled cash flow stays at 0 under current assumptions.</text>`;
 return str+'</svg>';
}
function annualCashChart(years){
 const W=750,H=250,L=60,R=12,T=22,B=32,all=years.flatMap(y=>[y.revenue,y.opex,y.capex]),allZero=all.every(v=>Math.abs(v)<1e-9),max=Math.max(1,...all)*1.18;
 const y0=H-B,X=i=>L+i/(years.length)*(W-L-R),bh=v=>Math.max(0,v/max*(H-T-B));
 let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-height:230px" role="img" aria-label="Revenue OPEX CAPEX over time"><line x1="${L}" y1="${y0}" x2="${W-R}" y2="${y0}" stroke="#728c9f"/>`;
 for(let tick=0;tick<=4;tick++){const value=max*tick/4,y=y0-bh(value);s+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="#294157"/><text x="${L-8}" y="${y+4}" fill="#a8c1d0" font-size="11" text-anchor="end">${value.toFixed(0)}</text>`;}
 s+=`<text x="${L}" y="13" fill="#a8c1d0" font-size="11">$M / year · common scale</text>`;
 for(let i=0;i<years.length;i++){
  const d=years[i],x=X(i),gw=(W-L-R)/years.length;
  [[d.revenue,'#34c7a6','Revenue + savings'],[d.opex,'#ec9361','OPEX'],[d.capex,'#6f9ee8','Gross CAPEX']].forEach(([v,c,name],j)=>{
   const h=allZero && j===0?0:bh(v);s+=`<rect data-year="${d.year}" data-series="${j}" data-value="${v}" x="${x+j*gw*.27+2}" y="${y0-h}" width="${gw*.23}" height="${h}" fill="${c}" rx="1.2"><title>${d.year} · ${name}: ${MONEY(v)}</title></rect>`;
  });if(i%5===0||i===years.length-1)s+=`<text x="${x+gw*.45}" y="${H-10}" text-anchor="middle" fill="#9db6c8" font-size="10">${d.year}</text>`;
 }
 if(allZero)s+=`<text x="${(W+L-R)/2}" y="${T+24}" text-anchor="middle" fill="#b8cad9" font-size="11">BAU / no-intervention case: modeled revenue, OPEX and CAPEX are all zero, so the chart is intentionally flat.</text>`;
 return s+'</svg>';
}
function boxBars(items){const max=Math.max(1,...items.map(([_,v])=>Math.max(0,v)));
 return items.map(([name,val],i)=>`<div class="tea-bar"><span>${ESC(name)}</span><div class="tea-track"><div style="width:${Math.max(0,val)/max*100}%;background:${['#45cec4','#70a6f0','#d6a76c','#a994df','#7db4b0'][i%5]}"></div></div><b>${MONEY(val)}</b></div>`).join('');}
function sensitiveBars(rows){const values=rows.flatMap(r=>[r.lo-r.base,r.hi-r.base]),extent=Math.max(1,...values.map(v=>Math.abs(v)));
 return `<div class="tea-subtle">NPV change from a ±${window.TEA_CONFIG.uncertainty}% change in one input at a time (illustrative).</div>`+rows.map(x=>{
   const low=Math.min(x.lo-x.base,x.hi-x.base),high=Math.max(x.lo-x.base,x.hi-x.base);
   const a=50+low/extent*48,b=50+high/extent*48;
   return `<div class="tea-sens"><span>${ESC(x.name)}</span><div class="tea-sens-track"><i class="tea-sens-zero"></i><i class="tea-sens-band" style="left:${Math.max(0,a)}%;width:${Math.max(2,b-a)}%"></i></div><b>${(x.hi-x.lo)>=0?'+':''}${f4(x.hi-x.lo)}</b></div>`;
 }).join('')+'<div class="tea-subtle">Rows ranked by modeled impact; units are $M differences in NPV.</div>';
}
function renderMonte(){
 if(!MONTE){$('#mcStatus').textContent='Not run yet. Click Run Monte Carlo.';$('#mcStats').innerHTML='';$('#mcPlot').innerHTML='';return;}
 const current=JSON.stringify([{...P},{...window.TEA_CONFIG}]);
 if(current!==MONTE_KEY){$('#mcStatus').textContent='Inputs changed — results are stale. Run again.';$('#mcStats').innerHTML='';$('#mcPlot').innerHTML='';return;}
 const m=MONTE,v=m.values,min=v[0],max=v[v.length-1],n=20,bins=Array(n).fill(0),span=Math.max(1e-6,max-min);
 for(const q of v)bins[Math.min(n-1,Math.floor((q-min)/span*n))]++;
 const H=110,W=620,B=24,top=6,mx=Math.max(...bins),bar=(W-24)/n;
 let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%" role="img" aria-label="Monte Carlo NPV distribution">`;
 bins.forEach((v,i)=>{const h=v/mx*(H-B-top),x=12+i*bar;s+=`<rect x="${x+1}" y="${H-B-h}" width="${bar-2}" height="${h}" fill="${min+(i+.5)*span/n>0?'#34c8a5':'#e9906a'}" rx="1"><title>${min+i*span/n>=0?'Positive':'Negative'} NPV bin: ${v} trials</title></rect>`});
 const z=12+(0-min)/span*(W-24);if(z>=12&&z<=W-12)s+=`<line x1="${z}" y1="${top}" x2="${z}" y2="${H-B}" stroke="#e7f0fc" stroke-dasharray="4 3"/>`;
 s+=`<text x="12" y="${H-5}" fill="#aec4d3" font-size="10">${MONEY(min)}</text><text x="${W-12}" y="${H-5}" fill="#aec4d3" font-size="10" text-anchor="end">${MONEY(max)}</text></svg>`;
 $('#mcStatus').textContent=`${m.n} seeded triangular-distribution trials; ±${m.uncertainty}% assumed input range. Not a calibrated probability forecast.`;
 $('#mcStats').innerHTML=[['P5',MONEY(m.p05)],['Median',MONEY(m.median)],['P95',MONEY(m.p95)],['Positive NPV',Math.round(m.positive*100)+'%']].map(([a,b])=>`<span><small>${a}</small><b>${b}</b></span>`).join('');
 $('#mcPlot').innerHTML=s;
}
function renderFinance(fx){
 $('#financeFlow').dataset.source='shared-local-engine';
 $('#teaMetrics').innerHTML=[['Project NPV',MONEY(fx.npv)],['Gross CAPEX',MONEY(fx.capexGross)],['Annual OPEX · 2050',MONEY(fx.opex)],['IRR',fx.irr],['Portfolio LCOC / captured t',USD(fx.lcoc)],['Payback',fx.payback]].map(([a,b])=>`<div class="tea-kpi"><small>${a}</small><strong>${b}</strong></div>`).join('');
 $('#financeFlow').innerHTML=annualCashChart(fx.years);
 const active=fx.years.filter(y=>y.capex>1e-9),complete=P.yr+P.dur;
 $('#financeExplanation').textContent=active.length?`Linear deployment: gross investment is spread across ${active[0].year}–${active.at(-1).year} (${f4(active[0].capex)} $M in the first build year). Equal blue bars follow equal annual deployment increments. ${complete<=2050?'After '+complete+', annual receipts and OPEX stay level because output, prices and operating assumptions are fixed.':'Deployment is incomplete at 2050.'} These are annual amounts; NPV discounts them separately. Revenue includes assumed avoided-carbon value and energy savings, not total steel sales.`:'No intervention investment is scheduled in this horizon. BAU charts show incremental project cash flows, not the plant’s total revenue or operating costs.';
 $('#financeAnnualTable').innerHTML='<table><thead><tr><th>Year</th><th>Deployed</th><th>Revenue + savings</th><th>OPEX</th><th>Gross CAPEX</th><th>Subsidy</th><th>Net cash</th></tr></thead><tbody>'+fx.years.map(y=>`<tr><td>${y.year}</td><td>${f4(y.u*100)}%</td><td>${f4(y.revenue)}</td><td>${f4(y.opex)}</td><td>${f4(y.capex)}</td><td>${f4(y.subsidy)}</td><td>${f4(y.net)}</td></tr>`).join('')+'</tbody></table>';
 $('#financeYear').value=SY;

 $('#financeCumulative').innerHTML=financialLine(fx.years.map(y=>y.cumulativeCash),'Cumulative nominal net cash flow');
 $('#financeBoxes').innerHTML='<div class="tea-subtle">Gross investment allocated to five CCUS cost centers, plus associated energy upgrades:</div>'+boxBars(Object.entries(fx.capexBoxes))+
  '<div class="tea-subtle">Annual operating costs in 2050:</div>'+boxBars(Object.entries(fx.opexBoxes));
 $('#financeSensitivity').innerHTML=sensitiveBars(FinancialEngine.sensitivity(P,window.TEA_CONFIG));
 const y=fx.years.find(r=>r.year===SY)||fx.years[fx.years.length-1];
 $('#teaChain').innerHTML=`<div class="tea-flow-steps"><div><b>Capture</b><small>${f4(y.captured)} Mt/yr</small><small>${MONEY(y.opexBoxes.Capture)}/yr cost</small></div><i>→</i><div><b>Transport</b><small>${f4(y.transported)} Mt/yr</small><small>${f4(y.transportLoss)} Mt lost</small></div><i>→</i><div><b>Utilization</b><small>${f4(y.utilized)} Mt/yr</small><small>Not permanent storage</small></div><span class="tea-flow-branch">↘</span><div><b>Storage</b><small>${f4(y.stored)} Mt/yr</small><small>Gross injected, not retained</small></div><i>↔</i><div><b>Market / Policy</b><small>${MONEY(y.policy)} assumed benefit</small><small>Not verified credits</small></div></div>`+
 `<div class="tea-subtle">${y.year}: Policy value ${MONEY(y.policy)}, utilization sales ${MONEY(y.utilRevenue)}, storage-service revenue ${MONEY(y.service)}, gross CAPEX ${MONEY(y.capex)}, subsidy ${MONEY(y.subsidy)}. All boxes share one project boundary; internal payments are not double-counted.</div>`;
 Object.keys(TEA_VARS).forEach(k=>{const el=$('#te_'+k);if(el){el.value=window.TEA_CONFIG[k];$('#ten_'+k).value=window.TEA_CONFIG[k];$('#teo_'+k).textContent=window.TEA_CONFIG[k]+TEA_VARS[k][4]}});
 renderMonte();
}

function renderSim(r,b){
 const F=fin(P),Y=YRS.map(netAt),cur=Y.map(y=>y.r.net),bn=base(P),n50=cur[25],bauSelected=E.at(BASEP(P),SY,window.TEA_CONFIG).r;
 const isBAU=Math.abs(P.eff)<1e-9&&Math.abs(P.el)<1e-9&&Math.abs(P.so-P0.so)<1e-9&&Math.abs(P.wi-P0.wi)<1e-9&&Math.abs(P.ot-P0.ot)<1e-9&&!P.ccs;
 $('#c2').innerHTML=ar([['Solar',Y.map(y=>y.q.so),'#f2b632'],['Wind',Y.map(y=>y.q.wi),'#4aa3d8'],['Other',Y.map(y=>y.q.ot),'#2a9d62'],['Fossil',Y.map(y=>100-y.q.re),'#8a949d']]);
 $('#big').innerHTML=`<div class="tea-compact"><div><small>Selected year · ${SY}</small><b style="color:var(--or);font-size:20px">${f(E.at(P,SY,window.TEA_CONFIG).r.op)} Mt</b><small>operational emissions · illustrative</small></div><div><small>Selected-year BAU reference</small><b style="color:#a7cbe0;font-size:20px">${f(bauSelected.op)} Mt</b><small>${isBAU?'This is the current scenario, so flat finance charts are expected.':'Reference only; compare with the selected case.'}</small></div><div><small>2050 output · conditional</small><b style="color:var(--gr);font-size:20px">${f((bn-n50)/bn*100,0)}%</b><small>lower than illustrative BAU including cohort adjustment</small></div></div>`;
 $('#sk').innerHTML=sankey(netAt(SY).r);$('#syo').textContent=SY;$('#sy').value=SY;skHi();
 document.querySelectorAll('#sl [data-k]').forEach(i=>{i.value=P[i.dataset.k];$('#z_'+i.dataset.k).textContent=(['ef','pen'].includes(i.dataset.k)?f(P[i.dataset.k]):Math.round(P[i.dataset.k]*10)/10)+SL[i.dataset.k][4]});
 document.querySelector('#sl [data-c]').checked=P.ccs;
 renderFinance(F);
}
/* ===== AI analyst (Claude via sample capability) ===== */
function ctx(){
 const r=netAt(SY).r,F=fin(P);
 return {model_id:'illustrative-v0.3-chain-1',year:SY,baseline_net_MtCO2e:base(P),
  current:{net:r.net,per_t_steel:r.net/(2*P.scale),scope1_gross:r.t1,scope1_released:r.res,
   scope2:r.s2,captured:r.cap,stored_retained:r.store,capture_energy_CO2:r.pen,
   storage_loss:r.leak,transport_loss:r.transportLoss,utilization_release:r.utilizationRelease,sources_MtCO2e:{...r.s1}},
  params:{...P},net_by_year:{2030:netAt(2030).r.net,2040:netAt(2040).r.net,2050:netAt(2050).r.net},
  cumulative_avoided_2025_2050:F.cum,finance:{capex_M:F.capex,npv_M:F.npv,irr:F.irr,usd_per_t_avoided:F.mac},
  finance_quality:F.finance_quality,electricity_boundary:'physical supply-mix proxy, not an audited inventory',
  storage_timing:'100-year cohort loss attributed to injection year, not annual physical leakage',data_quality:'illustrative'};
}
const SYS='You are an industrial decarbonization analyst inside a steel-plant carbon twin. RULES: use ONLY numbers from CONTEXT or from the run_scenario tool; never invent emission factors, costs or statistics. Label claims [Model result] or [Hypothesis]. Capturing fossil CO2 is not removing atmospheric CO2; never call the plant net-zero if residual emissions remain. Discuss largest sources, why current differs from baseline, capture energy penalty vs grid carbon intensity, storage permanence, policy sensitivity (carbon price, subsidy). Explicitly state that renewable/electrification costs are incomplete and a physical supply-mix scenario is not an audited Scope 2 inventory and give a conditional outlook for 2030/2040/2050. Outlook is scenario reasoning, not prediction. Mention that data are illustrative. Reply in the language of the question, under 230 words, short bullets.';
const TOOL={name:'run_scenario',description:'Run the deterministic engine. Overrides apply on top of the current UI scenario. Returns structured Scope 1/2, capture, avoided CO2, energy mix, CAPEX/OPEX/NPV and conservation checks. Use for every numerical what-if.',inputSchema:{type:'object',properties:{scenario_name:{type:'string'},target_year:{type:'integer',minimum:2025,maximum:2050},overrides:{type:'object',properties:{solar_share:{type:'number'},wind_share:{type:'number'},other_lowcarbon_share:{type:'number'},electrification_rate:{type:'number'},efficiency_improvement:{type:'number'},ccs_enabled:{type:'boolean'},capture_rate:{type:'number'},carbon_price:{type:'number'},subsidy_rate:{type:'number'},adoption_start_year:{type:'integer'},ramp_years:{type:'integer'}}}},required:['target_year']},
 execute:i=>E.runScenario({...i,base:P,finance:window.TEA_CONFIG})};
TOOL.inputSchema.properties.overrides={type:'object',additionalProperties:false,properties:Object.fromEntries(Object.entries(E.MAP).map(([name,key])=>[name,key==='ccs'?{type:'boolean'}:{type:['yr','dur'].includes(key)?'integer':'number',minimum:E.R[key][0],maximum:E.R[key][1]}]))};
async function ask(q){const o=$('#aiout');if(!SM){const c=ctx(),t=Object.entries(c.current.sources_MtCO2e).sort((a,b)=>b[1]-a[1])[0];o.textContent=`[TEMPLATE SUMMARY · fixed rules over model outputs, NOT an LLM response · connect an LLM for interpretation]\n• Net ${c.current.net} Mt vs baseline ${c.baseline_net_MtCO2e} Mt.\n• Largest direct source: ${t[0]} (${t[1]} Mt).\n• Capture energy adds ${c.current.capture_energy_CO2} Mt of electricity CO₂; storage loss ${c.current.storage_loss} Mt.\n• 2050 net: ${c.net_by_year[2050]} Mt (illustrative).`;return}
 o.textContent='Thinking…';try{await SM(SYS+'\nCONTEXT: '+JSON.stringify(ctx())+'\nQUESTION: '+q,{onText:({text})=>{o.textContent=text},tools:[TOOL],cache:false})}catch(e){o.textContent=e&&e.code=='not_granted'?'AI access was declined.':'AI analyst unavailable ('+((e&&e.message)||'error')+').'}}
$('#a0').onclick=()=>ask('Explain this scenario versus the baseline and give a conditional outlook for 2030, 2040 and 2050.');
$('#a1').onclick=()=>ask($('#aq').value||'What is the biggest lever and the biggest risk in this scenario?');
$('#aqs').innerHTML=['What if carbon price is $150?','Is CCS worth it on a dirty grid?','Which lever is cheapest per tonne?'].map(t=>`<button class="pb">${t}</button>`).join('');$('#aqs').onclick=e=>{if(e.target.tagName=='BUTTON'){$('#aq').value=e.target.textContent;ask(e.target.textContent)}};
if(typeof claude!=='undefined')claude.use('sample').then(x=>{SM=x}).catch(()=>{});

$('#financeYear').oninput=event=>{if(!event.target.validity.valid)return;SY=Number(event.target.value);update()};
const financeHeaderObserver=new ResizeObserver(entries=>document.documentElement.style.setProperty('--finance-top',(entries[0].target.getBoundingClientRect().height+12)+'px'));
financeHeaderObserver.observe(document.querySelector('header'));
