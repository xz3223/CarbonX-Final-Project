/* ================= assets metadata ================= */
const kk=()=>1-P.eff/100*.6;
const AS={
raw:{n:'Stockyard & conveyor',s:'Stockyard',p:'Coal, coke and iron ore are stored and lifted to the furnace top.',role:'Carbon enters the plant here as fuel and reductant.',sc:'Inputs (no direct emissions)',cap:'≈6 Mt raw material/yr',en:()=>120,em:()=>0,m:['Electric conveyor optimisation','Raw-material quality control']},
sinter:{n:'Coke & sinter plant',s:'Coke & sinter',p:'Coke making and ore agglomeration.',role:'Combustion and process CO₂ from coal carbon.',sc:'Scope 1 combustion + process',cap:'Reference: 2.6 Mt sinter/yr',en:r=>r.fuel.sinter,em:r=>r.s1.sinter,m:['Waste-heat recovery','Point-source capture','Energy efficiency']},
bf:{n:'Blast furnace',s:'Blast furnace',p:'Illustrative iron reduction step: Fe₂O₃ + 3CO → 2Fe + 3CO₂.',role:'Largest single source: carbon is the chemical reductant, not just fuel.',sc:'Scope 1 process + combustion',cap:'Reference: 2.0 Mt hot metal/yr',en:r=>r.fuel.bf,em:r=>r.s1.bf,m:['Capture from top-gas / flue gas','Efficiency (injection, heat integration)','Longer term: hydrogen DRI (outside this model)']},
stoves:{n:'Hot-blast stoves',s:'Hot-blast stoves',p:'Burn furnace gas to pre-heat the air blown into the furnace.',role:'Combustion CO₂ in a flue gas that can be captured.',sc:'Scope 1 combustion',cap:'3 conceptual stoves',en:r=>r.fuel.stoves,em:r=>r.s1.stoves,m:['Flue-gas capture','Heat recovery']},
mill:{n:'Steel shop & hot rolling',s:'Steel shop & rolling',p:'Converter steelmaking, casting and reheating.',role:'Diffuse sources assumed not capturable here.',sc:'Scope 1 process + combustion',cap:'Reference: 2.0 Mt steel/yr',en:r=>r.fuel.mill,em:r=>r.s1.mill,m:['Electric reheating','Gas recovery']},
stack:{n:'Main stack',s:'Stack',p:'Collected flue gas leaves through the stack after dust removal.',role:'Where un-captured fossil CO₂ is released to the atmosphere.',sc:'Scope 1 released',cap:'—',en:()=>0,em:r=>r.res,m:['Capture upstream reduces this flow']},
util:{n:'Purchased power & solar',s:'Power & solar',p:'Electricity bought from the grid; solar panels indicate the low-carbon share.',role:'Scope 2 emissions occur at the power plant, not on site.',sc:'Scope 2 (illustrative physical supply mix)',cap:'—',en:r=>r.el,em:r=>r.s2,m:['Higher low-carbon share (PPA, on-site)','Lower capture energy']},
ccs:{n:'CO₂ capture unit',s:'CO₂ capture',p:'Absorber / regenerator columns separate CO₂ from flue gas.',role:'Captures fossil CO₂ before release. It does not remove CO₂ already in the air.',sc:'Mitigation technology',cap:'by capture rate',en:r=>r.pg*.7,em:r=>r.cap,g:1,cc:1,m:['Higher capture rate','Lower energy penalty','Solvent management']},
comp:{n:'CO₂ compression & dehydration',s:'Compression',p:'Compresses and dries CO₂ for dense-phase transport.',role:'Part of the capture energy penalty.',sc:'Mitigation technology',cap:'with captured flow',en:r=>r.pg*.3,em:r=>r.cap,g:1,cc:1,m:['Efficient compressors','Heat integration']},
pipe:{n:'CO₂ pipeline',s:'Pipeline',p:'Transports dense CO₂ to utilization or storage.',role:'Transport loss and cost are modeled; transport fuel remains excluded.',sc:'Mitigation technology',cap:'with transported flow',en:()=>0,em:r=>r.transported,g:1,cc:1,m:['Shared infrastructure','Leak monitoring']},
stor:{n:'Geological storage',s:'Geological storage',p:'CO₂ is injected into a porous reservoir beneath a sealing caprock.',role:'Permanence depends on caprock integrity and monitoring.',sc:'Mitigation technology',cap:'by retention',en:()=>0,em:r=>r.store,g:1,cc:1,m:['Site characterisation','MRV monitoring','Long-term liability']}};
/* ================= particles + camera ================= */
const cv=$('#cv'),R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;R.toneMapping=THREE.ACESFilmicToneMapping;R.outputEncoding=THREE.sRGBEncoding;
const C=new THREE.PerspectiveCamera(38,1,.1,550);
const N=1600,pa=new Float32Array(N*3).fill(-999),pc=new Float32Array(N*3),ag=new Float32Array(N).fill(99),lf=new Float32Array(N),ty=new Uint8Array(N),vv=new Float32Array(N*3),pp=new Float32Array(N);
const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pa,3));pg.setAttribute('color',new THREE.BufferAttribute(pc,3));
const pts=new THREE.Points(pg,new THREE.PointsMaterial({size:.8,vertexColors:true,transparent:true,opacity:.92,depthWrite:false}));pts.frustumCulled=false;S.add(pts);
const mkp=a=>{const s=[];let t=0;for(let i=1;i<a.length;i++){const l=Math.hypot(...a[i].map((v,j)=>v-a[i-1][j]));s.push(l);t+=l}return{a,s,t}};
const PT={2:mkp([[27,5,0],[36,3.2,0],[36,17,-1],[41,17,-1],[41,1.6,-1],[45,1.6,3.3],[49,.9,8],[63.5,.9,8]]),3:mkp([[-21,1.6,-10.5],[-2.6,17.4,-1.2],[0,15,0]])},SPD={2:7,3:4};
const rate=[0,0,0,0],acc=[0,0,0,0];let fr=0;
function spawn(t){for(let k=0;k<N;k++){const i=(fr+k)%N;if(ag[i]>=lf[i]){fr=(i+1)%N;ty[i]=t;ag[i]=0;pp[i]=0;const rn=Math.random;
 if(t==0){pa.set([27+rn()*.4-.2,20.4,rn()*.4-.2],i*3);vv.set([.6+rn()*.5,2+rn(),rn()*.4-.2],i*3);lf[i]=6}
 else if(t==1){pa.set([12,7.2,16],i*3);vv.set([.4,1.3,.1],i*3);lf[i]=4}else lf[i]=99;return}}}
