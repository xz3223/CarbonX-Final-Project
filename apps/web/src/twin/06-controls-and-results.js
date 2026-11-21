/* ===== Param change diagnostics: explain physical vs financial vs cohort impacts ===== */
let lastParamChange=null;
const PARAM_HELP={
  eff:'Direct fuel/process emissions and base electricity use are reduced by an illustrative uniform response (not a fitted plant model).',
  re:'Changes the assumed physical low-carbon electricity mix. Its grid change is NOT a formal location-based Scope 2 claim.',
  so:'Solar displaces fossil share unless shares exceed 100%. Solar vs wind alone uses zero operational generation emissions in this simplified model.',
  wi:'Wind displaces fossil share unless shares exceed 100%. Solar and wind have the same direct operational factor in this simplified model.',
  ot:'This changes modeled fossil supply fraction. No grid-contract matching, lifecycle or hourly dispatch is modeled.',
  ef:'Fossil-generation factor affects scenario electricity emissions, including power used by CCS.',
  el:'Electrification reduces eligible mill fuel emissions and raises electricity demand. Finance includes illustrative investment, power cost and displaced-fuel savings assumptions.',
  ed:'Total purchased electricity load changes; Scope 2 proxy responds according to the supply mix.',
  ccs:'Controls capture and compression; disabled CCS implies capture parameters have no physical effect.',
  cap:'Only effective if CCS is installed AND commissioned by the selected display year.',
  pen:'Capture electric penalty affects demand and emissions only when CCS captures CO2.',
  perm:'100-year retention changes a future-loss adjustment, NOT a measured annual leakage rate.',
  cp:'Carbon price affects the illustrative financial proxy (NPV), not physical CO2 or capture.',
  sub:'CAPEX subsidy affects modeled investment and NPV, not physical CO2. No effect if modeled investment is zero.',
  yr:'Commissioning start changes the annual time pathway and dated NPV; final steady-state may be unchanged.',
  dur:'Ramp length changes annual deployment and dated NPV; final steady-state can remain unchanged.'
};
function snapParam(x){return {y:E.at(x,SY,window.TEA_CONFIG).r.net, y30:E.at(x,2030,window.TEA_CONFIG).r.net,y50:E.at(x,2050,window.TEA_CONFIG).r.net,npv:E.fin(x).npv,cum:E.fin(x).cum,cap:E.at(x,SY,window.TEA_CONFIG).r.cap};}
function markInput(key,old){lastParamChange={key,before:snapParam(old)};}
function renderImpact(){
  const targets=['#impactBox','#simImpactBox'].map($).filter(Boolean);if(!targets.length)return;
  const item=lastParamChange,cur=snapParam(P);
  const cols=[['Year '+SY+' net',cur.y,'y',' Mt'],['2030 net',cur.y30,'y30',' Mt'],['2050 net',cur.y50,'y50',' Mt'],['NPV',cur.npv,'npv',' $M'],['Cumulative avoided',cur.cum,'cum',' Mt'],['Year '+SY+' captured',cur.cap,'cap',' Mt']];
  const ch=cols.map(([name,val,key,unit])=>{
    const diff=item?val-item.before[key]:null;
    const fmt=d=>Math.abs(d)<1e-8?'0':(d>0?'+':'')+d.toFixed(Math.abs(d)<.01?4:3);
    return '<span>'+name+'<br><b>'+val.toFixed(3)+'</b>'+unit+(item?' <small style="color:#85d5d0">Δ '+fmt(diff)+'</small>':'')+'</span>';
  }).join('');
  const key=item?.key,used=key&&PARAM_HELP[key];
  const markup='<strong>Parameter impact · model diagnostics</strong><div class="impactrow">'+ch+'</div>'+
    '<div class="subtle">'+(used?'<b>Last changed: '+key+'.</b> '+used:'Change any input to inspect changes. All values are conditional model outputs.')+'</div>'+
    '<div class="subtle" style="margin-top:5px">A zero Δ can be correct: disabled CCS, unchanged aggregate power share, policy-only inputs, or deployment outside the selected year. NPV depends on uncalibrated cost and policy assumptions.</div>';targets.forEach(n=>n.innerHTML=markup);
}
/* ================= UI ================= */
const D={eff:['Energy efficiency gain',0,30,1,'%'],re:['Low-carbon electricity',0,100,1,'%'],ef:['Fossil-generation emission factor',.1,.9,.01,' kg/kWh'],cap:['Capture rate',50,95,1,'%'],pen:['Capture energy penalty',.1,.6,.01,' MWh/tCO₂'],perm:['Storage retention (100 y)',90,100,1,'%'],cp:['Carbon price',0,250,5,' $/t']};
for(const [key,definition] of Object.entries(D)){if(E.R[key]){definition[1]=E.R[key][0];definition[2]=E.R[key][1]}}
$('#ctl').innerHTML=Object.entries(D).map(([k,v])=>`<div id="w_${k}"><label>${v[0]}<output id="o_${k}"></output></label><input type="range" id="r_${k}" min="${v[1]}" max="${v[2]}" step="${v[3]}"></div>`).join('');
Object.keys(D).forEach(k=>$('#r_'+k).oninput=e=>{const before={...P};P[k]=+e.target.value;if(k=='re')norm(P);markInput(k,before);update()});$('#ccs').onchange=e=>{const before={...P};P.ccs=e.target.checked;markInput('ccs',before);update()};
$('#pre').innerHTML='<h3>Scenarios</h3>'+SC.map(([n,pt],i)=>`<button class="pb" data-i="${i}">${n}</button>`).join('');
$('#pre').onclick=e=>{const i=e.target.dataset.i;if(i)set(scp(SC[i][1]))};
function set(o){Object.assign(P,o);update()}
function sync(){for(const k in D){$('#r_'+k).value=P[k];$('#o_'+k).textContent=(k=='ef'||k=='pen'?f(P[k]):P[k])+D[k][4]}$('#ccs').checked=P.ccs}
let tab='asset';const TB={asset:'Asset',led:'Carbon ledger',cmp:'Compare',cost:'Cost',lim:'Limits'};
$('#tabs').innerHTML=Object.entries(TB).map(([k,v])=>`<button data-t="${k}">${v}</button>`).join('');
$('#tabs').onclick=e=>{if(e.target.dataset.t){tab=e.target.dataset.t;update()}};
$('#modes').onclick=e=>{if(['navModePan','navModeOrbit','navModeFocus'].includes(e.target.id)){navMode=e.target.id==='navModePan'?'pan':e.target.id==='navModeOrbit'?'orbit':'focus';$('#navModePan').classList.toggle('on',navMode==='pan');$('#navModeOrbit').classList.toggle('on',navMode==='orbit');$('#navModeFocus').classList.toggle('on',navMode==='focus');return;}if(e.target.id==='environmentToggle'){
  const active=!e.target.classList.contains('on');e.target.classList.toggle('on',active);
  e.target.textContent='Landscape: '+(active?'ON':'OFF');ENV.visible=active;
  $('#environmentTag').hidden=!active;return;
 }if(e.target.id==='wideView'){
  const goPlant=e.target.classList.contains('on');e.target.classList.toggle('on',!goPlant);
  e.target.textContent=goPlant?'Landscape view':'Plant view';
  if(goPlant){depthLevel=0;syncDepth();tg2.set(20,4,0);rad=116;th=.42;ph=1.28}
  else{depthLevel=0;syncDepth();tg2.set(55,2,18);rad=211;th=.16;ph=1.16}
  return;
 }if(e.target.id==='detailToggle'){
 const on=!e.target.classList.contains('on');e.target.classList.toggle('on',on);
 e.target.textContent='High detail: '+(on?'ON':'OFF');DETAIL_MESHES.forEach(m=>m.visible=on);
 update();return;
 }if(e.target.dataset.m){mode=e.target.dataset.m;document.querySelectorAll('#modes button[data-m]').forEach(b=>b.classList.toggle('on',b===e.target));update()}};
