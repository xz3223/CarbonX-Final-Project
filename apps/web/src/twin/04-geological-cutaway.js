/* ========= SUBSURFACE GEOLOGIC CUTAWAY — VISUAL, NOT A RESERVOIR SIMULATOR =========
 * Depth units are schematic scene coordinates, not measured meters.
 * The geology, offshore platform and moving ships are schematic scenery, separate from carbon/TEA accounting.
 * Keeps existing Three.js equipment ID map untouched. */
const SUBSURFACE=new THREE.Group();SUBSURFACE.name='Illustrative subsurface cutaway';S.add(SUBSURFACE);
const SUB_CO2=[];
const GEO={soil:0x9a5c3c,sandstone:0xbe7348,weathered:0xad6244,aquifer:0x4f92b1,
  shale:0x825d50,caprock:0x555f67,saline:0xc5a264,reservoir:0x564d43,base:0x817765,
  pale:0xb2d8e7,teal:0x35d8cc,orange:0xdf8a54};
const GHOST=(col,rough=.92,metal=0)=>new THREE.MeshStandardMaterial({color:col,roughness:rough,metalness:metal});
const geoPart=(geo,color,x,y,z,options={})=>{
 const m=new THREE.Mesh(geo,GHOST(color,options.rough||.91,options.metal||0));m.position.set(x,y,z);
 if(options.rx)m.rotation.x=options.rx;
 m.castShadow=false;m.receiveShadow=true;SUBSURFACE.add(m);return m;
};
/* ========= CONTINUOUS LAND -> COAST -> SEABED GEOLOGIC CROSS-SECTION =========
 * One watertight 3D layer mesh per lithology, with rolling sediment horizons
 * across the shelf slope. All coordinates are schematic, NOT real depth data.
 * The large exposed front face shows a readable geological side profile.
 */
