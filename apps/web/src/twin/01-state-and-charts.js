const $=s=>document.querySelector(s),f=(v,d=2)=>(+v).toFixed(d),M=v=>Math.round(v).toLocaleString('en-US');
/* ================= ENGINE (separate from UI / 3D) ================= */
const E=CarbonEngine,P0={...E.P0},P={...P0},SRC=E.SRC,calc=p=>E.chain(E.calc(p),window.TEA_CONFIG),fin=E.fin,BASEP=E.bau,base=p=>calc(BASEP(p)).net;
const SC=[['Baseline',{}],['Efficiency',{eff:15}],['Low-carbon power',{so:32,wi:28,ot:20,re:80}],['CCS only',{ccs:true}],['Combined',{eff:15,so:32,wi:28,ot:20,re:80,ccs:true}]];
const scp=pt=>norm({...BASEP(P),...pt});
function norm(q){const c=q.so+q.wi+q.ot;if(Math.abs(c-q.re)>.01){if(c>0){const k=q.re/c;q.so*=k;q.wi*=k;q.ot*=k}else q.ot=q.re}return q}

/* ===== scenario simulator helpers (pure) ===== */
const netAt=y=>E.at(P,y,window.TEA_CONFIG);
const YRS=Array.from({length:26},(_,i)=>2025+i);
function axes(w,h,L,B,T,Y,ticks,fm){let s=`<svg viewBox="0 0 ${w} ${h}" width="100%">`;ticks.forEach(v=>s+=`<line x1="${L}" x2="${w-8}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e3eaf0"/><text x="${L-4}" y="${Y(v)+3}" font-size="9" text-anchor="end" fill="#62778a">${fm(v)}</text>`);
 for(let i=0;i<=5;i++)s+=`<text x="${L+i*5/25*(w-L-8)}" y="${h-6}" font-size="9" text-anchor="middle" fill="#62778a">${2025+i*5}</text>`;return s}
function lc(ser,ymax){const w=440,h=210,L=36,B=22,T=8,X=i=>L+i/25*(w-L-8),Y=v=>h-B-v/ymax*(h-B-T);let s=axes(w,h,L,B,T,Y,[0,1,2,3,4].map(i=>ymax*i/4),v=>f(v,1));
 ser.forEach(([n,d,c,da],j)=>{s+=`<polyline fill="none" stroke="${c}" stroke-width="2.5" ${da?'stroke-dasharray="5 3"':''} points="${d.map((v,i)=>X(i)+','+Y(v)).join(' ')}"/><text x="${L+8+j*120}" y="${T+8}" font-size="10" fill="${c}">● ${n}</text>`});return s+'</svg>'}
function ar(ser){const w=440,h=210,L=36,B=22,T=8,X=i=>L+i/25*(w-L-8),Y=v=>h-B-v/100*(h-B-T);let s=axes(w,h,L,B,T,Y,[0,25,50,75,100],v=>v+'%'),cum=Array(26).fill(0);
 ser.forEach(([n,d,c])=>{const lo=cum.slice(),hi=d.map((v,i)=>cum[i]+v);s+=`<polygon fill="${c}" opacity=".88" points="${hi.map((v,i)=>X(i)+','+Y(v)).join(' ')} ${lo.map((v,i)=>X(i)+','+Y(v)).reverse().join(' ')}"/>`;cum=hi});return s+'</svg>'}
