/*SCENE*/
const S=new THREE.Scene(),A={},solar=[],V=(...a)=>new THREE.Vector3(...a);
const bx=(w,h,d)=>new THREE.BoxGeometry(w,h,d),cy=(r,h,rt,s=24)=>new THREE.CylinderGeometry(rt??r,r,h,s);
const STL=0xaeb8c1,TEAL=0x1f7f7a,YEL=0xe9c13b,ORG=0xe8742a,WHT=0xf2f4f6,GRN=0x2fa66a,CON=0xcbd2d8,RF=0x7d8d9b,DK=0x4d5a66,COP=0xd89b80;
function G(id){const g=new THREE.Group();g.userData.id=id;S.add(g);A[id]=g;return g}
function P3(g,geo,c,x,y,z,o={}){const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:c,roughness:.5,metalness:.35,...o.m}));m.position.set(x,y,z);if(o.r)m.rotation.set(...o.r);m.castShadow=m.receiveShadow=true;Object.assign(m.userData,{b:c,t:o.t,e:o.m&&o.m.emissive||0,o:o.m&&o.m.opacity!=null?o.m.opacity:1});g.add(m);return m}
function pipe(g,a,b,r,c,o){const A_=V(...a),B_=V(...b),d=B_.clone().sub(A_),m=P3(g,cy(r,d.length(),r,14),c,...A_.clone().add(B_).multiplyScalar(.5).toArray(),o);m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());P3(g,new THREE.SphereGeometry(r*1.05,12,8),c,...b,o);return m}
function frame(g,x,z,w,d,h,c,rings){[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>P3(g,bx(.35,h,.35),c,x+a*w/2,h/2,z+b*d/2));
 rings.forEach(y=>{[[w+.4,.25,.25,0,-d/2],[w+.4,.25,.25,0,d/2],[.25,.25,d+.4,-w/2,0],[.25,.25,d+.4,w/2,0]].forEach(([a,b,e,dx,dz])=>P3(g,bx(a,b,e),c,x+dx,y,z+dz));P3(g,bx(w+1.2,.15,d+1.2),YEL,x,y+.2,z)})}
function stripes(g,x,z,h,r,n){const s=h/n;for(let i=0;i<n;i++)P3(g,cy(r*(1-.35*i/n),s,r*(1-.35*(i+1)/n)),i%2?WHT:ORG,x,s*(i+.5),z,{t:1})}

/* ========= VISUAL-ONLY INDUSTRIAL DETAIL KIT =========
 * Procedural sub-meshes add engineering visual texture to the EXISTING assets.
 * No new plant asset IDs, no new major buildings, no physical-model changes.
 * Fine details do not cast shadows; use cached geometries/materials where possible.
 */
const DETAIL_MESHES=[], DMATS=new Map(), DGEO=new Map();
const DC={steel:0xc5d4df,bright:0xe0eaf0,edge:0x63798c,dark:0x344b5d,
  frame:0x879dac,safety:0xf0be47,rail:0xb7cad7,blue:0x4a8cbb,
  teal:0x37b8b2,green:0x57b793,oxide:0xb97858,concrete:0x627281,
  panel:0x9bb2c2,glass:0x29485b,cable:0x263b51};