const ROCK_MIN=-76,ROCK_MAX=185,ROCK_BACK=-69,frontZ=105.8,ROCK_N=112;
const GEO_LAYERS=[
 {name:'Near-surface sediments',col:0x986449,thickness:3.2},
 {name:'Sandstone & siltstone',col:0xbc8051,thickness:5.3},
 {name:'Illustrative freshwater aquifer',col:0x4b899e,thickness:3.4},
 {name:'Mixed sedimentary strata',col:0xaa7450,thickness:7.6},
 {name:'Impermeable caprock / seal',col:0x68737d,thickness:3.45},
 {name:'Porous saline reservoir',col:0xd2b178,thickness:7.9},
 {name:'Deep basement rock',col:0x584b47,thickness:10.3}
];
const GEO_TOTAL=GEO_LAYERS.reduce((sum,l)=>sum+l.thickness,0);
function layerBoundary(index,x){
 const depth=GEO_LAYERS.slice(0,index).reduce((sum,l)=>sum+l.thickness,0);
 const regionalDip=.018*depth*Math.sin(x*.026+index*.26);
 const folding=index===0?0:(.20+.038*index)*Math.sin(x*.045+index*.65)+.17*Math.cos(x*.098-index*.45);
 return seabedHeight(x)-depth+regionalDip+folding;
}
const geocolor=new THREE.Color();
function strataVolume(index){
 const vertices=[],cols=[],idx=[];
 const base=new THREE.Color(GEO_LAYERS[index].col);
 function add(x,y,z,lum){vertices.push(x,y,z);geocolor.copy(base).multiplyScalar(lum);cols.push(geocolor.r,geocolor.g,geocolor.b);return vertices.length/3-1}
 function quad(a,b,c,d){idx.push(a,b,c,a,c,d)}
 for(let k=0;k<ROCK_N;k++){
  const x0=ROCK_MIN+(ROCK_MAX-ROCK_MIN)*k/ROCK_N,x1=ROCK_MIN+(ROCK_MAX-ROCK_MIN)*(k+1)/ROCK_N;
  const u0=layerBoundary(index,x0),u1=layerBoundary(index,x1),v0=layerBoundary(index+1,x0),v1=layerBoundary(index+1,x1);
  const lum=.92+.1*Math.sin(k*.35+index*1.3)+.04*Math.cos(k*.9+index);
  let a=add(x0,u0,frontZ,lum),b=add(x1,u1,frontZ,lum*1.03),c=add(x1,v1,frontZ,lum*.83),d=add(x0,v0,frontZ,lum*.84);quad(a,b,c,d);
  a=add(x0,u0,ROCK_BACK,lum*.66);b=add(x1,u1,ROCK_BACK,lum*.70);c=add(x1,v1,ROCK_BACK,lum*.61);d=add(x0,v0,ROCK_BACK,lum*.62);quad(a,d,c,b);
  a=add(x0,u0,frontZ,lum*.84);b=add(x1,u1,frontZ,lum*.84);c=add(x1,u1,ROCK_BACK,lum*.61);d=add(x0,u0,ROCK_BACK,lum*.61);quad(a,d,c,b);
  a=add(x0,v0,frontZ,lum*.63);b=add(x1,v1,frontZ,lum*.63);c=add(x1,v1,ROCK_BACK,lum*.55);d=add(x0,v0,ROCK_BACK,lum*.55);quad(a,b,c,d);
  if(k===0||k===ROCK_N-1){
   const sx=k===0?x0:x1,up=k===0?u0:u1,dn=k===0?v0:v1;
   a=add(sx,up,frontZ,lum*.87);b=add(sx,up,ROCK_BACK,lum*.71);c=add(sx,dn,ROCK_BACK,lum*.64);d=add(sx,dn,frontZ,lum*.75);quad(a,b,c,d);
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));geometry.setIndex(idx);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.96,metalness:0,flatShading:true}));mesh.receiveShadow=true;mesh.castShadow=false;mesh.name=GEO_LAYERS[index].name;SUBSURFACE.add(mesh);
}
GEO_LAYERS.forEach((layer,i)=>strataVolume(i));
// Rock contacts trace the sea slope and dipping beds across the entire FRONT face.
for(let i=1;i<GEO_LAYERS.length;i++){
 const points=[];for(let k=0;k<=ROCK_N;k++){
  const x=ROCK_MIN+(ROCK_MAX-ROCK_MIN)*k/ROCK_N;
  points.push(new THREE.Vector3(x,layerBoundary(i,x),frontZ+.075));
 }
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:i===2||i===3?0x86dce1:i===4||i===5?0x25333c:0x5f4738,transparent:true,opacity:i===2||i===3?.92:.67}));SUBSURFACE.add(line);
}
// Thin warped sediment laminae amplify the visual appearance of layering.
for(const i of [0,1,3,5,6])for(const part of [.24,.49,.73]){
 const pts=[];for(let k=0;k<=ROCK_N;k++){
  const x=ROCK_MIN+(ROCK_MAX-ROCK_MIN)*k/ROCK_N;
  const a=layerBoundary(i,x),b=layerBoundary(i+1,x),fraction=part+.035*Math.sin(x*.069+i);
  pts.push(new THREE.Vector3(x,a+(b-a)*fraction,frontZ+.10));
 }
 SUBSURFACE.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:i===5?0xe5c88a:0x493a34,transparent:true,opacity:i===5?.45:.24})));
}
// One coherent terrain surface over the strata, green on land, sandy at sea.
const LAND_TOP=[],LAND_COL=[],LAND_IX=[],topColors=[new THREE.Color(0x5b8456),new THREE.Color(0xc2b487)];
for(let k=0;k<=ROCK_N;k++){
 const x=ROCK_MIN+(ROCK_MAX-ROCK_MIN)*k/ROCK_N,y=layerBoundary(0,x)+.014;
 const c=topColors[0].clone().lerp(topColors[1],smoothCoast((x-73)/16));
 for(const z of [ROCK_BACK,frontZ]){LAND_TOP.push(x,y,z);LAND_COL.push(c.r,c.g,c.b)}
 if(k<ROCK_N){const j=k*2;LAND_IX.push(j,j+1,j+2,j+1,j+3,j+2)}
}
const LAND_GEO=new THREE.BufferGeometry();LAND_GEO.setAttribute('position',new THREE.Float32BufferAttribute(LAND_TOP,3));LAND_GEO.setAttribute('color',new THREE.Float32BufferAttribute(LAND_COL,3));LAND_GEO.setIndex(LAND_IX);LAND_GEO.computeVertexNormals();
const TERRAIN_TOP=new THREE.Mesh(LAND_GEO,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));TERRAIN_TOP.receiveShadow=true;SUBSURFACE.add(TERRAIN_TOP);
// Seeded small visible grains embedded on the EXPOSED geological face.
let seedGeo=1627;function geoRandom(){seedGeo=(Math.imul(seedGeo,1664525)+1013904223)|0;return (seedGeo>>>0)/4294967296}
const poreGeom=new THREE.TetrahedronGeometry(.10,0),poreMat=new THREE.MeshStandardMaterial({color:0x3d3b38,roughness:1});
const poreCount=290,pores=new THREE.InstancedMesh(poreGeom,poreMat,poreCount),dummy=new THREE.Object3D();
for(let i=0;i<poreCount;i++){
 const x=ROCK_MIN+3+geoRandom()*(ROCK_MAX-ROCK_MIN-6),y=layerBoundary(0,x)-1.2-geoRandom()*(GEO_TOTAL-2.4);
 dummy.position.set(x,y,frontZ+.18);const r=.4+geoRandom()*2.7;dummy.scale.set(r,r,r);dummy.rotation.set(0,geoRandom()*Math.PI,0);dummy.updateMatrix();pores.setMatrixAt(i,dummy.matrix);
}pores.instanceMatrix.needsUpdate=true;SUBSURFACE.add(pores);
// Stronger deep-layer readability: thicker highlighted contacts plus angular rock fragments.
function boundaryTube(i,color,radius=.10,z=frontZ+.22){
 const pts=[];for(let k=0;k<=ROCK_N;k++){
  const x=ROCK_MIN+(ROCK_MAX-ROCK_MIN)*k/ROCK_N;
  pts.push(new THREE.Vector3(x,layerBoundary(i,x),z));
 }
 const curve=new THREE.CatmullRomCurve3(pts);
 const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,ROCK_N*2,radius,6,false),new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.04,emissive:new THREE.Color(color),emissiveIntensity:.10}));
 tube.castShadow=false;tube.receiveShadow=true;SUBSURFACE.add(tube);
}
boundaryTube(4,0x384955,.11);
boundaryTube(5,0xe4c98c,.14);
boundaryTube(6,0x403735,.12);
const deepRockGroup=new THREE.Group();deepRockGroup.name='Deep geology rock fragments';SUBSURFACE.add(deepRockGroup);
const deepGeoms=[new THREE.DodecahedronGeometry(.34,0),new THREE.TetrahedronGeometry(.42,0),new THREE.OctahedronGeometry(.30,0)];
for(let i=0;i<210;i++){
 const layer=[4,5,6][i%3],x=ROCK_MIN+5+geoRandom()*(ROCK_MAX-ROCK_MIN-10),y0=layerBoundary(layer,x),y1=layerBoundary(layer+1,x);
 const rock=new THREE.Mesh(deepGeoms[i%deepGeoms.length],new THREE.MeshStandardMaterial({color:[0x5e6973,0xc8a66f,0x5a4e49][i%3],roughness:.97,metalness:0}));
 rock.position.set(x,y0+(y1-y0)*(.12+geoRandom()*.76),frontZ+.22+geoRandom()*.95);
 const s=.55+geoRandom()*1.95;rock.scale.setScalar(s);rock.rotation.set(geoRandom()*Math.PI,geoRandom()*Math.PI,geoRandom()*Math.PI);
 deepRockGroup.add(rock);
}
for(const layer of [4,5,6])for(const part of [.18,.36,.58,.81]){
 const pts=[];for(let k=0;k<=ROCK_N;k++){
  const x=ROCK_MIN+(ROCK_MAX-ROCK_MIN)*k/ROCK_N;
  const a=layerBoundary(layer,x),b=layerBoundary(layer+1,x),sway=.045*Math.sin(x*.08+part*12+layer);
  pts.push(new THREE.Vector3(x,a+(b-a)*(part+sway),frontZ+.18));
 }
 SUBSURFACE.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:layer===5?0xf0d392:layer===4?0x63717d:0x5f5652,transparent:true,opacity:layer===5?.42:.34})));
}
// Injection wells: same illustrative onshore well, plus offshore jacket well.
const WELL_X=-8.5,WELL_Z=frontZ+.42;
function wellPipe(points,r=.23,color=0xd3edf3){
 for(let i=1;i<points.length;i++){
  const a=new THREE.Vector3(...points[i-1]),b=new THREE.Vector3(...points[i]),d=b.clone().sub(a),len=d.length();
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,12),GHOST(color,.3,.65));
  m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=false;SUBSURFACE.add(m);
 }
}
const onshoreTop=layerBoundary(0,WELL_X),onshoreReservoir=(layerBoundary(5,WELL_X)+layerBoundary(6,WELL_X))/2;
wellPipe([[WELL_X,2,WELL_Z],[WELL_X,onshoreReservoir,WELL_Z]],.27,0xd5eaf3);
wellPipe([[WELL_X,onshoreReservoir,WELL_Z],[WELL_X-13,onshoreReservoir,WELL_Z]],.19,GEO.teal);
geoPart(bx(2.3,.42,1.7),0x48646c,WELL_X,1.05,WELL_Z);
// No free-standing offshore pipe on the exposed front face; the rig itself retains its attached riser.
// Moving light drops are a visual flow animation, only visible when CCS is active.
for(const [x,top,bottom,z] of [[WELL_X,2,onshoreReservoir,WELL_Z+.32]]){
 for(let i=0;i<9;i++){
  const m=geoPart(new THREE.SphereGeometry(.19,9,6),GEO.teal,x,top,z,{rough:.25,metal:.2});
  m.material.emissive=new THREE.Color(0x22b6b1);m.material.emissiveIntensity=.65;
  SUB_CO2.push({mesh:m,phase:i/9,top,bottom});
 }
}
// Porous plume distributed INSIDE the saline formation, not in caprock.
for(const x0 of [WELL_X-8])for(let i=0;i<29;i++){
 const x=x0-geoRandom()*17,y0=layerBoundary(5,x),y1=layerBoundary(6,x);
 const y=y0+(y1-y0)*(.12+geoRandom()*.71);
 const m=geoPart(new THREE.SphereGeometry(.19+geoRandom()*.34,8,6),0x41c9bd,x,y,frontZ+.30,{rough:.4});
 m.material.transparent=true;m.material.opacity=.39;m.material.emissive=new THREE.Color(0x073d46);
}
function animateSubsurface(t){
 const active=P.ccs&&SUBSURFACE.visible;
 for(const q of SUB_CO2){q.mesh.visible=active;if(!active)continue;
   const k=(q.phase+t*.00010)%1;q.mesh.position.y=q.top+(q.bottom-q.top)*k;
 }
}
/* ========= END SUBSURFACE CUTAWAY ========= */


/* ========= END VISUAL REFINEMENT ========= */

/*ENDSCENE*/
