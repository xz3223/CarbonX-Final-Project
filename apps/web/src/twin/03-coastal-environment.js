/* ========= LIVING RIVERSIDE LANDSCAPE (VISUAL ONLY) =========
  This layer does not add CarbonEngine sources, alter Scope 1/2 numbers, or create clickable plant IDs.
  Existing industrial asset IDs, hit testing, machinery, Carbon heat and Sankey remain untouched.
  All scenery is invented/illustrative, not actual land use or plant geography.
*/
const ENV=new THREE.Group();ENV.name='Environmental context (illustrative, non-emitting)';S.add(ENV);
const ENV_WATER=[];
const E_MAT=new Map(),E_GEO=new Map();
const EC={grass:0x365c42,grass2:0x527b52,meadow:0x62885a,bank:0x8d9d71,
  rock:0x7c8a91,road:0x343f52,line:0xf4d67d,soil:0x6b634a,water:0x1d7390,
  silver:0xa4b9c3,dark:0x2d4050,stone:0xb5b6ab,roof:0x6d7182,wood:0xa8886c,
  tree:0x37744c,tree2:0x56a363,tree3:0x2d6747,evergreen:0x225347,leaf:0x78b36c,
  glass:0x43778a};
function eMaterial(col,opts={}){
 const key=[col,opts.metalness||0,opts.roughness??.85,opts.transparent||false,opts.opacity??1,opts.side||0].join('_');
 if(!E_MAT.has(key))E_MAT.set(key,new THREE.MeshStandardMaterial({color:col,metalness:opts.metalness||0,roughness:opts.roughness??.85,transparent:opts.transparent||false,opacity:opts.opacity??1,side:opts.side||THREE.FrontSide}));
 return E_MAT.get(key);
}
function eGeo(kind,...p){const k=kind+'_'+p.join('_');if(!E_GEO.has(k)){
  const geo=kind==='b'?new THREE.BoxGeometry(...p):kind==='c'?new THREE.CylinderGeometry(p[0],p[1],p[2],p[3]||10):kind==='s'?new THREE.SphereGeometry(p[0],p[1]||8,p[2]||6):kind==='cone'?new THREE.ConeGeometry(p[0],p[1],p[2]||8):new THREE.TorusGeometry(p[0],p[1],5,20);
  E_GEO.set(k,geo);
 }return E_GEO.get(k)
}
function em(g,geo,col,x,y,z,rot=null,opt={}){const m=new THREE.Mesh(geo,eMaterial(col,opt));m.position.set(x,y,z);if(rot)m.rotation.set(...rot);m.castShadow=false;m.receiveShadow=false;g.add(m);return m}
function eb(g,w,h,d,col,x,y,z,rot){return em(g,eGeo('b',w,h,d),col,x,y,z,rot)}
function ecyl(g,r1,r2,h,col,x,y,z,rot,segments){return em(g,eGeo('c',r1,r2,h,segments||10),col,x,y,z,rot)}
function esph(g,r,col,x,y,z){return em(g,eGeo('s',r,9,7),col,x,y,z)}
function econe(g,r,h,col,x,y,z){return em(g,eGeo('cone',r,h,9),col,x,y,z)}
function eSeg(g,a,b,r,c){const p=V(...a),q=V(...b),d=q.clone().sub(p),l=d.length();if(l<.001)return;const o=ecyl(g,r,r,l,c,...p.clone().add(q).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o}
let seed=20261115;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const ELAND=new THREE.Group(),EROADS=new THREE.Group(),EWATER=new THREE.Group(),EGREEN=new THREE.Group(),EHOUSES=new THREE.Group();
for(const [g,n] of [[ELAND,'Terrain'],[EROADS,'Service roads and bridge'],[EWATER,'River and banks'],[EGREEN,'Trees and vegetation'],[EHOUSES,'Riverside neighborhood']]){g.name=n;ENV.add(g)}
// Continuous underlay outside the existing THREE ground slabs; original plant floor y=0 stays uncovered.
eb(ELAND,154,.22,178,EC.grass,0,-.34,15);
for(const [x,z,w,d,c] of [[0,-47,152,15,EC.soil],[0,44,152,15,EC.grass2],[0,85,152,48,EC.grass2],[0,-58,152,15,EC.meadow]])eb(ELAND,w,.035,d,c,x,-.205,z);
// Existing process yard remains physically in the same place. Roads are outside its perimeter.
function road(x,z,w,d){eb(EROADS,w,.065,d,EC.road,x,-.135,z);if(w>d){for(let a=x-w/2+5;a<x+w/2-3;a+=8)eb(EROADS,3,.017,.13,EC.line,a,-.084,z)}else{for(let a=z-d/2+3;a<z+d/2-3;a+=7)eb(EROADS,.13,.017,2.8,EC.line,x,-.085,a)}}
road(0,39.8,150,6.7);road(0,-48,150,5.8);road(0,73.4,150,5.5);
for(const z of [35.8,43.8,-51.2,-44.7,70.25,76.5])eb(EROADS,150,.075,.17,EC.stone,0,-.08,z);
// River sweeps east-west through the landscape south of the industrial area.
function riverCenter(x){return 56+2.55*Math.sin((x+23)/25)+.65*Math.cos(x/12)}
function ribbon(center,w,y,col,opts={}){
 const points=[],idx=[],uv=[];const N=66,xmin=-75,xmax=83;
 for(let i=0;i<=N;i++){const x=xmin+(xmax-xmin)*i/N,z=center(x);points.push(x,y,z-w/2,x,y,z+w/2);uv.push(i/N,0,i/N,1);if(i<N){const j=i*2;idx.push(j,j+1,j+2,j+1,j+3,j+2)}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
 return em(EWATER,geo,col,0,0,0,null,{side:THREE.DoubleSide,...opts});
}
ribbon(riverCenter,18,-.11,0x25536a,{metalness:.13,roughness:.34});
ribbon(riverCenter,15.9,-.075,EC.water,{metalness:.18,roughness:.27});
// Thin ribbons stand in for sunlit water movement (animated independently, optional).
for(let k=0;k<11;k++){
 const x=-55+k*15.5,z=riverCenter(x)-4+rnd()*8;
 const mark=eb(EWATER,3.4,.012,.05,k%2?0x89cddd:0x65bfd1,x,-.048,z);
 mark.material=eMaterial(k%2?0x89cddd:0x65bfd1,{transparent:true,opacity:.55,roughness:.25});
 ENV_WATER.push({mesh:mark,x0:x,phase:rnd()*6.28});
}
// Vegetated riverbank lip and riprap stones follow water edges.
for(const side of [-1,1]){
 for(let x=-67;x<76;x+=2.4){const z=riverCenter(x)+side*(8.4+.55*Math.sin(x*.4));
  eb(EWATER,2.65,.20,.75,side===1?EC.bank:EC.grass2,x,-.09,z);
  if(rnd()<.38)esph(EWATER,.20+rnd()*.27,EC.rock,x,.05,z+side*.20)
 }
}
// Compact low-poly deciduous / evergreen trees: procedural, seeded and outside industrial slabs.
function tree(x,z,s=1,ever=false){const y=-.15,h=(3.25+rnd()*1.55)*s;
 ecyl(EGREEN,.13*s,.20*s,h,0x735747,x,y+h/2,z);
 if(ever){for(let j=0;j<3;j++)econe(EGREEN,(1.05-.22*j)*s,(2.8-.4*j)*s,j%2?EC.evergreen:EC.tree3,x,y+h*.64+j*.60*s,z)}
 else{esph(EGREEN,1.05*s,EC.tree,x,y+h*.78,z);esph(EGREEN,.87*s,EC.tree2,x-.42*s,y+h*.90,z+.2*s);esph(EGREEN,.78*s,EC.leaf,x+.38*s,y+h*.95,z-.35*s)}
}
function bush(x,z,s=1){esph(EGREEN,.58*s,rnd()<.5?EC.tree:EC.tree2,x,-.08,z);if(rnd()<.5)esph(EGREEN,.4*s,EC.leaf,x+.35*s,.02,z+.13*s)}
for(let i=0;i<102;i++){
 const x=-67+rnd()*143;let z;
 if(i<46)z=riverCenter(x)+(rnd()>.5?1:-1)*(11.5+rnd()*6.5);
 else if(i<69)z=-55-rnd()*9;
 else z=79+rnd()*22;
 // Preserve bridge approach and residential driveways.
 if(Math.abs(x-15)<8 && z>39&&z<78)continue;
 if(z>77&&z<97&&x>-49&&x<79 && i%3!==0)continue;
 tree(x,z,.65+rnd()*.58,i%4===0);
}
for(let i=0;i<125;i++){
 const x=-68+rnd()*145;let z=i<65?riverCenter(x)+(rnd()>.5?1:-1)*(9.4+rnd()*2.4):i<91?-54-rnd()*11:78+rnd()*26;
 if(Math.abs(x-15)<5&&z>39&&z<78)continue;
 bush(x,z,.35+rnd()*.7)
}
// Wetland reeds in short clusters; these are landscape cues, not carbon-removal accounting.
for(let i=0;i<115;i++){
 const x=-68+rnd()*144,sgn=rnd()<.5?-1:1,z=riverCenter(x)+sgn*(7.65+rnd()*1.55);
 const h=.35+rnd()*.9;eb(EGREEN,.035,h,.035,i%3?EC.bank:EC.tree2,x,-.1+h/2,z)
}
// Service bridge crosses the river, preserving the existing industrial scene on its northern side.
eb(EROADS,6.4,.44,37.8,EC.road,15,.28,58.1); // raised bridge deck stays above river surface
for(let z=43;z<74;z+=7)eb(EROADS,.13,.021,2.9,EC.line,15,.51,z);
for(const xx of [11.6,18.4]){eb(EROADS,.28,.70,39,EC.stone,xx,.78,58.1);
 for(let zz=40;zz<76;zz+=3.2)eb(EROADS,.14,.95,.14,EC.silver,xx,.81,zz)
}
for(const zz of [49,67])for(const xx of [12.2,17.8])ecyl(EROADS,.32,.44,2,EC.stone,xx,-.6,zz);
// Small houses and administrative-looking buildings are across the water, outside the simulated facility boundary.
const HOME_C=[0xcac9bd,0xc8d8ce,0xd5b8a4,0xa9bbc8,0xd7c4ad,0xc9d4d0,0xbcc6bc];
function house(x,z,w=5.5,d=6.0,h=4.2,ci=0){const g=new THREE.Group();g.name='Contextual house · not part of plant';EHOUSES.add(g);
 const color=HOME_C[ci%HOME_C.length];eb(g,w,h,d,color,x,h/2,z);eb(g,w+1,.16,d+1,EC.dark,x,h+.05,z);
 // Distinct pitched roof formed from two inclined roof plates.
 const peak=.93+ci%3*.17,roofCol=ci%3===0?0x634e49:ci%3===1?0x596b75:0x7b635a,roofAng=Math.atan2(peak,w/2);
 eb(g,w*.59,.17,d+1.15,roofCol,x-w*.245,h+peak*.55,z,[0,0,roofAng]);
 eb(g,w*.59,.17,d+1.15,roofCol,x+w*.245,h+peak*.55,z,[0,0,-roofAng]);
 eb(g,.18,peak,d+1.03,roofCol,x,h+peak*.33,z);
 // Front door, windows and trim, street frontage at z - d/2.
 eb(g,.95,2.05,.07,0x5f6d6f,x-w*.19,1.03,z-d/2-.045);
 for(const wx of [x-w*.26,x+w*.25])for(const wy of [2.65, h>4.9?4.1:2.65]){
  if(wy>h-.35)continue;
  eb(g,.90,.78,.085,EC.glass,wx,wy,z-d/2-.055);eb(g,1.04,.07,.15,EC.stone,wx,wy+.43,z-d/2-.09);
 }
 eb(g,w+1.1,.08,d+.9,EC.stone,x,-.15,z);
 eb(g,w*.3,.12,1.15,EC.wood,x-w*.19,.11,z-d/2-1);
 // Chimney, garden and low planter boxes.
 eb(g,.43,1,.45,EC.stone,x+w*.29,h+.72,z+.9);
 for(let j=0;j<3;j++)bush(x+w*.57,z-d*.25+j*.92,.44);
}
const HOUSES=[[-44,85,5.2,6,4.1],[-32,84,6,6.5,4.7],[-20,86,5.1,5.8,4.1],[-6,86,5.5,6.6,5.2],[28,85,6.3,6.5,4.3],[42,85,5.6,6,5.0],[56,86,6.4,6.6,4.1],[70,85,5.4,6,4.8],[-38,99,5.5,5.7,4.5],[-17,101,5.5,6.2,5.1],[37,99,6.2,6.1,5.0],[64,100,5.8,6.5,4.4]];
HOUSES.forEach(([x,z,w,d,h],i)=>house(x,z,w,d,h,i));
// Small pavement and community park area; each neighborhood object remains noninteractive scenery.
for(const [x,z] of [[-55,79],[82,81],[12,93]]){
 eb(EHOUSES,10,.04,9,EC.meadow,x,-.14,z);
 for(let j=0;j<3;j++)bush(x-3.5+j*3.4,z-2.5,.82)
}
// Land traffic deliberately omitted: no car, truck or bus meshes can enter the water.
// Boat, pier and floating details make the river visually recognizable; no emissions counted.
const BOAT=new THREE.Group();BOAT.name='Illustrative small river boat';EWATER.add(BOAT);
eb(BOAT,5.0,.63,2.1,0xb8d5dc,0,0,0);eb(BOAT,2.1,1.05,1.65,0x5f91a5,-.55,.82,0);eb(BOAT,1.20,.52,1.69,EC.glass,-.40,1.18,0);
eb(BOAT,5.35,.13,2.2,0x39788f,0,-.35,0);ecyl(BOAT,.12,.12,1.7,EC.silver,.65,1.55,-.3);
BOAT.position.set(32,.32,riverCenter(32));
// Shoreline observation deck demonstrates the waterfront context without touching the industrial equipment.
eb(EHOUSES,6,.16,3.0,EC.wood,52,.07,70);for(const xx of [49.4,54.6])for(const zz of [68.8,71.2])eb(EHOUSES,.18,1.8,.18,EC.stone,xx,-.8,zz);

/* ========= OPEN WATER & OFFSHORE CCUS SCENERY =========
 * Physical water surface stays approximately LEVEL. The seafloor (and underlying
 * stratigraphic contacts) slope under it, creating a deepening ocean water column.
 * All of these objects are VISUAL ONLY and are not modelled emission sources.
 */
const ECOAST=new THREE.Group();ECOAST.name='Open sea / offshore engineering (illustrative)';EWATER.add(ECOAST);
const SEA_LEVEL=-.145, SEA_START=76, SEA_END=185, COAST_FRONT=105.8, COAST_BACK=-69;
function smoothCoast(t){t=Math.min(1,Math.max(0,t));return t*t*(3-2*t)}
function seabedHeight(x){
 if(x<=76)return -.32+.055*Math.sin(x*.055);
 const slope=smoothCoast((x-76)/37);
 return -.32-11.2*slope-Math.max(0,x-113)*.027+.24*Math.sin(x*.074)*slope;
}
const SEA_NX=65,SEA_NZ=31,SEA_POS=[],SEA_UV=[],SEA_IND=[],SEA_VERT=[];
for(let i=0;i<=SEA_NX;i++){
 const x=SEA_START+(SEA_END-SEA_START)*i/SEA_NX;
 for(let j=0;j<=SEA_NZ;j++){
  const z=COAST_BACK+(COAST_FRONT-COAST_BACK)*j/SEA_NZ;
  SEA_POS.push(x,SEA_LEVEL,z);SEA_UV.push(i/SEA_NX,j/SEA_NZ);SEA_VERT.push({x,z,ix:i*3*(SEA_NZ+1)+j*3});
  if(i<SEA_NX&&j<SEA_NZ){const p=i*(SEA_NZ+1)+j;SEA_IND.push(p,p+SEA_NZ+1,p+1,p+1,p+SEA_NZ+1,p+SEA_NZ+2)}
 }
}
const SEA_GEOMETRY=new THREE.BufferGeometry();SEA_GEOMETRY.setAttribute('position',new THREE.Float32BufferAttribute(SEA_POS,3));SEA_GEOMETRY.setAttribute('uv',new THREE.Float32BufferAttribute(SEA_UV,2));SEA_GEOMETRY.setIndex(SEA_IND);SEA_GEOMETRY.computeVertexNormals();
const SEA_MESH=em(ECOAST,SEA_GEOMETRY,0x2289ae,0,0,0,null,{transparent:true,opacity:.56,metalness:.20,roughness:.24,side:THREE.DoubleSide});
SEA_MESH.renderOrder=4;SEA_MESH.material.depthWrite=false;
// Ocean cross-section front: a translucent water COLUMN touching the sloped seabed.
const SEA_FACE=[],SEA_FACE_IND=[];
for(let i=0;i<=SEA_NX;i++){
 const x=SEA_START+(SEA_END-SEA_START)*i/SEA_NX;
 SEA_FACE.push(x,SEA_LEVEL,COAST_FRONT+.45,x,seabedHeight(x),COAST_FRONT+.45);
 if(i<SEA_NX){const j=i*2;SEA_FACE_IND.push(j,j+2,j+1,j+1,j+2,j+3)}
}
const SEA_SECTION_GEOM=new THREE.BufferGeometry();SEA_SECTION_GEOM.setAttribute('position',new THREE.Float32BufferAttribute(SEA_FACE,3));SEA_SECTION_GEOM.setIndex(SEA_FACE_IND);SEA_SECTION_GEOM.computeVertexNormals();
const SEA_SECTION=em(ECOAST,SEA_SECTION_GEOM,0x32b6db,0,0,0,null,{transparent:true,opacity:.23,side:THREE.DoubleSide,roughness:.32});SEA_SECTION.material.depthWrite=false;SEA_SECTION.renderOrder=5;
// Water glints and shoreline foam — slight motion without a physically incorrect tilted sea surface.
const SEA_GLINTS=[];
for(let i=0;i<40;i++){
 const x=84+rnd()*97,z=-58+rnd()*149;
 const glint=eb(ECOAST,.7+rnd()*2.3,.012,.035,i%2?0x6bd5e8:0xa1ebf2,x,SEA_LEVEL+.09,z);
 glint.material=eMaterial(i%2?0x6bd5e8:0xa1ebf2,{transparent:true,opacity:.40,roughness:.18});
 SEA_GLINTS.push({m:glint,x,z,phase:rnd()*Math.PI*2});
}
for(let i=0;i<49;i++){
 const z=COAST_BACK+4+i*(COAST_FRONT-COAST_BACK-8)/48;
 eb(ECOAST,1.4,.025,.09,0x9be9df,77.5,SEA_LEVEL+.1,z);
}
// A steel jacket platform whose legs touch the dipping seabed, plus working deck,
// bracing, derrick, crane, helipad, piping, and navigation beacons.
const RIG=new THREE.Group();RIG.name='Illustrative offshore drilling platform';ECOAST.add(RIG);
const RIG_X=148,RIG_Z=10,DECK_Y=7.8,RIG_FLOOR=seabedHeight(RIG_X);
const MARINE={white:0xd5e1e6,steel:0x7291a5,navy:0x29495d,rail:0xffbf4d,orange:0xed9744,window:0x2d809d,light:0xe7f3f3};
function marineRail(g,x0,x1,z,y){eSeg(g,[x0,y,z],[x1,y,z],.095,MARINE.rail);for(let x=x0;x<=x1+.01;x+=1.65)eSeg(g,[x,y-.92,z],[x,y,z],.05,MARINE.steel)}
for(const x of [-5.7,5.7])for(const z of [-4.4,4.4]){
 const foot=seabedHeight(RIG_X+x);
 ecyl(RIG,.48,.69,DECK_Y-foot-.25,MARINE.steel,x,(foot+DECK_Y-.25)/2,z);
 ecyl(RIG,.74,.74,.23,0xf1c44f,x,DECK_Y-.45,z);
}
for(let k=0;k<4;k++){
 const y=RIG_FLOOR+1.7+(DECK_Y-RIG_FLOOR-3)*k/4;
 for(const z of [-4.4,4.4]){
  eSeg(RIG,[-5.7,y,z],[5.7,y+2.4,z],.17,0x8ca9b7);
  eSeg(RIG,[-5.7,y+2.4,z],[5.7,y,z],.17,0x8ca9b7);
 }
 for(const x of [-5.7,5.7])eSeg(RIG,[x,y,-4.4],[x,y+2.4,4.4],.13,0x8ca9b7);
}
eb(RIG,15.5,.9,11.8,0x304b5c,0,DECK_Y,0);
eb(RIG,16.0,.16,12.3,0xced6d8,0,DECK_Y+.53,0);
eb(RIG,11.8,.32,8.8,0x8b9da9,-.7,DECK_Y+4.9,0);
for(const z of [-6.12,6.12])marineRail(RIG,-7.6,7.6,z,DECK_Y+1.65);
// Crew accommodations and process modules.
eb(RIG,5.5,5.1,4.7,0xd7e1e4,-4.65,DECK_Y+3.1,-2.65);
eb(RIG,5.9,.24,5.1,0x46687b,-4.65,DECK_Y+5.85,-2.65);
for(let i=0;i<4;i++)eb(RIG,.7,.7,.07,MARINE.window,-6.7+i*1.28,DECK_Y+3.7,-5.04);
for(const [x,z] of [[2,-3.9],[4.2,-3.8],[5.0,-1.6]]){
 ecyl(RIG,.62,.68,3.4,0xbdc9d0,x,DECK_Y+2.5,z);ecyl(RIG,.66,.66,.16,0xffb65a,x,DECK_Y+3.7,z);
}
// 4-legged tapered drilling derrick, with cross-bracing and crown block.
for(let k=0;k<12;k++){
 const y0=DECK_Y+5+k*1.75,y1=y0+1.75,w0=2.6-k*.125,w1=w0-.125;
 for(const zz of [-1,1]){
  eSeg(RIG,[.4-w0,y0,zz*w0*.68],[.4-w1,y1,zz*w1*.68],.11,MARINE.steel);
  eSeg(RIG,[.4+w0,y0,zz*w0*.68],[.4+w1,y1,zz*w1*.68],.11,MARINE.steel);
  eSeg(RIG,[.4-w0,y0,zz*w0*.68],[.4+w1,y1,zz*w1*.68],.065,0xe5a94b);
  eSeg(RIG,[.4+w0,y0,zz*w0*.68],[.4-w1,y1,zz*w1*.68],.065,0xe5a94b);
 }
}
eb(RIG,3.2,.5,2.0,MARINE.orange,.4,DECK_Y+26.2,0);
eSeg(RIG,[.4,DECK_Y+25.7,0],[.4,DECK_Y+7.7,0],.05,0xf1d6aa);
// Helipad: the letter H is built from geometry, not a texture or font dependency.
ecyl(RIG,3.7,3.7,.35,0x2c4e60,9.1,DECK_Y+3.0,-6.7);
ecyl(RIG,3.35,3.35,.07,0x467b80,9.1,DECK_Y+3.22,-6.7);
for(let a=0;a<Math.PI*2;a+=Math.PI/18){const x=9.1+3.32*Math.cos(a),z=-6.7+3.32*Math.sin(a);esph(RIG,.085,0xf5d45a,x,DECK_Y+3.28,z)}
eb(RIG,.22,.035,1.9,0xf1f5f0,8.45,DECK_Y+3.28,-6.7);
eb(RIG,.22,.035,1.9,0xf1f5f0,9.73,DECK_Y+3.28,-6.7);
eb(RIG,1.55,.035,.22,0xf1f5f0,9.1,DECK_Y+3.28,-6.7);
for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
 const x=9.1+3.15*Math.cos(a),z=-6.7+3.15*Math.sin(a);
 ecyl(RIG,.075,.075,.5,0xe6c15d,x,DECK_Y+3.6,z);
}
// Crane arm, yellow service pipes and lifeboat.
eSeg(RIG,[-6.2,DECK_Y+5.9,3.6],[-6.2,DECK_Y+14.9,3.6],.17,MARINE.orange);
eSeg(RIG,[-6.2,DECK_Y+14.7,3.6],[-13.7,DECK_Y+10.8,3.6],.22,MARINE.orange);
eSeg(RIG,[-6.2,DECK_Y+9.7,3.6],[-13.7,DECK_Y+10.8,3.6],.055,0xc4d9e5);
eSeg(RIG,[-13.7,DECK_Y+10.8,3.6],[-13.7,DECK_Y+6.4,3.6],.055,0xe8ecde);
eb(RIG,3.4,1.0,1.6,0xf6a448,-6.15,DECK_Y+.85,5.1);
for(const z of [-2.3,-1.7,-1.1])eSeg(RIG,[5.5,DECK_Y+1,z],[5.5,DECK_Y+5,z],.16,0x29afa9);
// Extra platform detail: stair tower, antenna mast, flare, deck crates and anchor/mooring members.
for(const y of [DECK_Y+1.2,DECK_Y+3.0,DECK_Y+4.8])eSeg(RIG,[-1.8,y,-5.8],[-.2,y+1.0,-5.8],.06,0xdfe8eb);
for(const [x,y,z] of [[-1.8,DECK_Y+1.2,-5.8],[-1.0,DECK_Y+2.1,-5.8],[-.2,DECK_Y+3.0,-5.8]])eSeg(RIG,[x,y,z],[x,y+.95,z],.04,0x90a8b5);
for(const y of [DECK_Y+1.2,DECK_Y+3.0,DECK_Y+4.8])eb(RIG,1.8,.07,.9,0x7891a1,-1.0,y-.45,-5.8);
ecyl(RIG,.10,.10,5.7,0xb7c9d3,6.6,DECK_Y+5.9,4.9);
for(const yy of [DECK_Y+8.1,DECK_Y+9.3])eb(RIG,1.1,.07,.07,0xe8f0ee,6.6,yy,4.9);
esph(RIG,.44,0xdbe6e8,6.6,DECK_Y+8.9,4.9);
eSeg(RIG,[2.8,DECK_Y+5.7,4.4],[2.8,DECK_Y+11.6,4.4],.11,0xe77f41);
esph(RIG,.15,0xffd17d,2.8,DECK_Y+11.95,4.4);
for(const [x,z] of [[3.8,4.7],[4.9,4.7],[3.8,5.9]])eb(RIG,1.15,.75,.9,0x8aa1ac,x,DECK_Y+1.25,z);
for(const [x,z] of [[-5.7,-4.4],[5.7,-4.4],[-5.7,4.4],[5.7,4.4]])eSeg(RIG,[x,DECK_Y-1.0,z],[x*1.32,RIG_FLOOR+.3,z*1.15],.09,0x607b89);
// Jacket well/riser from drill floor to a deep saline formation (schematic).
eSeg(RIG,[.4,DECK_Y+5,0],[.4,-32,0],.29,0x3fc9c1);
for(let i=0;i<5;i++){ecyl(RIG,.40,.40,.15,0xadd8de,.4,-4-i*5.7,0)}
for(const [x,z,c] of [[-7.4,-5.9,0xffc154],[7.4,5.9,0xffc154],[-7.4,5.9,0xf37d61]]){
 esph(RIG,.24,c,x,DECK_Y+2.2,z);
}
RIG.position.set(RIG_X,0,RIG_Z);
// Offshore route removed: no isolated pipe or unsupported conduit across open water.
// 3 different marine vessels: offshore supply, CO₂ carrier concept, and pilot tug.
const COAST_BOATS=[];
function offshoreVessel(x,z,scale=1,kind='supply'){
 const g=new THREE.Group();g.name='Illustrative '+kind+' vessel';ECOAST.add(g);
 const len=kind==='carrier'?18:kind==='tug'?7.2:11.5,wd=kind==='carrier'?4.6:kind==='tug'?2.4:3.45;
 const hullColor=kind==='tug'?0xdb995c:kind==='carrier'?0x4f7687:0x467d91;
 const shape=new THREE.Shape();shape.moveTo(-len*.51,-wd*.5);shape.lineTo(len*.24,-wd*.5);shape.lineTo(len*.40,-wd*.34);shape.lineTo(len*.51,-wd*.08);shape.lineTo(len*.51,wd*.08);shape.lineTo(len*.40,wd*.34);shape.lineTo(len*.24,wd*.5);shape.lineTo(-len*.51,wd*.5);shape.closePath();
 const hull=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.72,steps:1,bevelEnabled:true,bevelThickness:.09,bevelSize:.11,bevelSegments:1}),eMaterial(hullColor,{metalness:.22,roughness:.52}));hull.rotation.x=-Math.PI/2;hull.position.y=-.23;g.add(hull);
 eb(g,len*.84,.14,wd*.83,0xd8e2e5,-len*.04,.54,0);
 eb(g,len*.72,.05,wd*.76,0xf0f6f7,-len*.03,.95,0);
 for(const zz of [-wd*.44,wd*.44])eSeg(g,[-len*.38,1.1,zz],[len*.31,1.1,zz],.04,0xf0f5ee);
 for(const xx of [-len*.30,-len*.05,len*.20])eb(g,.28,.12,.12,0x1b2632,xx,.18,wd*.48);
 if(kind==='carrier'){
  for(let i=0;i<3;i++)ecyl(g,.98,.98,2.35,0xbacfd8,-3.9+i*4,1.71,0,[Math.PI/2,0,0],14);
  for(let i=0;i<3;i++)eSeg(g,[-4.0+i*4,2.9,-1.4],[-4.0+i*4,2.9,1.4],.05,0xeff4f4);
  eb(g,2.4,3.7,wd*.85,0xdbe7e8,-len*.38,2.25,0);
  eb(g,2.5,.68,wd*.88,0x406a82,-len*.38,4.0,0);
  for(let i=0;i<3;i++)eb(g,.42,.42,.08,0x2c7d9a,-len*.78+i*.62,2.75,-wd*.32+i*.32);
  eSeg(g,[2.6,.95,0],[6.0,2.1,0],.10,0xccd8da);
  for(const yy of [1.6,2.1])eSeg(g,[0.6,yy,-1.4],[6.4,yy,-1.4],.05,0xf3be57);
 }else{
  eb(g,kind==='tug'?2.8:3.4,kind==='tug'?2.2:2.7,wd*.75,0xdce8ea,-len*.18,1.9,0);
  eb(g,kind==='tug'?2.95:3.5,.72,wd*.83,0x4c839d,-len*.18,3.1,0);
  for(let i=0;i<3;i++)eb(g,.36,.36,.08,0x2d7d99,-len*.55+i*.56,2.45,-wd*.26);
  if(kind==='supply'){
   for(const zz of [-1.1,1.1])eSeg(g,[1.8,.75,zz],[len*.32,.75,zz],.055,0xffbc4c);
   for(const xx of [1.6,2.7,3.8])eb(g,.88,.55,.86,0x95aab3,xx,1.03,0);
   eSeg(g,[3.7,1.05,0],[5.2,2.35,0],.09,0xf0c35a);
   eSeg(g,[5.2,2.35,0],[5.2,1.2,0],.05,0xe7eded);
  }
  if(kind==='tug'){
   eb(g,1.1,.55,1.2,0x364d61,1.25,1.0,0);
   eSeg(g,[2.2,1.1,0],[2.8,1.8,0],.07,0xd6dfdf);
   esph(g,.18,0xe9e2d0,2.45,1.25,0);
  }
 }
 for(const zz of [-wd*.39,wd*.39]){
  eb(g,.21,.13,.22,0xefc25c,len*.32,.9,zz);
  eb(g,.22,.12,.22,0xea6151,-len*.46,.9,zz);
 }
 ecyl(g,.09,.09,2.15,0x9cbdc4,-len*.27,4.4,0);
 eSeg(g,[-len*.27,4.7,0],[-len*.27,5.2,0],.045,0xdfe7e9);
 for(const zz of [-wd*.48,wd*.48])for(const xx of [-len*.35,-len*.05,len*.25])esph(g,.085,0x202731,xx,.42,zz);
 g.scale.setScalar(scale);g.position.set(x,.20,z);
 COAST_BOATS.push({g,x,z,kind,phase:rnd()*6.28});return g;
}
offshoreVessel(119,36,1.0,'supply');
offshoreVessel(172,-27,1.1,'carrier');
offshoreVessel(106,-11,.95,'tug');
function animateEnvironment(t,dt){if(!ENV.visible)return;
 for(const w of ENV_WATER){w.mesh.position.x=.3*Math.sin(t*.00055+w.phase);w.mesh.material.opacity=.38+.18*Math.sin(t*.00075+w.phase)}
 BOAT.position.x=32+11*Math.sin(t*.00015);BOAT.position.z=riverCenter(BOAT.position.x)+1.1*Math.cos(t*.0003);BOAT.rotation.y=.06*Math.sin(t*.00018);
 // Waves remain nearly horizontal; only subtle ripples are animated.
 const oceanAttr=SEA_GEOMETRY.attributes.position;
 for(const v of SEA_VERT){const shore=smoothCoast((v.x-SEA_START)/12);
  oceanAttr.array[v.ix+1]=SEA_LEVEL+shore*(.065*Math.sin(t*.00085+v.x*.19+v.z*.13)+.035*Math.sin(t*.0011+v.z*.28-v.x*.07));
 }oceanAttr.needsUpdate=true;
 for(const w of SEA_GLINTS){w.m.position.x=w.x+.38*Math.sin(t*.00028+w.phase);w.m.material.opacity=.22+.20*Math.sin(t*.0007+w.phase);}
 for(const ship of COAST_BOATS){const q=ship.g,p=ship.phase;
  q.position.x=ship.x+2.1*Math.sin(t*.000085+p);q.position.z=ship.z+1.6*Math.sin(t*.00012+p);
  q.position.y=.20+.12*Math.sin(t*.0013+p);q.rotation.y=.045*Math.sin(t*.00028+p);q.rotation.z=.025*Math.sin(t*.0011+p);
 }
}
/* ========= END LIVING LANDSCAPE ========= */