function dg(type,...p){const k=[type,...p].join('_');if(!DGEO.has(k))DGEO.set(k,type==='b'?new THREE.BoxGeometry(...p):type==='c'?new THREE.CylinderGeometry(p[0],p[0],p[1],p[2]||10):type==='t'?new THREE.TorusGeometry(p[0],p[1],p[2]||5,p[3]||32):new THREE.SphereGeometry(p[0],10,7));return DGEO.get(k)}
function detail(g,geo,col,x,y,z,opts={}){
  const bg=(g===BG),key=col+'_'+(opts.rough??.42)+'_'+(opts.metal??.57);
  let mat;
  if(bg){if(!DMATS.has(key))DMATS.set(key,new THREE.MeshStandardMaterial({color:col,roughness:opts.rough??.42,metalness:opts.metal??.57,side:THREE.FrontSide}));mat=DMATS.get(key)}
  else mat=new THREE.MeshStandardMaterial({color:col,roughness:opts.rough??.42,metalness:opts.metal??.57});
  const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);
  if(opts.rot)m.rotation.set(...opts.rot);
  m.castShadow=false;m.receiveShadow=true;
  // Compatible with existing carbon-heat tinting and parent-group picking.
  m.userData={b:col,t:0,e:0,o:1,industrialDetail:true};g.add(m);DETAIL_MESHES.push(m);return m;
}
function boxD(g,w,h,d,c,x,y,z,o){return detail(g,dg('b',w,h,d),c,x,y,z,o)}
function tubeD(g,a,b,r=.065,c=DC.rail){const a0=V(...a),b0=V(...b),dv=b0.clone().sub(a0),l=dv.length();if(l<.001)return;
  const m=detail(g,dg('c',r,l,9),c,...a0.add(b0).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(V(0,1,0),dv.normalize());return m}
function torusD(g,x,y,z,r=.9,t=.055,c=DC.edge,rot=[Math.PI/2,0,0]){return detail(g,dg('t',r,t,5,40),c,x,y,z,{rot})}
function sphereD(g,x,y,z,r=.08,c=DC.steel){return detail(g,dg('s',r),c,x,y,z)}
function rectRail(g,x,y,z,w,d,h=.85){
  for(const zz of [z-d/2,z+d/2]){tubeD(g,[x-w/2,y+h,zz],[x+w/2,y+h,zz],.055,DC.rail);tubeD(g,[x-w/2,y+h*.52,zz],[x+w/2,y+h*.52,zz],.036,DC.edge)}
  for(const xx of [x-w/2,x+w/2])tubeD(g,[xx,y+h,z-d/2],[xx,y+h,z+d/2],.055,DC.rail);
  const count=Math.max(2,Math.round(w/3));for(let i=0;i<=count;i++){const xx=x-w/2+w*i/count;for(const zz of [z-d/2,z+d/2])tubeD(g,[xx,y,zz],[xx,y+h,zz],.048,DC.rail)}
}
function gridD(g,x,y,z,w,d){
  boxD(g,w,.10,d,DC.dark,x,y,z);boxD(g,w,.035,d,DC.frame,x,y+.065,z);
  for(let i=-3;i<=3;i++)boxD(g,w,.022,.028,DC.rail,x,y+.089,z+i*d/8);
  for(let j=-2;j<=2;j++)boxD(g,.028,.022,d,DC.rail,x+j*w/6,y+.09,z);
}
function ringRail(g,x,y,z,r){
  torusD(g,x,y+.86,z,r+.28,.065,DC.rail);torusD(g,x,y+.39,z,r+.28,.037,DC.edge);
  for(let i=0;i<14;i++){const a=2*Math.PI*i/14,xx=x+(r+.28)*Math.cos(a),zz=z+(r+.28)*Math.sin(a);
    tubeD(g,[xx,y,zz],[xx,y+.86,zz],.051,DC.rail)}
}
function ladderD(g,x,y,z,height,along='x',cage=false){
  if(height<=0)return;const zdir=along==='z';const A=(u,v)=>zdir?[x+v,y+u,z]:[x,y+u,z+v];
  tubeD(g,A(0,-.32),A(height,-.32),.057,DC.safety);tubeD(g,A(0,.32),A(height,.32),.057,DC.safety);
  const n=Math.max(2,Math.round(height/.43));for(let i=1;i<n;i++)tubeD(g,A(height*i/n,-.31),A(height*i/n,.31),.033,DC.rail);
  if(cage){for(let i=2;i<Math.round(height/1.6);i++){let yy=i*1.6;if(yy>height-.6)break;
    // curved safety-cage ribs approximate the protective ladder enclosure
    for(let j=-2;j<2;j++){const p0=A(yy,j*.23),p1=A(yy,(j+1)*.23);p0[0]+=(zdir?1:0)*(.55+.25*Math.sqrt(Math.max(0,1-(j*.42)**2)));p1[0]+=(zdir?1:0)*(.55+.25*Math.sqrt(Math.max(0,1-((j+1)*.42)**2)));
    p0[2]+=(zdir?0:1)*(.55+.25*Math.sqrt(Math.max(0,1-(j*.42)**2)));p1[2]+=(zdir?0:1)*(.55+.25*Math.sqrt(Math.max(0,1-((j+1)*.42)**2)));tubeD(g,p0,p1,.029,DC.edge)}
  }}
}
function flangedNozzle(g,a,b,r=.22,c=DC.steel){tubeD(g,a,b,r,c);const aa=V(...a),bb=V(...b),dir=bb.clone().sub(aa).normalize();
  for(const t of [.2,.82]){const p=aa.clone().lerp(bb,t);const m=detail(g,dg('c',r*1.48,.14,12),DC.edge,...p.toArray());m.quaternion.setFromUnitVectors(V(0,1,0),dir)}}
function valveD(g,x,y,z,r=.34){boxD(g,.35,.40,.36,DC.dark,x,y,z);tubeD(g,[x,y+.18,z],[x,y+.55,z],.055,DC.steel);torusD(g,x,y+.56,z,r,.055,DC.safety,[0,0,0]);
  for(let i=0;i<4;i++){let a=i*Math.PI/2;tubeD(g,[x,y+.56,z],[x+r*Math.cos(a),y+.56+r*Math.sin(a),z],.03,DC.safety)}}
function gaugeD(g,x,y,z){tubeD(g,[x,y,z],[x,y+.25,z],.047,DC.bright);const m=detail(g,dg('c',.19,.11,20),DC.bright,x,y+.40,z,{rot:[Math.PI/2,0,0]});
  boxD(g,.16,.018,.025,DC.dark,x,y+.41,z+.064);return m}
function vesselDetails(g,x,z,r,h,base=0,heavy=false){
  // Horizontal plating seams on the existing shell (no extra vessel volumes).
  for(const p of [.18,.38,.58,.78,.95])torusD(g,x,base+h*p,z,r+.036,.045,p%2<1?DC.edge:DC.steel);
  // Upper maintenance level, safety railing and visible skirt/anchor points.
  const py=base+h*.76;torusD(g,x,py,z,r+.42,.16,DC.dark);ringRail(g,x,py+.08,z,r+.48);
  const lx=x+r+.5;ladderD(g,lx,base+.12,z,h*.75,'z',heavy);
  flangedNozzle(g,[x+r*.85,base+h*.33,z],[x+r+1.2,base+h*.33,z],.20,DC.teal);
  flangedNozzle(g,[x-r*.85,base+h*.57,z],[x-r-1.1,base+h*.57,z],.17,DC.oxide);
  valveD(g,x+r+1.18,base+h*.33+.36,z,.22);gaugeD(g,x+r*.56,base+h*.70,z+r*.63);
  for(let a=0;a<8;a++){const ang=a*Math.PI/4;const xx=x+(r+.08)*Math.cos(ang),zz=z+(r+.08)*Math.sin(ang);
    sphereD(g,xx,base+h*.18,zz,.07,DC.bright);sphereD(g,xx,base+h*.78,zz,.06,DC.steel)}
  if(heavy){torusD(g,x,base+h*.52,z,r+.31,.08,DC.safety);flangedNozzle(g,[x,base+h,z],[x,base+h+1.2,z],.24,DC.bright)}
}
function pumpDetail(g,x,z,scale=1){
  // Attached rotating-machine hardware, not a new machine.
  const s=scale;boxD(g,3.3*s,.12,2.2*s,DC.concrete,x,.08*s,z);
  for(let i=0;i<7;i++)boxD(g,.055*s,.75*s,1.15*s,DC.edge,x-1.12*s+i*.16*s,1.05*s,z);
  boxD(g,.57*s,.5*s,.84*s,DC.frame,x+.02*s,1.05*s,z);torusD(g,x+.35*s,1.05*s,z,.34*s,.057*s,DC.safety,[0,Math.PI/2,0]);
  flangedNozzle(g,[x+.7*s,1.18*s,z],[x+1.75*s,1.18*s,z],.21*s,DC.teal);
  flangedNozzle(g,[x+1.0*s,1.0*s,z],[x+1.0*s,2.18*s,z],.17*s,DC.blue);
  valveD(g,x+1.55*s,1.50*s,z,.20*s);gaugeD(g,x-.35*s,1.50*s,z);
  for(const xx of [x-1.25*s,x+1.25*s])for(const zz of [z-.73*s,z+.73*s])sphereD(g,xx,.27*s,zz,.10*s,DC.bright);
}
function buildingDetail(g,x,z,w,d,h){
  // Existing wall panels, roof seaming, access, ventilators and safety edges.
  for(let i=1;i<=5;i++){const xx=x-w/2+w*i/6;boxD(g,.045,h*.78,.075,DC.frame,xx,h*.48,z+d/2+.035);boxD(g,.045,h*.78,.075,DC.frame,xx,h*.48,z-d/2-.035)}
  for(let k=0;k<3;k++){const zz=z-d/2+d*(k+1)/4;boxD(g,w*.92,.035,.045,DC.panel,x,h+.40,zz)}
  for(let k=0;k<4;k++){const xx=x-w*.39+k*w*.26;boxD(g,w*.15,.55,.07,DC.glass,xx,h*.59,z+d/2+.08)}
  rectRail(g,x,h+.37,z,w*.91,d*.88,.74);ladderD(g,x+w*.5+.12,.2,z+d*.23,h,'z');
  for(let k=0;k<3;k++){const xx=x-w*.28+k*w*.28;boxD(g,.40,.28,.8,DC.edge,xx,h+.58,z-d*.17)}
}
function rackDetail(g,x1,x2,z,y){
  for(let x=x1+3;x<x2;x+=12){boxD(g,.12,.22,3.5,DC.frame,x,y+.9,z);for(const off of [-.9,-.3,.3,.9]){
      torusD(g,x,y+.6,z+off,.23,.047,DC.steel,[0,0,Math.PI/2]);
      boxD(g,.28,.12,.35,DC.dark,x,y+.30,z+off)}
    tubeD(g,[x,y,z-1.15],[x+4.0,y,z-1.15],.055,DC.safety)}
  // Cable tray and perforated tray rungs, following the same existing pipe rack.
  boxD(g,x2-x1,.10,.72,DC.dark,(x1+x2)/2,y+.22,z+1.95);
  for(let x=x1;x<=x2;x+=2.5)boxD(g,.045,.05,.7,DC.rail,x,y+.30,z+1.95);
}
/* ========= END DETAIL KIT ========= */

/* ground slab + roads */
const slab=G('ground');delete A.ground;P3(slab,bx(98,1.2,36),0x15233a,21,-.6,0);P3(slab,bx(98,.06,2.6),0x26374f,21,.03,11.5);P3(slab,bx(2.6,.06,36),0x26374f,-6,.03,0);
/* raw materials + conveyor */
let g=G('raw');P3(g,new THREE.ConeGeometry(2.6,3,18),0x5a3d33,-24,1.5,-12.5,{t:1});P3(g,new THREE.ConeGeometry(2.1,2.4,18),0x3b3430,-20,1.2,-14.5,{t:1});P3(g,bx(2.6,2.2,2.6),DK,-21,1.1,-10.5);
const CA=V(-21,1.6,-10.5),CB=V(-2.6,17.4,-1.2),CD=CB.clone().sub(CA),CL=CD.length();CD.normalize();
P3(g,bx(CL,.7,1.6),DK,...CA.clone().add(CB).multiplyScalar(.5).toArray(),{t:1}).quaternion.setFromUnitVectors(V(1,0,0),CD);
for(let i=1;i<7;i++){const q=CA.clone().add(CB.clone().sub(CA).multiplyScalar(i/7));P3(g,bx(.3,q.y,.3),YEL,q.x,q.y/2,q.z)}
/* coke & sinter */
g=G('sinter');P3(g,bx(7,5,6),CON,-12,2.5,-14,{t:1});P3(g,bx(7.4,.4,6.4),RF,-12,5.2,-14);stripes(g,-15.5,-17,12,.8,6);pipe(g,[-12,5,-14],[-15.5,9,-17],.3,STL);
/* blast furnace */
g=G('bf');frame(g,0,0,6.6,6.6,17,TEAL,[4,8.5,13,17]);
P3(g,cy(2.8,3),COP,0,1.5,0,{t:1,m:{emissive:0xff4a10,emissiveIntensity:.55}});P3(g,cy(2.8,2.5,3.7),COP,0,4.25,0,{t:1,m:{emissive:0xff6a20,emissiveIntensity:.3}});
P3(g,cy(3.7,1.5),STL,0,6.25,0,{t:1});P3(g,cy(3.7,6.5,2.4),STL,0,10.25,0,{t:1});P3(g,cy(1.6,1.6,1.2),DK,0,14.05,0,{t:1});
P3(g,new THREE.TorusGeometry(3.45,.32,10,30),STL,0,3.9,0,{r:[Math.PI/2,0,0]});
pipe(g,[0,14.5,0],[0,17.8,0],.55,STL);pipe(g,[0,17.8,0],[16,17.8,0],.55,STL);
/* hot-blast stoves */
g=G('stoves');[8,12,16].forEach(x=>{P3(g,cy(2,13),STL,x,6.5,0,{t:1});P3(g,new THREE.SphereGeometry(2,16,10,0,6.283,0,1.5708),STL,x,13,0,{t:1});
 P3(g,cy(2.07,1.7),ORG,x,7,0);P3(g,cy(2.07,.8),ORG,x,10.2,0);pipe(g,[x,17.8,0],[x,14.3,0],.35,STL)});
pipe(g,[3,3.9,2.2],[16,3.9,2.2],.5,STL);
/* steel shop & rolling shed */
g=G('mill');[[bx(16,7,.4),-20,3.5,-3],[bx(.4,7,10),-28,3.5,2],[bx(.4,7,10),-12,3.5,2]].forEach(([a,x,y,z])=>P3(g,a,STL,x,y,z,{t:1}));
P3(g,bx(16.4,.3,6),RF,-20,7.85,-.7,{r:[-.28,0,0]});P3(g,bx(16.4,.3,6),RF,-20,7.85,4.7,{r:[.28,0,0]});P3(g,bx(16,.5,10.2),TEAL,-20,.25,2);
P3(g,bx(10,.6,1.6),0xff7a2a,-21,.9,5.2,{m:{emissive:0xff4a10,emissiveIntensity:.9}});[-24,-21,-18].forEach(x=>P3(g,cy(.5,2.2),DK,x,1.1,1.5,{r:[0,0,1.5708]}));
P3(g,cy(1.4,3.2),DK,-16,1.6,0,{t:1,r:[0,0,0]});
/* stack + baghouse */
g=G('stack');P3(g,bx(5,7,4),CON,21.5,3.5,0,{t:1});[0,1,2,3].forEach(i=>P3(g,bx(.3,6,4.2),STL,19.8+i*1.1,3.5,0));
pipe(g,[18,6,0],[19,6,0],.45,STL);pipe(g,[24,5.5,0],[27,5.5,0],.5,STL);stripes(g,27,0,20,1,9);
/* power + solar */
g=G('util');P3(g,bx(8,4,5),CON,8,2,16,{t:1});P3(g,bx(8.4,.4,5.4),TEAL,8,4.2,16);P3(g,cy(.5,7,.35),STL,12,3.5,16,{t:1});
for(let i=0;i<30;i++){const m=P3(g,bx(1.8,.1,1.2),0x2a6fcf,-27+(i%10)*2.2,.9,14.5+Math.floor(i/10)*2.2,{r:[.45,0,0],m:{metalness:.6,roughness:.25}});solar.push(m)}
/* CCS */
g=G('ccs');[36,41].forEach(x=>{frame(g,x,-1,5.8,5.8,17,GRN,[4,8,12,16.8]);P3(g,cy(2.2,16),STL,x,8,-1,{t:1});P3(g,new THREE.SphereGeometry(2.2,16,10,0,6.283,0,1.5708),STL,x,16,-1,{t:1});P3(g,cy(2.27,1),TEAL,x,5,-1)});
pipe(g,[36,18,-1],[41,18,-1],.5,TEAL);pipe(g,[27,3.2,0],[36,3.2,0],.55,TEAL);pipe(g,[36,3.2,0],[36,3.2,-1],.55,TEAL);
/* compression */
g=G('comp');P3(g,bx(5,2.4,3.4),GRN,45,1.2,5,{t:1});P3(g,cy(1,3.4),STL,44,3.5,5,{t:1});P3(g,cy(1,3.4),STL,46.5,3.5,5,{t:1});pipe(g,[41,1.6,-1],[45,1.6,3.3],.45,TEAL);pipe(g,[47.5,.9,5],[49,.9,8],.45,TEAL);
/* pipeline */
g=G('pipe');pipe(g,[49,.9,8],[58,.9,8],.55,TEAL,{t:1});[50,53,56].forEach(x=>P3(g,bx(.4,.9,1.4),CON,x,.45,8));
/* geological storage cut-away */
g=G('stor');[[1.8,.9,0x4aa3d8,.6],[1.4,2.5,0x8a949d,1],[1,3.7,0x86b36f,1]].forEach(([h,y,c,o])=>P3(g,bx(9,h,8.5),c,63.5,y,8,{t:1,m:{transparent:o<1,opacity:o}}));
pipe(g,[63.5,6.4,8],[63.5,.9,8],.28,TEAL);P3(g,cy(.8,1.4),TEAL,63.5,5.4,8);P3(g,cy(1.2,2.2),STL,60.8,5.3,10.2);
/* lights */
S.add(new THREE.HemisphereLight(0xffffff,0xb7c4d0,.95));
const dl=new THREE.DirectionalLight(0xffffff,1.05);dl.position.set(40,65,40);dl.target.position.set(20,0,0);dl.castShadow=true;dl.shadow.mapSize.set(2048,2048);Object.assign(dl.shadow.camera,{left:-75,right:75,top:50,bottom:-50,near:1,far:170});dl.shadow.bias=-.0005;S.add(dl,dl.target);
/* ===== dense background plant: ILLUSTRATIVE SCENERY (not modelled equipment). Glow of orange/teal lines follows emissions/capture. ===== */
const BG=new THREE.Group();S.add(BG);const GL={o:[],t:[],b:[]};let GO=.6,GT=.1;
const c14=(r,h,rt)=>cy(r,h,rt,14),HS=(r)=>new THREE.SphereGeometry(r,14,8,0,6.283,0,1.5708),SP=r=>new THREE.SphereGeometry(r,10,8);
function d3(geo,c,x,y,z,o={}){const m=P3(BG,geo,c,x,y,z,o);m.castShadow=false;return m}
function run(pts,r,c,L){const o={m:{emissive:c,emissiveIntensity:.6,roughness:.35}};for(let i=1;i<pts.length;i++){const a=V(...pts[i-1]),b=V(...pts[i]),d=b.clone().sub(a),m=d3(c14(r,d.length(),r),c,...a.clone().add(b).multiplyScalar(.5).toArray(),o);m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());L&&L.push(m.material)}pts.forEach(q=>{const s=d3(SP(r*1.02),c,...q,o);L&&L.push(s.material)})}
function mk(x,y,z,c){d3(SP(.55),c,x,y,z,{m:{emissive:c,emissiveIntensity:.9}});d3(new THREE.TorusGeometry(.9,.1,6,16),c,x,y,z,{r:[Math.PI/2,0,0],m:{emissive:c,emissiveIntensity:.7}})}
function tank(x,z,r,h,c=0xc9d2da){d3(c14(r,h),c,x,h/2,z);d3(HS(r),c,x,h,z);[.3,.62].forEach(k=>d3(c14(r+.06,.18),0x8d9aa6,x,h*k,z));d3(bx(.5,h,.15),DK,x+r*.98,h/2,z);d3(c14(.35,.6),STL,x,h+r*.95,z);d3(bx(r*1.2,.15,.15),YEL,x,h+.6,z+.3)}
function vessel(x,z,r,h,c=0xb8c3cc){d3(c14(r,h),c,x,h/2+1,z);d3(HS(r),c,x,h+1,z);d3(HS(r),c,x,1,z,{r:[Math.PI,0,0]});[.3,.55,.8].forEach(k=>d3(c14(r+.45,.12),YEL,x,h*k+1,z));[[-1,-1],[1,1],[-1,1],[1,-1]].forEach(([a,b])=>{d3(bx(.12,h,.12),STL,x+a*(r+.45),h/2+1,z+b*(r+.45));d3(bx(.15,1,.15),DK,x+a*r*.7,.5,z+b*r*.7)});d3(c14(.25,2),STL,x,h+2.2,z)}
function hx(x,z,len){d3(c14(1.1,len),0xaab6c0,x,2,z,{r:[0,0,1.5708]});[-1,1].forEach(s=>{d3(HS(1.1),0xaab6c0,x+s*len/2,2,z,{r:[0,0,-s*1.5708]});d3(bx(.5,1.4,2.2),DK,x+s*len/4,.7,z);d3(c14(.35,.9),STL,x+s*len/4,3.2,z)});d3(c14(1.16,.25),ORG,x-len/2+.8,2,z,{r:[0,0,1.5708]})}
function pump(x,z){d3(bx(3.2,.4,1.7),DK,x,.2,z);d3(c14(.6,1.7),0x4a8fd0,x-.7,1.1,z,{r:[0,0,1.5708]});d3(c14(.8,.9),STL,x+.9,.9,z);d3(c14(.25,1.6),STL,x+.9,2.1,z);d3(bx(.5,.5,.5),ORG,x-.7,1.8,z)}
function bld(x,z,w,d,h,c=0xcbd2d8){d3(bx(w,h,d),c,x,h/2,z);d3(bx(w+.4,.3,d+.4),RF,x,h+.15,z);d3(bx(w*.8,.5,.1),0x2a3a52,x,h*.6,z+d/2+.05);for(let i=0;i<3;i++)d3(bx(1.4,.9,1.2),STL,x-w/3+i*w/3,h+.75,z)}
function cool(x,z){d3(c14(3.4,6,2.6),0xb7c4cf,x,3,z);d3(c14(1.7,1),DK,x,6.5,z);d3(c14(2.7,.2),0x2fd4d8,x,6.1,z,{m:{emissive:0x2fd4d8,emissiveIntensity:.6}})}
function rack(x1,x2,z,y){for(let x=x1;x<=x2;x+=6){[-1.1,1.1].forEach(o=>d3(bx(.35,y,.35),DK,x,y/2,z+o));d3(bx(.3,.3,2.8),DK,x,y,z)}
 [[-.9,0xff7a45,GL.o],[-.3,0x2fd4d8,GL.t],[.3,0x3b8cff,GL.b],[.9,0x9aa7b3,null]].forEach(([o,c,L])=>run([[x1,y+.6,z+o],[x2,y+.6,z+o]],.28,c,L))}