let th=.16,ph=1.16,rad=211,sel=null,mode='n';const tg=V(55,2,18),tg2=tg.clone();
let depthLevel=0;
function syncDepth(){const d=$('#geoDepth');if(d){d.value=depthLevel;$('#depthReadout').textContent=depthLevel===0?'Surface':depthLevel+' units'}}
function moveVerticalView(depth){const next=Math.max(0,Math.min(35,Number(depth)));tg2.y-=next-depthLevel;depthLevel=next;ph=Math.min(1.50,1.14+depthLevel*.0095);tg.copy(tg2);syncDepth();}
$('#geoDepth').addEventListener('input',e=>moveVerticalView(e.target.value));
$('#depthSurface').onclick=()=>{moveVerticalView(0);rad=135;};
$('#depthStorage').onclick=()=>{moveVerticalView(27);rad=Math.min(150,Math.max(105,rad));};
$('#sectionView').onclick=()=>{depthLevel=0;syncDepth();tg2.set(55,-18,20);rad=242;th=.08;ph=1.34;tg.copy(tg2);};
$('#offshoreView').onclick=()=>{depthLevel=0;syncDepth();tg2.set(145,2,12);rad=88;th=.48;ph=1.12;tg.copy(tg2);};
function focus(id){depthLevel=0;syncDepth();if(!id){tg2.set(20,4,0);rad=112;return}const c=new THREE.Box3().setFromObject(A[id]).getCenter(V());c.y=Math.max(c.y,2.2);tg2.copy(c);rad=Math.min(rad,id=='bf'?48:58)}
/* Freely moving site camera: primary left-drag pans across the ground plane.
   Orbit button / Shift+drag / right-drag rotates; click still selects equipment.
   No OrbitControls dependency and no automatic re-centering after a pan. */
