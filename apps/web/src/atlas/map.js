
(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const E=window.CarbonEngine, api=window.CarbonTwinClient, fmt=(v,d=2)=>Number.isFinite(v)?Number(v).toFixed(d):'—';
const hubs=window.CarbonAtlasSites;
const presets={
 integrated:{solar:28,wind:22,eff:15,electrify:20,ccs:true,capture:85,price:100,start:2028,duration:12},
 bau:{solar:8,wind:7,eff:0,electrify:0,ccs:false,capture:85,price:75,start:2030,duration:10},
 renewable:{solar:43,wind:35,eff:8,electrify:8,ccs:false,capture:85,price:100,start:2027,duration:13},
 ccs:{solar:13,wind:12,eff:5,electrify:0,ccs:true,capture:90,price:100,start:2028,duration:12},
 electrification:{solar:36,wind:27,eff:20,electrify:45,ccs:false,capture:85,price:100,start:2028,duration:12}
};
for(const preset of Object.values(presets))preset.other=5;
let state={selected:'gary',region:'All',year:2040,mode:'net',preset:'integrated',...presets.integrated};
const {US_STATES,SITE_XY}=window.CarbonAtlasGeometry;
let mapLayer='readiness',readinessSelection=null;
let mapZoom=1,mapPanX=0,mapPanY=0,stateFocus=null;
const mi=id=>hubs.find(h=>h.id===id);
let inherited={...E.P0}, finance={...window.FinancialEngine.DEFAULTS}, confirmed=null;
const siteOverrides={};
function restore(draft){
 if(!draft?.params)return;
 inherited={...E.P0,...draft.params};finance=window.FinancialEngine.validate(draft.finance);
 if(mi(draft.siteId))state.selected=draft.siteId;
 if(mi(draft.siteId))siteOverrides[draft.siteId]={ef:inherited.ef,scale:inherited.scale};
 Object.assign(state,{solar:inherited.so,wind:inherited.wi,other:inherited.ot,eff:inherited.eff,
  electrify:inherited.el,ccs:inherited.ccs,capture:inherited.cap,price:inherited.cp,
  start:inherited.yr,duration:inherited.dur,year:draft.year??2050,preset:'custom'});
}
restore(api.loadDraft());
const urlSite=new URLSearchParams(location.search).get('site');if(mi(urlSite))state.selected=urlSite;
function draft(){return {params:parameterize(mi(state.selected)),finance:{...finance},year:state.year,siteId:state.selected}}
function transfer(){api.saveDraft(draft());}
for(const link of document.querySelectorAll('[data-open-twin]'))link.addEventListener('click',transfer);

function parameterize(h){return E.validate({...inherited,so:state.solar,wi:state.wind,ot:state.other,ef:h.ef,scale:h.scale,...siteOverrides[h.id],eff:state.eff,el:state.electrify,ccs:state.ccs,cap:state.capture,cp:state.price,yr:state.start,dur:state.duration}).p}
function compute(h,y=state.year){const p=parameterize(h),r=E.at(p,y,finance).r,b=E.calc(E.bau(p)).net;return {h,p,r,year:y,baseline:b,net:r.net,avoided:b-r.net,cap:r.cap,store:r.store,shares:{so:r.p.so,wi:r.p.wi,ot:r.p.ot,fo:100-r.p.re}}}
const visible=()=>hubs.filter(h=>state.region==='All'||h.region===state.region);
const metricName=()=>state.mode==='net'?'Net CO₂ · Mt / year':'Annual CO₂ avoided · Mt / year';
function calculateRange(){return visible().map(h=>compute(h))}
function color(c,items){const vals=items.map(x=>state.mode==='net'?x.net:x.avoided);const mn=Math.min(...vals),mx=Math.max(...vals);const t=( (state.mode==='net'?c.net:c.avoided)-mn)/(mx-mn||1);return state.mode==='net'?`hsl(${159-t*142} 85% ${55-t*5}%)`:`hsl(${10+t*151} 82% ${52}%)`}
function applyPreset(key){if(!presets[key])return;Object.assign(state,presets[key]);state.preset=key;updateControls();draw()}
function updateControls(){for(const id of ['solar','wind','other','eff','electrify','capture','price','start','duration']) $('#'+id).value=state[id];$('#ccs').checked=state.ccs;$('#year').value=state.year;$('#preset').value=state.preset;
 const labels={solar:`${state.solar}%`,wind:`${state.wind}%`,other:`${state.other}%`,eff:`${state.eff}%`,electrify:`${state.electrify}%`,capture:`${state.capture}%`,price:`$${state.price}/t`,start:state.start,duration:`${state.duration} yr`,year:state.year};for(const k in labels)$('#'+k+'Out').textContent=labels[k]}
function select(id,zoom=false){if(!mi(id))return;readinessSelection={state:mi(id).state,kind:'demo',siteLabel:mi(id).city};state.selected=id;stateFocus=mi(id).state;draw();if(zoom)focusSite(id);}
function fmtCompact(v){return v>=10?fmt(v,1):fmt(v,2)}
function draw(){const items=calculateRange(), selected=mi(state.selected),c=compute(selected);$('#kCount').textContent=items.length;$('#kBau').textContent=fmt(items.reduce((s,x)=>s+x.baseline,0),1);$('#kNow').textContent=fmt(items.reduce((s,x)=>s+x.net,0),1);const a=items.reduce((s,x)=>s+x.avoided,0);$('#kSaved').textContent=fmt(a,1);$('#kSavedSub').textContent=`${a>=0?'+':''}${fmt(a/Math.max(1e-10,items.reduce((s,x)=>s+x.baseline,0))*100,1)}% vs modeled BAU · demo nodes only`;
 $('#mapLegendTitle').textContent=mapLayer==='readiness'?'Readiness heat map / 36':metricName();
 $('#mapLegendDescription').textContent=mapLayer==='readiness'?'Red: 0–17 low readiness · Amber: 18–23 conditional · Green: 24–36 stronger readiness.':state.mode==='net'?'Green = lower modeled emissions; orange = higher.':'Green = higher modeled abatement; orange = lower.';
 $('#mapMarkerDisclaimer').textContent=mapLayer==='readiness'?'State fill = state score; dots = region scores. Dots are schematic. Green indicates a diligence candidate, not authorization to execute; red indicates unresolved screening barriers.':'Markers are synthetic steel-plant scenarios, not verified facilities or approved cities.';
 document.querySelector('.site-list').hidden=mapLayer==='readiness';document.querySelector('.seg').hidden=mapLayer==='readiness';
 const readinessMode=mapLayer==='readiness',metricCards=[...document.querySelectorAll('.metrics .metric')];
 const titles=readinessMode?['States scored','Workbook sample regions','Green regions','Red regions']:['Demo scenario locations','Modeled BAU · selected year','Modeled scenario emissions','Modeled annual avoidance'];
 const notes=readinessMode?['Six dimensions · 0–6 each','Marker positions are schematic','24–36 points · stronger readiness','0–17 points · barriers unresolved']:['Conceptual pins · not verified facilities','Mt CO₂e / year · demo nodes only','Mt CO₂e / year · includes chain + 100y adjustment',`${fmt(a,1)} Mt avoided vs modeled BAU`];
 metricCards.forEach((card,i)=>{card.querySelector('.l').textContent=titles[i];card.querySelector('.s').textContent=notes[i];card.querySelector('strong').style.color=readinessMode?(i===2?'#36be85':i===3?'#ef6b65':'#dceff7'):''});
 if(readinessMode){$('#kCount').textContent=50;$('#kBau').textContent=100;$('#kNow').textContent=CarbonReadinessData.regions.filter(r=>ReadinessBands.classify(r.total).id==='green').length;$('#kSaved').textContent=CarbonReadinessData.regions.filter(r=>ReadinessBands.classify(r.total).id==='red').length;}
 document.querySelector('.metrics').setAttribute('aria-label',readinessMode?'Workbook readiness summary':'Modeled demo-site totals');
 document.querySelector('.controls .fields').hidden=readinessMode;
 document.querySelector('.controls .panel-head h3').textContent=readinessMode?'Readiness screening':'Scenario controls';
 document.querySelector('.controls .subtitle').textContent=readinessMode?'State shading uses state scores; regional dots use their own workbook scores. Select a state or dot to inspect the six-axis radar.':'Adjust a shared intervention across synthetic plants. These scenarios do not change workbook readiness scores.';
 document.querySelector('.intro .disclaimer').textContent=readinessMode?'Workbook-based screening: green suggests stronger readiness, amber is conditional, and red means unresolved barriers. These bands are not project approval.':'All plant markers are conceptual scenarios, not verified facilities or approved executable cities.';
 const mapHeading=document.querySelector('.map-top strong');mapHeading.textContent=readinessMode?'U.S. readiness heat map':'U.S. illustrative scenario map';
 $('#mapNote').textContent=readinessMode?'Click a state or schematic regional dot · screening scores, not approvals':'Click a synthetic plant · scenario outputs, not measured facilities';
 $('#heatmapGuide').hidden=!readinessMode;
 $('#layerReadiness').classList.toggle('active',mapLayer==='readiness');$('#layerDemo').classList.toggle('active',mapLayer==='demo');$('#visibleCount').textContent=`${items.length} demo nodes`;
 $$('.site-filter button').forEach(b=>b.classList.toggle('active',b.dataset.region===state.region));$('#siteGrid').innerHTML=items.map(x=>`<button class="site-item ${x.h.id===state.selected?'active':''}" data-site="${x.h.id}"><strong>${x.h.city}</strong><span>${x.h.state} · ${fmtCompact(state.mode==='net'?x.net:x.avoided)} Mt</span></button>`).join('');
 for(const link of document.querySelectorAll('[data-open-twin]'))link.href='/twin.html?site='+encodeURIComponent(state.selected);
 drawDetails(c);drawFallback(items);window.dispatchEvent(new CustomEvent('atlas:selection',{detail:readinessSelection||{state:stateFocus,kind:'state'}}));sync.schedule();
}
function drawDetails(c){const h=c.h;$('#regionTag').textContent=h.region.toUpperCase()+' / '+h.state;$('#siteTitle').textContent=h.city;$('#siteDescription').textContent=h.description+' Location, electricity assumptions and capacity multiplier are synthetic; this is not an actual facility record.';$('#siteNet').textContent=fmt(c.net,2);$('#siteSaved').textContent=fmt(c.avoided,2);$('#siteCapture').textContent=`${fmt(c.cap,2)} / ${fmt(c.store,2)}`;$('#siteNPV').textContent=confirmed&&JSON.stringify(confirmed.validatedInputs)===JSON.stringify(c.p)&&confirmed.year===state.year?fmt(confirmed.metrics.npvMUsd,1):'…';
 const sectors=[['Solar',c.shares.so,'#f2c45a'],['Wind',c.shares.wi,'#5bb7ef'],['Other low carbon',c.shares.ot,'#43d2a1'],['Fossil electricity',c.shares.fo,'#8799a8']];$('#mixbar').innerHTML=sectors.map(([n,v,color])=>`<i title="${n}: ${fmt(v,1)}%" style="width:${Math.max(0,v)}%;background:${color}"></i>`).join('');$('#mixlegend').innerHTML=sectors.map(([n,v,col])=>`<span style="--c:${col}">${n}: ${fmt(v,0)}%</span>`).join('');$('#pathChart').innerHTML=pathSVG(h);
 const frac=E.at(c.p,c.year,finance).u;const pct=c.baseline>0?100*c.avoided/c.baseline:0;const s1=c.r.res,s2=c.r.s2;$('#siteAnalysis').innerHTML=`<b>Conditional scenario · ${state.year}</b><br/>The selected demo plant has modeled ${fmt(c.net,2)} Mt CO₂e/yr, ${fmt(pct,1)}% ${pct>=0?'below':'above'} its BAU case. Scope 1 released: ${fmt(s1,2)} Mt; electricity Scope 2 proxy: ${fmt(s2,2)} Mt. CCS captured: ${fmt(c.cap,2)} Mt. Deployment progress: ${fmt(frac*100,0)}%. These are <b>model results under illustrative assumptions</b>, not verified emissions.`;
}
function pathSVG(h){const W=490,H=210,p={l:35,t:18,r:12,b:29},data=E.YRS.map(y=>compute(h,y)),max=Math.max(...data.map(c=>Math.max(c.net,c.baseline)),.1)*1.15;
 const X=y=>p.l+(y-2025)/(2050-2025)*(W-p.l-p.r),Y=v=>H-p.b-v/max*(H-p.t-p.b),line=(fn)=>data.map((d,i)=>`${i?'L':'M'}${X(d.year).toFixed(1)},${Y(fn(d)).toFixed(1)}`).join(' ');
 let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="BAU and scenario emissions from 2025 to 2050">`;
 for(let i=0;i<=4;i++){const v=max*i/4,y=Y(v);s+=`<line x1="${p.l}" x2="${W-p.r}" y1="${y}" y2="${y}" stroke="#29465b" stroke-width=".8"/><text x="${p.l-6}" y="${y+4}" text-anchor="end" fill="#91aabb" font-size="11">${fmt(v,1)}</text>`}
 for(const yr of [2025,2030,2040,2050]){const x=X(yr);s+=`<text x="${x}" y="${H-6}" text-anchor="middle" fill="#91aabb" font-size="11">${yr}</text>`}
 s+=`<path d="${line(d=>d.baseline)}" fill="none" stroke="#8b9daf" stroke-width="2" stroke-dasharray="5 5"/><path d="${line(d=>d.net)}" fill="none" stroke="#4dd5ba" stroke-width="3" stroke-linejoin="round"/>`;
 const cy=compute(h,state.year);s+=`<line x1="${X(state.year)}" x2="${X(state.year)}" y1="${p.t}" y2="${H-p.b}" stroke="#74a9b5" stroke-width="1" stroke-dasharray="3 5"/><circle cx="${X(state.year)}" cy="${Y(cy.net)}" r="5" fill="#61f8ce" stroke="#11383b" stroke-width="3"><title>${state.year}: ${fmt(cy.net,2)} Mt CO2e/yr</title></circle><text x="${p.l+4}" y="13" fill="#819cac" font-size="11">Mt CO₂e/yr</text></svg>`;return s;}

/* Fully embedded SVG state boundaries. No Leaflet, tile server or API keys. */
const labelStates=new Set(['WA','OR','CA','NV','ID','MT','WY','UT','AZ','NM','CO','ND','SD','NE','KS','OK','TX','MN','IA','MO','WI','IL','MI','IN','OH','NY','PA','VA','NC','SC','GA','AL','FL','MS','LA','TN','KY','AR','AK','HI']);
const stateLookup=Object.fromEntries(US_STATES.map(f=>[f.s,f]));
function applyMapTransform(){const g=$('#usViewport');if(g)g.setAttribute('transform',`translate(${mapPanX.toFixed(1)} ${mapPanY.toFixed(1)}) scale(${mapZoom.toFixed(3)})`);}
function mapZoomTo(next,cx=500,cy=280){const z=Math.min(4,Math.max(1,next));const rat=z/mapZoom;mapPanX=cx-(cx-mapPanX)*rat;mapPanY=cy-(cy-mapPanY)*rat;mapZoom=z;if(z===1){mapPanX=0;mapPanY=0}applyMapTransform()}
function fitMap(){mapZoom=1;mapPanX=0;mapPanY=0;applyMapTransform()}
function focusSite(id){const xy=SITE_XY[id];if(!xy)return;mapZoom=1.75;mapPanX=500-xy[0]*mapZoom;mapPanY=275-xy[1]*mapZoom;applyMapTransform()}
function drawFallback(items){
 const visibleIds=new Set(items.map(c=>c.h.id)),stateSites=new Set(items.map(c=>c.h.state));
 const byId=new Map(items.map(c=>[c.h.id,c]));
 let out=`<svg id="usSvg" viewBox="0 0 1000 580" role="img" aria-label="Interactive United States state boundary map with illustrative industrial demo sites"><defs><radialGradient id="sea" cx="50%" cy="46%" r="75%"><stop stop-color="#14364b"/><stop offset="100%" stop-color="#071624"/></radialGradient><filter id="siteGlow" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="4"/></filter></defs><rect width="1000" height="580" fill="url(#sea)"/>`;
 for(const y of [90,170,250,330,410,490])out+=`<line class="waterline" x1="20" x2="980" y1="${y}" y2="${y}"/>`;
 for(const x of [120,240,360,480,600,720,840,960])out+=`<line class="waterline" x1="${x}" x2="${x}" y1="15" y2="566"/>`;
 out+=`<g id="usViewport" transform="translate(${mapPanX} ${mapPanY}) scale(${mapZoom})">`;
 for(const [x,y,w,h,caption] of [[46,436,245,121,'ALASKA'],[302,473,158,87,'HAWAII'],[813,489,149,72,'PUERTO RICO']])out+=`<rect class="map-inset-border" x="${x}" y="${y}" width="${w}" height="${h}"/><text class="map-inset-label" x="${x+12}" y="${y+18}">${caption}</text>`;
 for(const f of US_STATES){const selected=stateFocus===f.s,record=CarbonReadinessData.states.find(s=>s.code===f.s),band=ReadinessBands.classify(record?.total);out+=`<path class="state-shape ${stateSites.has(f.s)?'has-demo':''} ${selected?'selected':''}" data-state="${f.s}" data-readiness-band="${mapLayer==='readiness'?band.id:'demo'}" ${mapLayer==='readiness'?`style="fill:${band.color};fill-opacity:.65"`:""} tabindex="0" role="button" aria-label="Select ${f.n} readiness" d="${f.d}" fill-rule="evenodd"><title>${f.n}${mapLayer==='readiness'?(record?' · '+record.total+'/36 · '+band.label:' · No workbook score'):(stateSites.has(f.s)?' · demo sites available':'')}</title></path>`;}
 for(const f of US_STATES)if(labelStates.has(f.s) && f.reg==='contig')out+=`<text class="state-label ${stateFocus===f.s?'selected':''}" x="${f.cx}" y="${f.cy}">${f.s}</text>`;
 const keyLabels=new Set(['gary','houston','seattle','pittsburgh','birmingham','losangeles','kansascity']);
 if(mapLayer==='demo')for(const c of items){const pt=SITE_XY[c.h.id];if(!pt)continue;const [x,y]=pt,col=color(c,items),sel=c.h.id===state.selected;out+=`<g class="geo-marker ${sel?'selected':''}" data-site="${c.h.id}" tabindex="0" role="button" aria-label="Select ${c.h.city}" transform="translate(${x},${y})"><circle class="marker-glow" r="${sel?23:16}" fill="${col}"/><circle class="marker-core" r="${sel?8:6}" fill="${col}" stroke="#0e2b37" stroke-width="2"/><circle r="2" fill="#eaffff"/>${keyLabels.has(c.h.id)||sel?`<text class="marker-label" x="12" y="-10">${c.h.city.replace(' area','')}</text>`:''}<title>${c.h.city} · illustrative demo site</title></g>`}
 if(mapLayer==='readiness')for(const region of CarbonReadinessData.regions){const f=stateLookup[region.state];if(!f)continue;const siblings=CarbonReadinessData.regions.filter(r=>r.state===region.state),index=siblings.findIndex(r=>r.id===region.id);const x=f.cx+(index-(siblings.length-1)/2)*11,y=f.cy+(index%2?3:-3),selected=readinessSelection?.regionId===region.id;out+=`<g class="readiness-marker" role="button" tabindex="0" data-region="${region.id}" aria-label="${region.name}: ${region.total}/36, rank ${region.rank}/100" transform="translate(${x},${y})"><circle r="${selected?7:4.3}" data-readiness-band="${ReadinessBands.classify(region.total).id}" fill="${ReadinessBands.classify(region.total).color}" stroke="${selected?'#fff':'#092334'}" stroke-width="${selected?2:1}"><title>${region.name} · ${region.total}/36 · ${ReadinessBands.classify(region.total).label} · tied region rank ${region.rank}/100</title></circle></g>`}
 out+=`</g><text class="map-credit" x="983" y="568" text-anchor="end">EMBEDDED U.S. STATE GEOMETRY · NO MAP API KEY</text></svg>`;
 $('#fallback').innerHTML=out;
}
function clickState(code){
 const f=stateLookup[code];if(!f)return;
 stateFocus=code;readinessSelection={state:code,kind:'state'};
 const match=visible().find(h=>h.state===code);
 if(match){state.selected=match.id;$('#mapNote').textContent=`${f.n} · selected demo scenario (${match.city})`;}else{$('#mapNote').textContent=`${f.n} · no demo facility in the current filter; choose another state or location`}
 draw();
}
function mapEventXY(ev){const svg=$('#usSvg');if(!svg)return[500,290];const r=svg.getBoundingClientRect();return[(ev.clientX-r.left)*1000/r.width,(ev.clientY-r.top)*580/r.height]}
let mapDrag=null,hasDragged=false;
$('#fallback').addEventListener('pointerdown',e=>{if(e.button!==0)return;mapDrag={x:e.clientX,y:e.clientY,px:mapPanX,py:mapPanY};hasDragged=false;});
$('#fallback').addEventListener('pointermove',e=>{if(!mapDrag)return;const r=$('#fallback').getBoundingClientRect(),dx=(e.clientX-mapDrag.x)*1000/r.width,dy=(e.clientY-mapDrag.y)*580/r.height;if(Math.abs(dx)+Math.abs(dy)>3){hasDragged=true;$('#fallback').setPointerCapture?.(e.pointerId);$('#fallback').classList.add('is-dragging')}if(hasDragged){mapPanX=mapDrag.px+dx;mapPanY=mapDrag.py+dy;applyMapTransform()}});
$('#fallback').addEventListener('pointerup',()=>{mapDrag=null;$('#fallback').classList.remove('is-dragging')});
$('#fallback').addEventListener('pointercancel',()=>{mapDrag=null;$('#fallback').classList.remove('is-dragging')});
$('#fallback').addEventListener('wheel',e=>{e.preventDefault();const [x,y]=mapEventXY(e);mapZoomTo(mapZoom*(e.deltaY<0?1.15:1/1.15),x,y)},{passive:false});
$('#zoomIn').addEventListener('click',()=>mapZoomTo(mapZoom*1.3));
$('#zoomOut').addEventListener('click',()=>mapZoomTo(mapZoom/1.3));
$('#fallback').addEventListener('click',e=>{if(hasDragged){hasDragged=false;return}const region=e.target.closest('[data-region]');if(region){selectReadiness({regionId:region.dataset.region,kind:'region'});return}const el=e.target.closest('[data-site]');if(el){select(el.dataset.site);return}const st=e.target.closest('[data-state]');if(st)clickState(st.dataset.state)});
$('#fallback').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const region=e.target.closest('[data-region]');if(region){e.preventDefault();selectReadiness({regionId:region.dataset.region,kind:'region'});return}const el=e.target.closest('[data-site]');if(el){e.preventDefault();select(el.dataset.site);return}const st=e.target.closest('[data-state]');if(st){e.preventDefault();clickState(st.dataset.state)}});
function exportCSV(){const headers=['scenario_site','region','state','year','is_verified_facility','data_quality','baseline_mt_co2e_per_year','scenario_mt_co2e_per_year','avoided_mt_co2e_per_year','capture_mt_per_year','solar_share_pct','wind_share_pct','scope2_mt_per_year','capacity_multiplier','assumptions'];const rows=calculateRange().map(c=>[c.h.city,c.h.region,c.h.state,state.year,'false','illustrative',fmt(c.baseline,5),fmt(c.net,5),fmt(c.avoided,5),fmt(c.cap,5),fmt(c.shares.so,3),fmt(c.shares.wi,3),fmt(c.r.s2,5),c.h.scale,'conceptual site; BF-BOF template; no real plant data']);const esc=s=>'"'+String(s).replace(/"/g,'""')+'"';const content=[headers,...rows].map(r=>r.map(esc).join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));a.download=`industrial-carbon-twin-us-demo-${state.year}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
for(const id of ['solar','wind','other','eff','electrify','capture','price','start','duration','year']) $('#'+id).addEventListener('input',e=>{state[id]=+e.target.value;if(['solar','wind','other'].includes(id)&&state.solar+state.wind+state.other>100)state[id]=100-['solar','wind','other'].filter(k=>k!==id).reduce((s,k)=>s+state[k],0);if(id!=='year')state.preset='custom';updateControls();draw()});$('#ccs').addEventListener('change',e=>{state.ccs=e.target.checked;state.preset='custom';updateControls();draw()});$('#preset').addEventListener('change',e=>applyPreset(e.target.value));
$$('.site-filter button').forEach(b=>b.addEventListener('click',()=>{state.region=b.dataset.region;if(!visible().some(h=>h.id===state.selected))state.selected=visible()[0].id;stateFocus=mi(state.selected).state;draw();fitMap()}));
$('#siteGrid').addEventListener('click',e=>{const region=e.target.closest('[data-region]');if(region){selectReadiness({regionId:region.dataset.region,kind:'region'});return}const el=e.target.closest('[data-site]');if(el)select(el.dataset.site,true)});


$('#modeNet').addEventListener('click',()=>{state.mode='net';$$('.seg button').forEach(b=>b.classList.toggle('active',b.id==='modeNet'));draw()});$('#modeSaved').addEventListener('click',()=>{state.mode='saved';$$('.seg button').forEach(b=>b.classList.toggle('active',b.id==='modeSaved'));draw()});
$('#csvBtn').addEventListener('click',exportCSV);$('#resetBtn').addEventListener('click',()=>{state={...state,year:2040,region:'All',selected:'gary'};applyPreset('integrated');fitMap()});$('#fitBtn').addEventListener('click',fitMap);$('#mapFit').addEventListener('click',fitMap);
let currentHash='';
const sync=api.connect({read:draft,delay:250,onResult:data=>{
 confirmed=data;currentHash=data.inputHash;
 $('#siteNPV').textContent=fmt(data.metrics.npvMUsd,1);
 $('#atlasSync').textContent='API confirmed · '+data.year+' · input '+data.inputHash;
},onStatus:(status,message)=>{if(status!=='online')confirmed=null;$('#atlasSync').textContent=message;if(status!=='online')$('#siteNPV').textContent=status==='warning'?'Unavailable':'…'}});
for(const [id,key] of Object.entries({solar:'so',wind:'wi',other:'ot',eff:'eff',electrify:'el',capture:'cap',price:'cp',start:'yr',duration:'dur'})){
 const input=$('#'+id);input.min=E.R[key][0];input.max=E.R[key][1];
}
window.addEventListener('storage',event=>{if(event.key!==api.key)return;restore(api.loadDraft());stateFocus=mi(state.selected).state;updateControls();draw()});
function selectReadiness(detail){const region=CarbonReadinessData.regions.find(r=>r.id===String(detail.regionId));readinessSelection={...detail,state:region?.state||detail.state};stateFocus=readinessSelection.state;draw();}
window.addEventListener('readiness:select',event=>selectReadiness(event.detail));
$('#layerReadiness').onclick=()=>{mapLayer='readiness';draw()};$('#layerDemo').onclick=()=>{mapLayer='demo';draw()};
stateFocus=mi(state.selected).state;updateControls();draw();
})();

