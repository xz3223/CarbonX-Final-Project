/* CCUS Box-Model TEA: illustrative user-defined parameters, not an audited business case.
   All money units: million USD, all mass units: million tonnes CO2 / yr. */
(function(g){'use strict';
 const E=g.CarbonEngine;
 const DEFAULTS={discount:8,captureCapex:450,transportCapex:85,storageCapex:110,
  efficiencyCapex:8,electrifyCapex:3,renewCapex:1.5,utilCapex:180,
  captureOpex:35,transportOpex:13,storageOpex:18,utilOpex:12,mrvOpex:5,
  powerPrice:.07,renewPremium:.01,effSavings:3,fuelSavings:.4,
  transportLoss:.5,utilShare:0,utilPrice:30,storageFee:0,
  policyEligible:100,uncertainty:20};
 g.TEA_CONFIG=Object.assign({},DEFAULTS);
 const R=Object.fromEntries(Object.keys(DEFAULTS).map(k=>[k,[0,100000]]));
 R.discount=[0,99];R.powerPrice=[0,1];
 for(const k of ['transportLoss','utilShare','policyEligible','uncertainty'])R[k]=[0,100];
 function validate(config){
   const cfg={...DEFAULTS,...(config||{})};
   for(const [k,v] of Object.entries(cfg)){
     if(!R[k])throw new Error('Unsupported finance key: '+k);
     if(typeof v!=='number'||!Number.isFinite(v)||v<R[k][0]||v>R[k][1])
       throw new Error(k+': expected finite number in ['+R[k].join(', ')+']');
   }
   return cfg;
 }
 const range=(n,a,b)=>Math.max(a,Math.min(b,n));
 const sum=a=>a.reduce((s,n)=>s+n,0);
 function cashIRR(cfs){
   if(!cfs.some(v=>v<0)||!cfs.some(v=>v>0))return '—';
   const signs=cfs.filter(v=>Math.abs(v)>1e-12).map(Math.sign);
   if(signs.slice(1).filter((s,i)=>s!==signs[i]).length>1)return 'Ambiguous cash flow';
   const npv=r=>cfs.reduce((v,c,i)=>v+c/Math.pow(1+r,i),0);
   // Scan feasible real discount roots. Multiple roots make IRR ambiguous.
   const nodes=[-.999,-.99,-.95,-.9,-.8,-.6,-.4,-.2,-.1,0,.0001,.01,.03,.06,.1,.15,.25,.4,.65,1,1.5,2,3,5,10,100];
   const roots=[];for(let j=1;j<nodes.length;j++){
     let l=nodes[j-1],h=nodes[j],nl=npv(l),nh=npv(h);
     if(!Number.isFinite(nl)||!Number.isFinite(nh))continue;
     if(Math.abs(nl)<1e-7){roots.push(l);continue}
     if(Math.abs(nh)<1e-7){roots.push(h);continue}
     if(nl*nh>0)continue;
     for(let k=0;k<55;k++){const m=(l+h)/2,nm=npv(m);if(nl*nm<=0){h=m;nh=nm}else{l=m;nl=nm}}
     roots.push((l+h)/2);
   }
   const unique=roots.filter((r,i)=>i===0||Math.abs(r-roots[i-1])>.0001);
   return unique.length===1?(unique[0]*100).toFixed(1)+'%':unique.length>1?'Multiple roots':'—';
 }
 function finance(raw, config){
   const cfg=validate(config||g.TEA_CONFIG),p=E.validate(raw).p,
    full=E.calc(p),bv=E.calc(E.bau(p)).net,r=cfg.discount/100;
   const cap={
      Capture:p.ccs?full.cap*cfg.captureCapex:0,
      Transport:p.ccs?full.cap*cfg.transportCapex:0,
      Storage:p.ccs?full.cap*(1-cfg.transportLoss/100)*(1-cfg.utilShare/100)*cfg.storageCapex:0,
      Utilization:p.ccs?full.cap*cfg.utilShare/100*cfg.utilCapex:0,
      'Energy upgrades':p.scale*(p.eff*cfg.efficiencyCapex+p.el*cfg.electrifyCapex+Math.max(0,p.re-E.P0.re)*cfg.renewCapex)
   };
   const capexGross=sum(Object.values(cap));const years=[];let prev=0,cumAvoid=0,cumulativeCash=0,
    discountedCapture=0,discountedAvoided=0,discountedCosts=0,payback=null,wasNegative=false;
   for(let i=0;i<E.YRS.length;i++){
     const year=E.YRS[i],a=E.at(p,year,cfg),z=a.r,u=a.u;
     const lost=z.transportLoss,arrived=z.transported,used=z.utilized,stored=z.injected;
     const avoided=bv-z.net;
     const opex={
       Capture:z.cap*cfg.captureOpex+z.pg*cfg.powerPrice,
       Transport:arrived*cfg.transportOpex,
       Storage:stored*(cfg.storageOpex+cfg.mrvOpex),
       Utilization:used*cfg.utilOpex,
       'Energy upgrades':z.eh*cfg.powerPrice+Math.max(0,z.p.re-E.P0.re)/100*z.el*cfg.renewPremium
     };
     const op=sum(Object.values(opex));
     const policy=Math.max(0,avoided)*p.cp*cfg.policyEligible/100;
     const service=stored*cfg.storageFee,utilRevenue=used*cfg.utilPrice;
     const savings=p.scale*(z.p.eff*cfg.effSavings+z.p.el*cfg.fuelSavings);
     const grossInvest=capexGross*Math.max(0,u-prev),subsidy=grossInvest*p.sub/100;
     const revenue=policy+service+utilRevenue+savings;
     const net=revenue-op-grossInvest+subsidy;
     cumulativeCash+=net;cumAvoid+=avoided;
     if(cumulativeCash<0)wasNegative=true;
     if(wasNegative&&payback===null&&cumulativeCash>=0&&u>0)payback=year;
     discountedCapture+=z.cap/Math.pow(1+r,i);
     discountedAvoided+=avoided/Math.pow(1+r,i);
     discountedCosts+=(op+grossInvest-subsidy-savings)/Math.pow(1+r,i);
     years.push({year,u,captured:z.cap,transportLoss:lost,transported:arrived,utilized:used,stored,
       retained:z.store,storageLoss100y:z.leak,utilizationRelease:z.utilizationRelease,netEmissions:z.net,
       avoided,capex:grossInvest,subsidy,opex:op,opexBoxes:opex,revenue,
       policy,service,utilRevenue,savings,net,cumulativeCash,cf:net});prev=u;
   }
   const npv=sum(years.map((z,i)=>z.net/Math.pow(1+r,i)));
   const end=years[years.length-1];
   return {d:end.avoided,capex:capexGross*(1-p.sub/100),capexGross,
     capexBoxes:cap,subsidyTotal:sum(years.map(y=>y.subsidy)),capexSpent:sum(years.map(y=>y.capex)),
     opex:end.opex,opexBoxes:end.opexBoxes,ann:end.opex-end.savings,
     npv,cum:cumAvoid,irr:cashIRR(years.map(z=>z.net)),
     mac:discountedAvoided>1e-9?discountedCosts/discountedAvoided:null,
     lcoc:discountedCapture>1e-9?discountedCosts/discountedCapture:null,
     payback:payback===null||cumulativeCash<0?'Not reached':String(payback),
     years,cashflows_MUSD:years.map(y=>y.net),
     finance_quality:'Illustrative cash flows. Capture/transport/storage costs, energy-upgrade investments, policy-value eligibility and distributions are user assumptions; missing facility, market and legal evidence. Carbon-price value is hypothetical, not a 45Q entitlement. No financing, tax, inflation, environmental externalities or EOR oil emissions modeled.',
     storageAndUtilization:'One reconciled chain: captured = transport loss + utilization + injection; only injected CO2 receives retention credit. Utilized CO2 is assumed re-released within the horizon.'};
 }
 function sensitivity(p, cfg){
   const main=finance(p,cfg).npv;
   const cases=[['Carbon price',null,'cp'],['Capture CAPEX','captureCapex'],['Transport CAPEX','transportCapex'],['Storage CAPEX','storageCapex'],['Power price','powerPrice'],['Transport OPEX','transportOpex'],['Storage OPEX','storageOpex'],['Capture OPEX','captureOpex'],['Policy eligibility','policyEligible']];
   return cases.map(([name,key,pkey])=>{
      const pct=(cfg.uncertainty??20)/100;
      if(pkey){const base=p[pkey],lo=finance({...p,[pkey]:base*(1-pct)},cfg).npv,hi=finance({...p,[pkey]:base*(1+pct)},cfg).npv;return{name,lo,hi};}
      const lo=finance(p,{...cfg,[key]:range(cfg[key]*(1-pct),...R[key])}).npv,hi=finance(p,{...cfg,[key]:range(cfg[key]*(1+pct),...R[key])}).npv;
      return{name,lo,hi};
   }).sort((a,b)=>Math.abs(b.hi-b.lo)-Math.abs(a.hi-a.lo)).slice(0,7).map(x=>({...x,base:main}));
 }
 function monteCarlo(p,cfg,n=500){
    let seed=20261115;const rand=()=>{seed=(seed+0x6D2B79F5)|0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
    const q=(cfg.uncertainty??20)/100;
    // Independently sampled symmetric triangular multipliers; UNCALIBRATED demonstration distributions.
    const mult=()=>1+(rand()+rand()-1)*q;
    const result=[];
    for(let i=0;i<n;i++){
      const pp={...p,cp:Math.max(0,p.cp*mult()),cap:range(p.cap*mult(),0,100)};
      const cc={...cfg,captureCapex:cfg.captureCapex*mult(),transportCapex:cfg.transportCapex*mult(),
        storageCapex:cfg.storageCapex*mult(),captureOpex:cfg.captureOpex*mult(),powerPrice:cfg.powerPrice*mult(),
        policyEligible:range(cfg.policyEligible*mult(),0,100)};
      for(const key of Object.keys(cc))cc[key]=range(cc[key],...R[key]);
      result.push(finance(pp,cc).npv);
    }
    result.sort((a,b)=>a-b);
    const pct=q=>result[Math.max(0,Math.min(n-1,Math.floor((n-1)*q)))];
    return {values:result,n,mean:sum(result)/n,p05:pct(.05),median:pct(.5),p95:pct(.95),
      positive:result.filter(v=>v>0).length/n,uncertainty:cfg.uncertainty};
 }
 g.FinancialEngine={DEFAULTS,R,validate,cashIRR,finance,sensitivity,monteCarlo};
})(typeof window!=='undefined'?window:globalThis);

// Expose the exact same engine object to the Node API and the browser.
if (typeof module !== 'undefined') module.exports = globalThis.FinancialEngine;