/* ground slabs for north/south yards */
P3(BG,bx(98,1.2,26),0x15233a,21,-.6,-31);P3(BG,bx(98,1.2,22),0x15233a,21,-.6,29);
/* north: tank farm, towers, exchanger bank, cooling */
[-24,-14,-4,6,16].forEach((x,i)=>{tank(x,-30,4.2,8+i%3*1.5);run([[x,6.6,-20.9],[x,6.6,-25.6]],.25,0xff7a45,GL.o);mk(x,14,-30,i%2?0x2fd4d8:0x3b8cff)});
[30,34,38,42].forEach((x,i)=>{vessel(x,-27,1.5,10+i%2*3);mk(x,15.5+i%2*3,-27,0xff7a45)});
[-26,-30,-34].forEach((z,i)=>{hx(54,z,9);pump(44,z+(i%2?1:-1))});cool(62,-24);cool(62,-34);bld(28,-37,10,5,5);
rack(-30,66,-20,6);
/* south: pump station, control building, exchangers, substation */
for(let i=0;i<6;i++){pump(-26+i*5,27);d3(c14(.3,3),STL,-25.1+i*5,2.5,25)}
bld(22,30,12,7,5);bld(-30,34,8,5,4,0xb9c3cc);hx(38,26,8);hx(38,31,8);hx(52,26,8);vessel(60,31,1.6,9);vessel(64,28,1.3,7);
[-33,-29,-25].forEach(x=>{d3(bx(2.2,2.6,2.2),0x7b8896,x,1.3,22);d3(c14(.2,1.2),COP,x,3.2,22)});
rack(-30,66,21,5.5);mk(22,7,26,0x2fd4d8);mk(-14,4,27,0x3b8cff);mk(52,5,26,0xff7a45);
/* glowing route lines along roads */
run([[-30,.4,12.8],[34,.4,12.8],[34,.4,6],[43,.4,6]],.3,0x2fd4d8,GL.t);
run([[-6,.4,-17],[-6,.4,10],[30,.4,10]],.3,0xff7a45,GL.o);
run([[30,.4,-17],[30,.4,-6],[62,.4,-6]],.3,0x3b8cff,GL.b);
function pulse(t){const w=.78+.22*Math.sin(t/380);GL.o.forEach(m=>m.emissiveIntensity=GO*w);GL.t.forEach(m=>m.emissiveIntensity=GT*w);GL.b.forEach(m=>m.emissiveIntensity=.5*w)}
{const gh=new THREE.GridHelper(150,50,0x2fd4d8,0x1b3552);gh.position.set(20,.08,0);gh.material.transparent=true;gh.material.opacity=.35;S.add(gh)}

