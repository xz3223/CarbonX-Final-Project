(function(g){'use strict';
const ref=g.CTVReference||(typeof require==='function'?require('./ctvReference.js'):null);
const bounds={fee:[0,500],capexIntensity:[0,2000],storageCost:[0,500],mrvCost:[0,100],fixedRate:[0,1],sustainRate:[0,1],wcRate:[0,1],cod:[2027,2036],u1:[0,1],u2:[0,1],uSteady:[0,1],reserveFraction:[0,1],discount:[0,.5]};
function validate(raw){const p={...ref.pathways[0].p,...raw};for(const [k,v] of Object.entries(p)){if(!bounds[k]||typeof v!=='number'||!Number.isFinite(v)||v<bounds[k][0]||v>bounds[k][1])throw Error('Invalid input: '+k)}if(!Number.isInteger(p.cod))throw Error('COD must be an integer');if(p.u1>p.u2||p.u2>p.uSteady)throw Error('Utilization must satisfy year 1 ≤ year 2 ≤ steady');return p}
function npv(cfs,r){return cfs.reduce((s,c,i)=>s+c/Math.pow(1+r,i),0)}
function irr(cfs){const signs=cfs.filter(c=>Math.abs(c)>1e-10).map(Math.sign);if(!signs.includes(-1)||!signs.includes(1)||signs.slice(1).filter((s,i)=>s!==signs[i]).length>1)return null;let lo=-.9999,hi=1;while(npv(cfs,hi)>0&&hi<10000)hi*=2;if(npv(cfs,lo)*npv(cfs,hi)>0)return null;for(let i=0;i<90;i++){let m=(lo+hi)/2;if(npv(cfs,m)>0)lo=m;else hi=m}return (lo+hi)/2}
function calc(raw){const p=validate(raw),b=ref.basis,K=b.capacityMt*p.capexIntensity,reserve=b.responsibilityM*p.reserveFraction,years=[];let totalQ=0,cumulative=0,prevWC=0;
for(let year=b.baseYear;year<=b.endYear;year++){
 const age=year-p.cod,util=age<0?0:age===0?p.u1:age===1?p.u2:p.uSteady;
 const q=Math.max(0,Math.min(b.capacityMt*util,b.storageBudgetMt-totalQ));totalQ+=q;
 const development=year>b.baseYear&&year<p.cod?K/(p.cod-b.baseYear-1):p.cod===2027&&year===b.baseYear?K:0;
 const reserveOut=year===b.baseYear?reserve:0,revenue=q*p.fee,variable=q*(p.storageCost+p.mrvCost),fixed=age>=0?K*p.fixedRate:0,maintenance=age>=0?K*p.sustainRate:0,wc=revenue*p.wcRate,deltaWC=wc-prevWC;prevWC=wc;
 const cf=revenue-variable-fixed-maintenance-development-deltaWC-reserveOut;cumulative+=cf;
 years.push({year,t:year-b.baseYear,util,q,revenue,variable,fixed,maintenance,development,reserveOut,deltaWC,cf,cumulative});
}
const cfs=years.map(y=>y.cf);return {p,years,npv:npv(cfs,p.discount),irr:irr(cfs),capex:K,reserve,totalQ,cashEnd:cumulative};}
function classify(r,baselineFloor=ref.pathways[0].npv){return r.npv>=-1e-8&&r.irr!==null&&r.irr>=r.p.discount-1e-8?'Positive':r.npv>=baselineFloor-1e-8?'Baseline':'Redline'}
function simulate(raw,band=20,seed=20261118){
 const inputs=validate(raw);if(typeof band!=='number'||!Number.isFinite(band)||band<0||band>100)throw Error('Band must be 0–100');if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Seed must be a uint32');
 let state=seed>>>0;const random=()=>{state=(state+0x6D2B79F5)|0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
 const counts={Positive:0,Baseline:0,Redline:0},results=[];
 for(let index=0;index<1000;index++){const p={...inputs};
  for(const k of ['fee','capexIntensity','storageCost','uSteady']){const v=inputs[k]*(1+(random()+random()-1)*band/100);p[k]=Math.min(bounds[k][1],Math.max(bounds[k][0],v))}
  p.u1=Math.min(p.u1,p.uSteady);p.u2=Math.min(p.u2,p.uSteady);
  const r=calc(p),category=classify(r);counts[category]++;results.push({index,inputs:p,npv:r.npv,irr:r.irr,category});
 }
 return {mode:'simulation',model:'seeded triangular financial scenarios',status:'complete',inputs,band,seed,target:1000,completed:1000,valid:1000,failed:0,counts,percentages:Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,v/10])),results};
}
g.CTVEngine={validate,calc,irr,npv,classify,simulate,bounds};if(typeof module!=='undefined')module.exports=g.CTVEngine;
})(globalThis);
