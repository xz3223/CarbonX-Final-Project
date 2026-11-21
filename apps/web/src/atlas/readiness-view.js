(function(g){'use strict';
const data=g.CarbonReadinessData,$=id=>document.getElementById(id);
const keys=['permits','storage','water','transport','economics','cluster'];
const labels=['Permitting pathway','Storage maturity','Water supply','Transport & storage','Project economics','Regional cluster'];
const colors=['#47bfd6','#e29355','#55be75','#39bddd','#c98ade','#62c957'];
function safe(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function radar(scores){const cx=240,cy=215,radius=145,point=(i,v)=>{const angle=-Math.PI/2+i*Math.PI/3;return [cx+Math.cos(angle)*radius*v/6,cy+Math.sin(angle)*radius*v/6]};let out='<svg viewBox="0 0 480 440" role="img" aria-label="Six-axis commercial readiness scores, each from zero to six"><title>Commercial readiness: six dimensions, 0–6 each</title>';
for(let level=1;level<=6;level++)out+=`<polygon points="${keys.map((_,i)=>point(i,level).join(',')).join(' ')}" fill="none" stroke="#446378" stroke-dasharray="4 4"/><text x="246" y="${cy-radius*level/6+4}" fill="#b8d0df" font-size="10">${level}</text>`;
keys.forEach((k,i)=>{const end=point(i,6),label=point(i,7.15),anchor=i===0||i===3?'middle':i<3?'start':'end';out+=`<line x1="${cx}" y1="${cy}" x2="${end[0]}" y2="${end[1]}" stroke="#829eb0"/><text x="${label[0]}" y="${label[1]+4}" text-anchor="${anchor}" fill="#d5e9f1" font-size="11">${labels[i]}</text>`});
out+=`<polygon points="${keys.map((k,i)=>point(i,scores[k]).join(',')).join(' ')}" fill="#43d1bb22" stroke="none"/>`;
keys.forEach((k,i)=>{const a=point(i,scores[k]),next=(i+1)%6,b=point(next,scores[keys[next]]);out+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${colors[i]}" stroke-width="3"/><circle cx="${a[0]}" cy="${a[1]}" r="4.5" fill="${colors[i]}"><title>${labels[i]}: ${scores[k]}/6</title></circle>`});
return out+'<text x="226" y="229" fill="#bdd0df" font-size="10">0</text></svg>'}
g.ReadinessRadar={radar,keys,labels};
if(typeof document==='undefined')return;
let selection={state:'IN',kind:'state'};
function choose(detail){g.dispatchEvent(new CustomEvent('readiness:select',{detail}))}
$('readinessState').innerHTML=data.states.map(s=>`<option value="${s.code}">${s.name} (${s.code})</option>`).join('');
function render(detail){selection={...detail};const state=data.states.find(s=>s.code===detail.state),regions=data.regions.filter(r=>r.state===detail.state);let region=regions.find(r=>r.id===String(detail.regionId));
if(detail.kind==='demo'&&!region){const city=String(detail.siteLabel||'').replace(/ area$/,'').replace(/[^a-z0-9 ]/gi,'').toLowerCase();region=regions.find(r=>r.name.replace(/[^a-z0-9 ]/gi,'').toLowerCase().includes(city));}
if(!state){$('readinessTitle').textContent='No workbook readiness data';$('readinessMeta').textContent='The workbook covers 50 U.S. states; no scores are supplied for this selection.';$('readinessBasis').textContent='No scores or rank are available for this territory.';$('readinessStatus').textContent='GRAY ? No workbook score';$('readinessRegionsText').textContent='';$('readinessRadar').innerHTML='';$('readinessScores').innerHTML='';$('readinessRegions').innerHTML='';$('readinessCities').innerHTML='';$('openReadinessChart').disabled=true;return}
$('readinessState').value=state.code;
$('readinessRegions').innerHTML='<option value="">State-level overview</option>'+regions.map(r=>`<option value="${r.id}">${safe(r.name)}</option>`).join('');$('readinessRegions').value=region?.id||'';
const record=region||state;
$('readinessTitle').textContent=detail.city?detail.city+' · regional context':region?region.name:state.name;
$('readinessMeta').textContent=`${record.total}/36 · ${region?'Region':'State'} tied rank ${record.rank}/${region?100:50} · ${state.name}`;
const screening=g.ReadinessBands.classify(record.total);$('readinessStatus').textContent=screening.id.toUpperCase()+' · '+screening.label;$('readinessStatus').style.color=screening.color;
$('readinessBasis').textContent=detail.city?'City-specific scores are not supplied. This radar and rank belong to the selected workbook region.':detail.kind==='demo'?region?'Matched workbook region; the illustrative plant model is a separate dataset.':'No matching city/region score was found; showing state-level scores instead.':region?'Regional scores from the workbook. Rank is derived from all 100 region totals, with ties.':'State scores and tied rank transcribed directly from the workbook.';
$('readinessRadar').innerHTML=radar(record.scores);
if($('radarDialog').open){$('dialogRadar').innerHTML=radar(record.scores);$('dialogTitle').textContent=$('readinessTitle').textContent+' · '+$('readinessMeta').textContent}
$('openReadinessChart').disabled=false;
$('readinessScores').innerHTML=keys.map((k,i)=>`<div><span>${labels[i]}</span><b>${record.scores[k]} / 6</b></div>`).join('');
$('readinessRegionsText').textContent=region?`Workbook region coordinates: ${Number(region.latitude).toFixed(2)}, ${Number(region.longitude).toFixed(2)}. Source IDs: ${region.sourceIds}.`:'Sample regions: '+regions.map(r=>r.name).join(' · ');
$('readinessCities').innerHTML=region&&region.cities.length?'<p>City context from the workbook facility records:</p>'+region.cities.map(city=>`<button type="button" data-city="${safe(city)}" data-region="${region.id}">${safe(city)}</button>`).join(''):'';
}
$('readinessState').onchange=()=>choose({state:$('readinessState').value,kind:'state'});
$('readinessRegions').onchange=()=>choose({state:$('readinessState').value,regionId:$('readinessRegions').value,kind:$('readinessRegions').value?'region':'state'});
$('readinessCities').onclick=event=>{const button=event.target.closest('[data-city]');if(button)choose({state:$('readinessState').value,regionId:button.dataset.region,city:button.dataset.city,kind:'city'})};
g.addEventListener('atlas:selection',event=>render(event.detail));render(selection);
$('openReadinessChart').onclick=()=>{$('dialogTitle').textContent=$('readinessTitle').textContent+' · '+$('readinessMeta').textContent;$('dialogRadar').innerHTML=$('readinessRadar').innerHTML;$('radarDialog').showModal()};
$('closeReadinessChart').onclick=()=>$('radarDialog').close();
})(globalThis);