/* ========= VISUAL-ONLY REFINEMENT OF EXISTING ASSETS ========= */
// Stockyard and existing conveyor: conveyor rollers, side guards and framed supports.
{
  const g=A.raw;for(let i=1;i<14;i++){
    const p=CA.clone().lerp(CB,i/14);boxD(g,.10,.17,1.82,DC.edge,p.x,p.y+.10,p.z);
    if(i%2===0){tubeD(g,[p.x,p.y+.35,p.z-.85],[p.x,p.y+.35,p.z+.85],.055,DC.rail);sphereD(g,p.x,p.y+.35,p.z-.85,.095,DC.safety)}}
  for(const [xx,zz,rr] of [[-24,-12.5,2.6],[-20,-14.5,2.1]]){
    torusD(g,xx,1.45,zz,rr*.73,.067,DC.rail);
    for(let i=0;i<8;i++){const a=Math.PI*2*i/8;sphereD(g,xx+rr*.72*Math.cos(a),1.45,zz+rr*.72*Math.sin(a),.09,DC.safety)}}
}
// Sinter house: existing roof and walls with service walk, louvres, ducts and steel mullions.
{
 const g=A.sinter;buildingDetail(g,-12,-14,7,6,5.2);
 for(let k=0;k<6;k++){const xx=-14.8+k*1.08;boxD(g,.55,.68,.085,DC.glass,xx,3.75,-10.94);boxD(g,.60,.055,.12,DC.panel,xx,4.1,-10.87)}
 gridD(g,-12,6,-14,5.4,2.8);rectRail(g,-12,6.08,-14,5.4,2.8,.76);
 flangedNozzle(g,[-15.45,3.0,-14],[-17.1,3.0,-14],.26,DC.oxide);
}
// Blast furnace: dense horizontal/diagonal truss, shell seams, service rings and gas nozzles.
{
 const g=A.bf;vesselDetails(g,0,0,2.5,12.3,2.0,true);
 for(let i=0;i<3;i++){const y=5+i*3.6;torusD(g,0,y,0,3.1,.08,DC.bright);}
 for(const z of [-3.3,3.3])for(let i=0;i<3;i++){
   const y0=3.0+i*4.2;const left=i%2===0?-3.3:3.3,right=-left;
   tubeD(g,[left,y0,z],[right,y0+4.0,z],.085,DC.frame);
   tubeD(g,[right,y0,z],[left,y0+4.0,z],.060,DC.frame)}
 gridD(g,0,17.15,0,7.4,7.2);rectRail(g,0,17.20,0,7.4,7.2,.8);
 ladderD(g,3.75,.55,3.05,16.3,'x',true);
 flangedNozzle(g,[2.4,6.2,1.7],[5.1,6.2,1.7],.36,DC.oxide);
 valveD(g,5.0,6.6,1.7,.32);gaugeD(g,2.6,12.0,2.3);
}
// Existing three hot-blast stoves: shell panels, individual ladders and one maintenance walkway.
{
 const g=A.stoves;
 for(const x of [8,12,16]){
   vesselDetails(g,x,0,2.0,12.5,.3,false);
   for(let y=1.0;y<12;y+=2.2)torusD(g,x,y,0,2.09,.048,DC.frame);
   flangedNozzle(g,[x,6.7,-1.9],[x,6.7,-3.0],.20,DC.oxide);
   gaugeD(g,x+.6,9.8,1.9)}
 gridD(g,12,12.7,2.5,12.0,1.5);rectRail(g,12,12.78,2.5,12.0,1.5,.82);
}
// Existing steel shop: cladding seams, skylight ribs, furnace-door accents, vents and service access.
{
 const g=A.mill;for(let i=0;i<9;i++){
   const x=-27.2+i*1.8;boxD(g,.075,6.5,.12,DC.edge,x,3.35,-3.05);
   tubeD(g,[x,7.45,-3.05],[x,8.15,1.8],.053,DC.rail);
   tubeD(g,[x,8.15,1.8],[x,7.45,4.95],.053,DC.rail);
   if(i%2===0)boxD(g,.85,.24,.75,DC.dark,x,8.1,1.9)}
 for(let j=0;j<4;j++){const x=-25.3+j*3.5;boxD(g,2.5,1.0,.09,DC.glass,x,4.5,-3.15);
   boxD(g,2.6,.08,.11,DC.panel,x,5.0,-3.08)}
 for(let i=0;i<9;i++)boxD(g,.085,.6,.9,DC.edge,-25+i*.95,1.05,5.9);
 ladderD(g,-27.7,.15,5.5,7.9,'z');
}
// Original stack/baghouse: top inspection rings, handrails, louvers and access ladder.
{
 const g=A.stack;buildingDetail(g,21.5,0,5,4,7);
 for(let k=0;k<4;k++)boxD(g,3.7,.12,.10,DC.edge,21.5,1.5+k*1.15,2.10);
 for(const y of [7.2,12.1,17.1]){
   torusD(g,27,y,0,1.5,.17,DC.dark);ringRail(g,27,y+.15,0,1.43)}
 ladderD(g,28.5,.4,.0,18.4,'z',true);
 flangedNozzle(g,[25.9,5.4,0],[27,5.4,0],.37,DC.oxide);
}
// Utility building and EXISTING solar panels: facade, inverter-like details and metal panel frames.
{
 const g=A.util;buildingDetail(g,8,16,8,5,4.4);
 for(let i=0;i<30;i++){
   const m=solar[i];const x=m.position.x,z=m.position.z,y=m.position.y;
   boxD(g,1.85,.07,1.25,DC.frame,x,y-.09,z,{rot:[.45,0,0]});
   boxD(g,.045,.035,1.12,DC.rail,x-.62,y+.02,z,{rot:[.45,0,0]});
   boxD(g,.045,.035,1.12,DC.rail,x+.62,y+.02,z,{rot:[.45,0,0]});
   // Follow the panel's original visibility as the renewable-share slider changes.
   const a=DETAIL_MESHES.slice(-3);m.userData.detailFollowers=a;
 }
 for(let i=0;i<4;i++)boxD(g,.7,.5,.35,DC.dark,5.6+i*1.55,1.8,18.64);
}
// Two EXISTING CCS columns, with vessel bands, catwalks and dedicated process instrumentation.
{
 const g=A.ccs;
 for(const x of [36,41]){
   vesselDetails(g,x,-1,2.2,15.6,1.0,true);
   for(const y of [4.6,9.3,13.3]){torusD(g,x,y,-1,2.47,.13,DC.frame);}
   flangedNozzle(g,[x-1.9,11,-1],[x-3.2,11,-1],.23,DC.teal);
   gaugeD(g,x+1.2,6.8,-.3);
 }
 gridD(g,38.5,12.1,2.2,6.3,1.8);rectRail(g,38.5,12.16,2.2,6.3,1.8,.85);
 tubeD(g,[36,17.5,-1],[41,17.5,-1],.24,DC.teal);
}
// Existing CO2 compression skid, powertrain, fin arrays, valves, pressure gauges.
{
 const g=A.comp;pumpDetail(g,45,5,1.25);
 for(let k=0;k<10;k++)boxD(g,.062,1.15,2.0,DC.rail,43.15+k*.31,2.6,4.85);
 boxD(g,5.9,.22,4.0,DC.concrete,45,.1,5);
 valveD(g,46.4,4.2,5.0,.34);gaugeD(g,44.2,4.1,5.4);
 flangedNozzle(g,[45.6,3.6,6],[48.1,3.6,6],.17,DC.teal);
}
// Existing CO2 transfer pipeline: flange joints, saddle supports and stop valves.
{
 const g=A.pipe;for(const x of [50.5,53.5,56.5]){
  torusD(g,x,.9,8,.63,.12,DC.steel,[0,0,Math.PI/2]);
  boxD(g,1.2,.13,1.6,DC.concrete,x,.05,8);
  boxD(g,.15,.42,1.15,DC.edge,x,.55,8)}
 valveD(g,54.4,1.75,8,.25);
}
// Existing geological storage cut-away: casing / monitoring indications (no new facility).
{
 const g=A.stor;for(const y of [1.9,2.5,3.1,3.9])torusD(g,63.5,y,8,.48,.063,DC.steel);
 boxD(g,2.2,.32,2.0,DC.concrete,63.5,4.5,8);valveD(g,63.5,6.45,8,.36);
 for(let i=0;i<8;i++)sphereD(g,60+i*.9,1.8,11.8,.10,DC.teal);
}
// Enrich the EXISTING backdrop objects at their original coordinates; no extra large buildings.
[-24,-14,-4,6,16].forEach((x,i)=>vesselDetails(BG,x,-30,4.2,8+i%3*1.5,0,false));
[30,34,38,42].forEach((x,i)=>vesselDetails(BG,x,-27,1.5,10+i%2*3,1,true));
[[-26,1.6,9],[60,1.6,9],[64,1.3,7]].forEach(([x,r,h])=>{const z=x<0?-32:x===60?31:28;if(x>0)vesselDetails(BG,x,z,r,h,1,false)});
[-26,-30,-34].forEach((z,i)=>pumpDetail(BG,44,z+(i%2?1:-1),.83));
for(let i=0;i<6;i++)pumpDetail(BG,-26+i*5,27,.83);
for(const [x,z,w,d,h] of [[28,-37,10,5,5],[22,30,12,7,5],[-30,34,8,5,4]])buildingDetail(BG,x,z,w,d,h);
for(const z of [-24,-34]){ringRail(BG,62,5.45,z,2.65);for(let a=0;a<8;a++){
 const t=2*Math.PI*a/8;boxD(BG,.4,1.35,.14,DC.edge,62+2.4*Math.cos(t),4.6,z+2.4*Math.sin(t),{rot:[0,t,0]})}}