function select(id){sel=id;if(navMode==='focus'){focus(id);th=.56;ph=Math.max(.72,Math.min(1.18,ph));}else focus(id);tab='asset';update()}
const bar=(l,v,mx,c,t)=>`<div class="bar"><span>${l}</span><div class="bw"><i style="width:${Math.max(0,Math.min(100,v/mx*100))}%;background:${c}"></i></div><span>${t??f(v)}</span></div>`;
const OR='var(--or)',CY='var(--cy)',GR='var(--gr)',RD='var(--rd)';
function pane(r,b){
 if(tab=='asset'){const a=sel&&AS[sel];let h;
  if(a){const e=a.em(r);h=`<h3 class="ah">${a.n} <span class="st ${a.cc&&!P.ccs?'off':''}">${a.cc&&!P.ccs?'Idle':'Running'}</span></h3><div>${a.p}</div><div class="note"><b>Carbon role:</b> ${a.role}</div><span class="q">Illustrative</span> ${a.sc}
  <div class="tiles"><div><small>${a.g?'CO₂ flow':'Emissions'}</small><b style="color:${a.g?CY:OR}">${f(e)}<i>Mt/yr</i></b></div><div><small>Energy use</small><b>${a.en(r)?M(a.en(r)):'—'}<i>GWh/yr</i></b></div><div><small>Capacity</small><b class="sm">${a.cap}</b></div><div><small>Operating hours</small><b>8,000<i>h/yr</i></b></div></div><h4>Mitigation options</h4><ul>${a.m.map(x=>`<li>${x}</li>`).join('')}</ul>`;
  if(a.cc&&!P.ccs)h+='<div class="note">CCS is not installed. Tick “Install CCS” on the left to divert the stack stream.</div>'}
  else h='<h3>Asset</h3><div>Click equipment (or a label) in the 3D plant to see its energy use, emissions and carbon role.</div>';
  return h+`<h3 style="margin-top:12px">Where the CO₂ comes from (Mt/yr)</h3>`+bar('Coke & sinter',r.s1.sinter,1,OR)+bar('Blast furnace',r.s1.bf,1,OR)+bar('Hot-blast stoves',r.s1.stoves,1,OR)+bar('Steel shop & rolling',r.s1.mill,1,OR)+bar('Purchased electricity',r.s2,1,'#c9a227')}
 if(tab=='led'){const e1=calc({...r.p,el:0,ccs:false,so:8,wi:7,ot:5}).net,e2=calc({...r.p,ccs:false,so:8,wi:7,ot:5}).net,e3=calc({...r.p,ccs:false}).net,W=[['Baseline',b,0],['Efficiency',e1-b],['Electrification',e2-e1],['Low-carbon power',e3-e2],['CO₂ captured',-r.cap],['Capture energy (power CO₂)',r.pen],['Chain + horizon adjustment',r.leak+r.transportLoss+r.utilizationRelease]];
  const lo=b-calc({...r.p,pen:.6,perm:90}).net,hi=b-calc({...r.p,pen:.15,perm:100}).net,eff=r.cap?(r.cap-r.pen-r.leak-r.transportLoss-r.utilizationRelease)/r.cap*100:0;
  return`<h3>Follow the carbon (Mt CO₂/yr)</h3>`+bar('Fuel & process carbon',r.t1,2.4,OR)+bar('Captured at source',r.cap,2.4,CY)+bar('Released from stack',r.res,2.4,OR)+bar('Injected & retained',r.store,2.4,GR)+bar('Expected storage loss (100y)',r.leak,2.4,RD)+bar('Electricity (Scope 2)',r.s2,2.4,'#c9a227')+
  `<h3 style="margin-top:12px">Path to net emissions</h3>`+W.map(([n,v,z],i)=>bar(n,Math.abs(v),2.4,z===0?'#8aa0b2':v<0?GR:RD,(i&&v>0?'+':'')+f(v))).join('')+bar('Net (100y adjusted)',r.net,2.4,OR,f(r.net))+
  `<div class="note"><b>Incremental capture benefit / captured CO₂: ${r.cap?f(eff,0)+'%':'—'}.</b> ${r.cap?`Capture electricity offsets ${f(r.pen/r.cap*100,1)}% of gross capture. Transport releases ${f(r.transportLoss)} Mt/yr; utilization is assumed to re-release ${f(r.utilizationRelease)} Mt/yr. The ${f(r.leak)} Mt storage-loss adjustment spans 100 years and is attributed to this injection cohort.`:'Switch CCS on to see how capture energy and storage permanence reduce the benefit.'}</div>
  <div style="font-size:12px">Avoided vs baseline: <b>${f(b-r.net)} Mt/yr</b>${r.cap?` · illustrative sensitivity ${f(lo)}–${f(hi)} (penalty 0.15–0.6 MWh/t, retention 90–100%; no probability assigned)`:''}</div>
  <div class="note"><b>Capture ≠ removal.</b> CCS on a stack prevents fossil CO₂ from being released. Carbon dioxide removal (e.g. DACCS, BECCS) takes CO₂ already in the atmosphere and is a different, separately accounted activity.</div>`}
 const cols=[...SC.map(([n,pt])=>[n,scp(pt)]),['Your mix',P]];
 if(tab=='cmp'){const X=cols.map(([n,p])=>[n,E.at(p,SY,window.TEA_CONFIG).r]),ch=(t,fn,c,u)=>{const v=X.map(([n,x])=>[n,fn(x)]),mx=Math.max(...v.map(a=>a[1]),1e-9);return`<h4>${t}</h4>`+v.map(([n,x])=>bar(n,x,mx,c,f(x)+u)).join('')};
  return`<h3>Compare pathways</h3>`+ch('Annual CO₂ emissions (Mt/yr)',x=>x.net,OR,'')+ch('Emissions per tonne of steel (tCO₂/t)',x=>x.net/(2*x.p.scale),OR,'')+ch('Captured CO₂ (Mt/yr)',x=>x.cap,CY,'')+ch('Avoided vs baseline (Mt/yr)',x=>b-x.net,GR,'')+
  `<div class="note">“CCS only” on a 20% low-carbon grid avoids less than its gross capture because capture energy is mostly fossil-powered. “Combined” shows why power and capture are linked.</div>`}
 if(tab=='cost'){const F=cols.map(([n,p])=>fin(p));
  const row=(l,fn)=>`<tr><td>${l}</td>${[F[5],F[1],F[2],F[3],F[4]].map(x=>`<td>${fn(x)}</td>`).join('')}</tr>`;
  return`<h3>Simple cost comparison</h3><table><tr><th></th><th>Yours</th><th>Eff.</th><th>Power</th><th>CCS</th><th>All</th></tr>${row('CAPEX $M',x=>M(x.capex))}${row('Net cost $M/yr',x=>M(x.ann))}${row('Avoided Mt/yr',x=>f(x.d))}${row('Cost $/t avoided',x=>x.mac==null?'—':M(x.mac))}${row('NPV $M',x=>`<span class="${x.npv<0?'neg':'pos'}">${M(x.npv)}</span>`)}${row('IRR',x=>x.irr)}</table>
  <div class="note">Carbon price ${P.cp} $/t. NPV uses dated 2025–2050 deployment and annual operating benefits discounted at ${window.TEA_CONFIG.discount}%. CAPEX subsidy (${P.sub}%) reduces investment as it is spent. The TEA panel includes illustrative electrification, renewables, transport, injection and MRV proxies; project-specific estimates, taxes and financing remain missing. Modeled carbon-price value does not establish legal credit eligibility.</div>`}
 const row=(a,b2,c,d)=>`<tr><td>${a}</td><td>${b2}</td><td>${c}</td><td>${d}</td></tr>`;
 return`<h3>System boundary & limits</h3><ul><li>Illustrative BF–BOF plant, ${f(2*P.scale)} Mt steel/yr. All direct source emissions are assumed CO₂; no CH₄/N₂O species ledger.</li><li>Included: gross/post-capture direct emissions, electricity supply-mix proxy, capture electricity, transport loss, assumed utilization re-release, and injected-cohort 100-year retention adjustment.</li><li>Excluded: full Scope 3, transport/injection fuel, monitoring emissions, equipment lifecycle, reservoir constraints and product substitution benefits.</li></ul>
 <table><tr><th>Parameter</th><th>Value</th><th>Allowed range</th><th>Status</th></tr>${row('Direct baseline',f(1.98*P.scale)+' Mt','Fixed template','Illustr.')}${row('Base power',f(P.ed*P.scale,0)+' GWh',E.R.ed.join('–')+' GWh/reference','Illustr.')}${row('Fossil power factor',f(P.ef)+' kg/kWh',E.R.ef.join('–'),'Illustr.')}${row('Eligible-stream share','75%','Fixed','Illustr.')}${row('Capture rate',P.cap+'%',E.R.cap.join('–')+'%','Illustr.')}${row('Electric penalty',f(P.pen)+' MWh/t',E.R.pen.join('–'),'Illustr.')}${row('Retention / 100y',P.perm+'%',E.R.perm.join('–')+'%','Illustr.')}${row('Capture CAPEX',window.TEA_CONFIG.captureCapex+' $/(t/yr)','Editable in Finance','Illustr.')}</table>
 <div class="note">The capture-energy and permanence framing follows the review by Bui et al. (2018), <i>Carbon capture and storage (CCS): the way forward</i>, Energy &amp; Environmental Science 11, 1062–1176. Numerical values here are placeholders, not values taken from that paper; replace with sourced data before any real use.</div>
 <div class="note">Results are conditional calculations. The finance view offers seeded Monte Carlo runs using explicitly assumed triangular distributions; their percentiles are not calibrated confidence intervals. The ledger sensitivity above assigns no probabilities.</div>`}