let navMode='pan',dn=null;
cv.addEventListener('contextmenu',e=>e.preventDefault());
function panCamera(dx,dy){
  const worldPerPixel=2*rad*Math.tan(THREE.MathUtils.degToRad(C.fov*.5))/Math.max(1,cv.clientHeight);
  const right=V(Math.cos(th),0,-Math.sin(th)),away=V(-Math.sin(th),0,-Math.cos(th));
  const shift=right.multiplyScalar(-dx*worldPerPixel).add(away.multiplyScalar(dy*worldPerPixel*1.20));
  tg2.add(shift);tg2.x=Math.max(-125,Math.min(165,tg2.x));tg2.z=Math.max(-145,Math.min(145,tg2.z));
  tg.copy(tg2); // immediate response; independent of the last selected object
}
cv.addEventListener('pointerdown',e=>{
  if(e.button!==0&&e.button!==2)return;
  const kind=e.button===2||e.shiftKey?'orbit':(navMode==='focus'?'orbit':navMode);
  dn={id:e.pointerId,x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,t:th,p:ph,kind,button:e.button,moved:false};
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove',e=>{
  if(!dn||e.pointerId!==dn.id)return;
  const dx=e.clientX-dn.lx,dy=e.clientY-dn.ly;
  dn.lx=e.clientX;dn.ly=e.clientY;
  if(Math.hypot(e.clientX-dn.x,e.clientY-dn.y)>4)dn.moved=true;
  if(dn.kind==='orbit'){
    th=dn.t-(e.clientX-dn.x)*.008;
    ph=Math.max(.22,Math.min(1.49,dn.p-(e.clientY-dn.y)*.008));
  }else if(dn.moved){panCamera(dx,dy)}
});
cv.addEventListener('pointerup',e=>{
  if(dn&&e.pointerId===dn.id){if(!dn.moved&&dn.button===0){const id=pick(e);if(id)select(id)}dn=null;}
});
cv.addEventListener('pointercancel',()=>dn=null);
cv.addEventListener('wheel',e=>{e.preventDefault();rad=Math.max(28,Math.min(285,rad*(1+e.deltaY*.001)))},{passive:false});
const RC=new THREE.Raycaster();
function pick(e){const b=cv.getBoundingClientRect();RC.setFromCamera(new THREE.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),C);
 const h=RC.intersectObjects(Object.values(A),true)[0];if(!h)return null;let o=h.object;while(o&&!o.userData.id)o=o.parent;return o?o.userData.id:null}
function size(){const w=cv.clientWidth,h=cv.clientHeight;R.setPixelRatio(Math.min(2,devicePixelRatio));R.setSize(w,h,false);C.aspect=w/h;C.updateProjectionMatrix()}
new ResizeObserver(size).observe(cv);
const LB={};Object.keys(AS).forEach(id=>{const d=document.createElement('div');d.className='lb';d.textContent=AS[id].s;d.onclick=()=>select(id);$('#cvw').appendChild(d);const b=new THREE.Box3().setFromObject(A[id]);LB[id]={d,p:V((b.min.x+b.max.x)/2,b.max.y+1.2,(b.min.z+b.max.z)/2)}});
let last=performance.now();
function loop(now){const dt=Math.min(.05,(now-last)/1e3);last=now;
 tg.lerp(tg2,.08);C.position.set(tg.x+rad*Math.sin(ph)*Math.sin(th),tg.y+rad*Math.cos(ph),tg.z+rad*Math.sin(ph)*Math.cos(th));C.lookAt(tg);C.updateMatrixWorld();
 for(let t=0;t<4;t++){acc[t]+=rate[t]*dt;while(acc[t]>=1){spawn(t);acc[t]--}}
 for(let i=0;i<N;i++){if(ag[i]>=lf[i]){pa[i*3+1]=-999;continue}ag[i]+=dt;const j=i*3,t=ty[i];
  if(t<2){const u=ag[i]/lf[i];for(let k=0;k<3;k++)pa[j+k]+=vv[j+k]*dt;pc[j]=1-.25*u;pc[j+1]=.45+.33*u;pc[j+2]=.15+.65*u}
  else{const p=PT[t];pp[i]+=dt*SPD[t];if(pp[i]>=p.t){lf[i]=0;continue}let d=pp[i],s=0;while(d>p.s[s]){d-=p.s[s];s++}const a=p.a[s],b=p.a[s+1],q=d/p.s[s];
   for(let k=0;k<3;k++)pa[j+k]=a[k]+(b[k]-a[k])*q;pa[j+1]+=Math.sin(pp[i]*3)*.12;if(t==2){pc[j]=.05;pc[j+1]=.72;pc[j+2]=.74}else{pc[j]=.27;pc[j+1]=.17;pc[j+2]=.12}}}
 pg.attributes.position.needsUpdate=pg.attributes.color.needsUpdate=true;
 const w=cv.clientWidth,h=cv.clientHeight;for(const id in LB){const v=LB[id].p.clone().project(C),l=LB[id].d;l.style.display=v.z<1?'block':'none';l.style.left=(v.x*.5+.5)*w+'px';l.style.top=(-v.y*.5+.5)*h+'px';l.classList.toggle('on',id==sel)}
 pulse(now);animateEnvironment(now,dt);animateSubsurface(now);R.render(S,C);requestAnimationFrame(loop)}
function tint(r){for(const id in A){const a=AS[id],off=a.cc&&!P.ccs;A[id].children.forEach(m=>{let c=new THREE.Color(m.userData.b);
 if(mode=='c'&&m.userData.t)c=a.g?new THREE.Color(GRN):a.em(r)>0?new THREE.Color(0xdcd3cc).lerp(new THREE.Color(0xe8341c),Math.min(1,a.em(r)/.9)):new THREE.Color(0xd5dce2);
 m.material.color.copy(c);m.material.emissive.setHex(m.userData.e||(id==sel?0x0f5f6b:0));m.material.transparent=true;m.material.opacity=off?.18:m.userData.o})}}
