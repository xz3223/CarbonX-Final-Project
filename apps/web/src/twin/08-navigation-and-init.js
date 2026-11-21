/* ===== UI skin: search, breadcrumb, zoom, carbon route, minimap ===== */
const AREA={raw:'Raw materials',sinter:'Ironmaking',bf:'Ironmaking',stoves:'Ironmaking',mill:'Steelmaking',stack:'Emissions',util:'Utilities',ccs:'CCS chain',comp:'CCS chain',pipe:'CCS chain',stor:'CCS chain'};
function skin(r){GO=.25+.9*Math.min(1,(r.res+r.s2)/2.4);GT=P.ccs?.25+.9*Math.min(1,r.cap/1.4):.06;$('#crumb').innerHTML='Steel plant <i>›</i> '+(sel?AREA[sel]+' <i>›</i> <b>'+AS[sel].s+'</b>':'<b>Overview</b>');
 const rt=P.ccs?['raw','sinter','bf','stoves','ccs','comp','pipe','stor']:['raw','sinter','bf','stoves','stack'];
 $('#route').innerHTML=`<h4>Carbon route · ${P.ccs?'with CCS':'no CCS'}</h4><div class="rt">${rt.map(i=>`<button data-i="${i}" class="${sel==i?'on':''}">${AS[i].s}</button>`).join('<i>→</i>')}</div><div class="rs"><span>Fuel carbon <b>${f(r.t1)}</b></span><span>Captured <b>${f(r.cap)}</b></span><span>Released <b>${f(r.res+r.s2)}</b></span><span>Mt/yr</span></div><button class="pb" id="clr">Clear selection</button>`;
 $('#mm').innerHTML='<svg viewBox="0 0 170 84" width="100%"><rect x=".5" y=".5" width="169" height="83" rx="6" fill="none" stroke="#2a3d5c"/>'+Object.keys(LB).map(id=>{const p=LB[id].p,x=(p.x+34)/104*160+5,y=(p.z+18)/36*74+5,on=id==sel;return`<circle data-i="${id}" cx="${x}" cy="${y}" r="${on?6:4}" fill="${AS[id].g?'#2fd4d8':'#ff7a45'}" stroke="${on?'#fff':'none'}"><title>${AS[id].n}</title></circle>`}).join('')+'</svg>'}
$('#route').onclick=e=>{const i=e.target.dataset.i;if(i)select(i);if(e.target.id=='clr'){sel=null;focus(null);update()}};$('#mm').onclick=e=>{const i=e.target.dataset.i;if(i)select(i)};
$('#zi').onclick=()=>{rad=Math.max(28,rad*.8)};$('#zo').onclick=()=>{rad=Math.min(205,rad*1.25)};$('#zr').onclick=()=>{sel=null;focus(null);update()};
$('#srch').oninput=e=>{const q=e.target.value.toLowerCase().trim();$('#sres').innerHTML=q?Object.entries(AS).filter(([k,a])=>(a.n+' '+a.s+' '+a.sc+' '+AREA[k]).toLowerCase().includes(q)).map(([k,a])=>`<button data-i="${k}">${a.n}<small>${AREA[k]}</small></button>`).join('')||'<small style="padding:6px 10px;display:block">No match</small>':''};
$('#sres').onclick=e=>{const b=e.target.closest('[data-i]');if(b){select(b.dataset.i);$('#sres').innerHTML='';$('#srch').value=''}};
addEventListener('keydown',e=>{if(e.key==='Escape'&&document.activeElement===cv){sel=null;update()}if(e.key=='/'&&document.activeElement.tagName!='INPUT'){e.preventDefault();$('#srch').focus()}});
// Optional direct entry from the U.S. Atlas: only validated scenario INPUTS are imported.
// The selected map pin remains an ILLUSTRATIVE REGION, not a real facility digital twin.
function importAtlasScenario(){
 const q=new URLSearchParams(window.location.search);
 const site=q.get('site');
 const patch={};
 for(const k of Object.keys(E.R)){
   const raw=q.get(k);if(raw===null||raw.trim()==='')continue;
   const v=Number(raw);if(Number.isFinite(v))patch[k]=v;
 }
 if(q.has('ccs'))patch.ccs=q.get('ccs')==='true'||q.get('ccs')==='1';
 if(Object.keys(patch).length){
   // E.validate clamps bounds and reconciles electricity mix shares.
   Object.assign(P,E.validate({...P,...patch}).p);
   const yr=Number(q.get('year'));
   if(Number.isFinite(yr)&&q.has('year'))SY=Math.max(2025,Math.min(2050,Math.round(yr)));
   update();
 }
 if(site&&/^[a-z0-9_-]{1,32}$/i.test(site)){
   const label=document.getElementById('atlasSiteContext');
   label.hidden=false;label.textContent='Atlas context: '+site.replace(/-/g,' ')+' (illustrative template)';
   const back=document.querySelector('.integrationNav a[href="/atlas.html"]');
   if(back)back.href='/atlas.html?site='+encodeURIComponent(site);
 }
}

size();step(0);importAtlasScenario();requestAnimationFrame(loop);