function update(){sync();const a=E.at(P,SY,window.TEA_CONFIG),r=a.r,b=base(P);
 $('#kpis').innerHTML=[['Horizon-adjusted CO₂ (Mt)',f(r.net),OR],['CO₂ per t steel',f(r.net/(2*P.scale)),OR],['Captured / stored (Mt)',f(r.cap)+' / '+f(r.store),CY],['Avoided vs baseline',f(b-r.net)+' ('+f((b-r.net)/b*100,0)+'%)',GR]].map(([a,v,c])=>`<div class="k"><small>${a}</small><b style="color:${c}">${v}</b></div>`).join('');
 document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('on',x.dataset.t==tab));
 $('#pane').innerHTML='<div id="modelBadge">Year '+SY+' · deployed '+f(a.u*100,0)+'% of selected measures · physical operational '+f(r.op,3)+' Mt CO₂e/yr · 100-year storage adjustment '+f(r.leak,4)+' Mt (cohort assumption)</div>'+pane(r,b);renderImpact();$('#plantYear').value=SY;$('#plantYearValue').textContent=SY;solar.forEach((m,i)=>{m.visible=i<Math.round(P.re/100*30);if(m.userData.detailFollowers)for(const d of m.userData.detailFollowers)d.visible=m.visible&&$('#detailToggle').classList.contains('on')});rate[0]=r.res*28;rate[1]=r.s2*30;rate[2]=r.cap*55;rate[3]=r.t1*10;tint(r);skin(r);if(simOn)renderSim(r,b);if(window.CarbonTwinSync)window.CarbonTwinSync.schedule()}