rackDetail(BG,-30,66,-20,6);rackDetail(BG,-30,66,21,5.5);
// Enrich the existing horizontal heat exchanger models with fin rings, bearing brackets and small gauges.
for(const [x,z,l] of [[54,-26,9],[54,-30,9],[54,-34,9],[38,26,8],[38,31,8],[52,26,8]]){
 for(let i=1;i<16;i++){
 const xx=x-l/2+l*i/16;torusD(BG,xx,2,z,1.15,.034,DC.steel,[0,Math.PI/2,0]);}
 boxD(BG,l+1,.15,2.5,DC.concrete,x,.15,z);gaugeD(BG,x+l*.22,2.85,z);
}
// Road markings and existing slab details only, no extra units/buildings.
for(let x=-25;x<67;x+=7){boxD(slab,2.4,.012,.10,DC.safety,x,.064,11.4);boxD(BG,2.4,.012,.10,DC.safety,x,.064,-19.8)}
for(let x=-28;x<60;x+=9)for(const z of [-13.2,16.9]){
 boxD(BG,1.0,.04,.68,DC.dark,x,.075,z);
 for(let i=0;i<4;i++)boxD(BG,.06,.052,.64,DC.edge,x-.37+i*.24,.096,z)
}
for(const [x,z,w,d] of [[0,0,9,9],[36,-1,8,8],[41,-1,8,8],[45,5,7,5],[21.5,0,7,6]]){
 boxD(slab,w,.055,d,DC.concrete,x,.005,z); // existing equipment foundation edges
}
// Secondary fill lighting to reveal the new metal seams and equipment silhouettes.
const fillLight=new THREE.DirectionalLight(0xc2e3ff,.36);fillLight.position.set(-45,26,-28);S.add(fillLight);