let SKM='c',SY=2050,SKS=null;
function skRender(F){const{N:Nn,L,unit,X}=F,N={};for(const k in Nn)N[k]=Object.assign([...Nn[k]],{k,i:0,o:0,x:X[Nn[k][0]]});
 const Lk=L.filter(l=>l[2]>1e-6);Lk.forEach(([a,b,v])=>{N[a].o+=v;N[b].i+=v});const V=Object.values(N).filter(n=>n.i||n.o);V.forEach(n=>n.v=Math.max(n.i,n.o));
 const H=330,gap=12,cols=X.map((_,c)=>V.filter(n=>n[0]==c)),sc=Math.min(...cols.filter(c=>c.length).map(c=>(H-gap*(c.length-1)-4*c.length)/c.reduce((s,n)=>s+n.v,0)));
 cols.forEach(c=>{const tot=c.reduce((s,n)=>s+Math.max(4,n.v*sc)+gap,-gap);let y=(H-tot)/2+10;c.forEach(n=>{n.h=Math.max(4,n.v*sc);n.y=y;y+=n.h+gap;n.oo=0;n.io=0})});
 const g=v=>f(v,unit=='GWh'?0:3)+' '+(unit=='GWh'?'GWh/yr':'Mt CO₂e/yr');let s=`<svg viewBox="0 0 910 ${H+20}" width="100%" style="font-size:11px">`;
 Lk.forEach(([a,b,v])=>{const A=N[a],B=N[b],w=Math.max(1.5,v*sc),y0=A.y+A.oo+w/2,y1=B.y+B.io+w/2,xm=(A.x+12+B.x)/2;A.oo+=w;B.io+=w;
  s+=`<path data-a="${a}" data-b="${b}" d="M${A.x+12} ${y0} C${xm} ${y0} ${xm} ${y1} ${B.x} ${y1}" fill="none" stroke="${A[2]}" stroke-width="${w}"><title>${A[1]} → ${B[1]}: ${g(v)}</title></path>`});
 V.forEach(n=>{const lt=n[0]==0;s+=`<g data-n="${n.k}" style="cursor:pointer"><rect x="${n.x}" y="${n.y}" width="12" height="${n.h}" rx="2" fill="${n[2]}"/><text x="${lt?n.x-6:n.x+18}" y="${n.y+n.h/2+4}" text-anchor="${lt?'end':'start'}" fill="#15222e" stroke="#fff" stroke-width="3" paint-order="stroke">${n[1]} · ${g(n.v)}</text></g>`});return s+'</svg>'}
function sankey(r){return skRender(SKM=='e'?E.energyFlows(r):E.carbonFlows(r))}
function skHi(){document.querySelectorAll('#sk path').forEach(p=>p.style.opacity=!SKS?.38:(p.dataset.a==SKS||p.dataset.b==SKS)?.85:.07)}
$('#sk').onclick=e=>{const n=e.target.closest('[data-n]');SKS=n&&SKS!==n.dataset.n?n.dataset.n:null;skHi()};
$('#skc').onclick=e=>{if(e.target.dataset.m){SKM=e.target.dataset.m;SKS=null;update()}};$('#skc').oninput=e=>{SY=+e.target.value;update()};
$('#plantYear').oninput=e=>{SY=+e.target.value;update()};
const SCN=[['BAU',{}],['Renewable power',{so:35,wi:30,ot:15}],['Electrification',{el:50}],['CCS',{ccs:true}],['Integrated',{eff:15,so:35,wi:30,ot:15,el:50,ccs:true}]];
$('#scn').insertAdjacentHTML('beforeend',SCN.map(([n],i)=>`<button class="pb" data-s="${i}">${n}</button>`).join('')+' <span class="lg">Custom = move any slider. Timing sliders: start year and deployment duration.</span>');
$('#scn').onclick=e=>{const i=e.target.dataset.s;if(i!=null){const q={...BASEP(P),...SCN[i][1]};q.re=Math.min(100,q.so+q.wi+q.ot);set(q)}};
const YT=()=>'<table><tr><th>Year</th><th>Net (100y adj)</th><th>Scope 1</th><th>Scope 2</th><th>Captured</th></tr>'+[2030,2040,2050].map(y=>{const x=netAt(y).r;return`<tr><td>${y}</td><td>${f(x.net)}</td><td>${f(x.res)}</td><td>${f(x.s2)}</td><td>${f(x.cap)}</td></tr>`}).join('')+'</table><small>Mt CO₂e/yr · conditional model results, not forecasts</small>';