const ST=[['Plant','① A conventional blast-furnace steel plant (baseline). Drag to pan; choose Orbit to rotate; drag the depth slider to inspect subsurface.',()=>{Object.assign(P,P0);sel=null;focus(null);tab='asset'}],
['Follow carbon','② Brown carbon enters on the conveyor, the furnace turns it into CO₂, and orange CO₂ leaves the stack. See the ledger.',()=>{sel='bf';focus('bf');tab='led'}],
['Efficiency','③ Improve energy efficiency: less fuel burned, lower Scope 1 and electricity use.',()=>{P.eff=15;sel=null;focus(null);tab='cmp'}],
['Clean power','④ Raise low-carbon electricity: Scope 2 falls and capture later becomes cleaner.',()=>{P.re=80;norm(P);sel='util';focus('util');tab='led';const w=$('#w_re');w.classList.remove('flash');void w.offsetWidth;w.classList.add('flash')}],
['Add CCS','⑤ Install CCS: the stack stream is diverted, compressed, piped and stored. Read the penalty and storage loss.',()=>{P.ccs=true;sel='ccs';focus('ccs');tab='led'}],
['Compare','⑥ Compare emissions, intensity, captured CO₂ and avoided emissions across pathways.',()=>{sel=null;focus(null);tab='cmp'}],
['Cost & limits','⑦ Link choices to investment: costs, NPV and $/t avoided. Then review the boundary and uncertainty.',()=>{tab='cost'}]];
let si=0;$('#steps').innerHTML=ST.map((s,i)=>`<button data-i="${i}">${i+1} ${s[0]}</button>`).join('');
function step(i){si=i;ST[i][2]();$('#gt').textContent=ST[i][1];document.querySelectorAll('#steps button').forEach((x,j)=>x.classList.toggle('on',j==i));$('#nx').textContent=i==6?'Restart ↺':'Next ▶';update()}
$('#steps').onclick=e=>{if(e.target.dataset.i)step(+e.target.dataset.i)};$('#nx').onclick=()=>step((si+1)%7);
