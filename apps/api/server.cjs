'use strict';
/**
 * One dependency-free Node API and static host. The unchanged domain source is
 * loaded by Node here and by the browser from /shared/*.js — NO copied formulas.
 * Intended as a demo-grade modular-monolith foundation, not a public hardened API.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const root = path.resolve(__dirname, '../..');
const webRoot = path.join(root, 'apps/web');
const sharedRoot = path.join(root, 'packages/domain/src');
const dataRoot = path.join(root, 'data/fixtures');
const E = require(path.join(sharedRoot, 'carbonEngine.js'));
const F = require(path.join(sharedRoot, 'financialEngine.js'));
const CTV = require(path.join(sharedRoot, 'ctvEngine.js'));
const LLM = require('./llm-reports.cjs');
const Research = require('./research.cjs');
const FlashpointStudy = require('./flashpoint-study.cjs');
const researchStore = Research.createStore();
const PORT = Number(process.env.PORT || 3000);
const VERSION = 'illustrative-v0.3-chain-1';
const SCHEMA = '1';
const quality = 'illustrative';
const defaults = Object.freeze({...E.P0});

class RequestError extends Error {
  constructor(message, code='INVALID_INPUT', status=422){super(message);this.code=code;this.status=status;}
}
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
function number(v,k,min,max){
 if(!finite(v)||v<min||v>max)throw new RequestError(`${k}: expected finite number in [${min}, ${max}]`);
 return v;
}
function inputParams(p){
 if(!isObj(p))throw new RequestError('scenario.legacyParams must be an object');
 const q={...defaults};
 for(const [k,v] of Object.entries(p)){
  if(!own(defaults,k)&&k!=='re')throw new RequestError(`Unsupported parameter: ${k}`);
  if(k==='ccs'){
   if(typeof v!=='boolean')throw new RequestError('ccs must be a boolean');
   q[k]=v;
  }else{
   const bounds=k==='re'?[0,100]:E.R[k];
   if(!bounds)throw new RequestError(`Missing bounds for ${k}`);
   q[k]=number(v,k,...bounds);
   if(['yr','dur'].includes(k)&&!Number.isInteger(v))throw new RequestError(k+' must be an integer');
  }
 }
 const shares=q.so+q.wi+q.ot;
 if(shares>100+1e-9)throw new RequestError('Electricity shares must sum to at most 100%');
 // The shares are canonical. Accept the old derived 're' field from the HTML UI.
 if(own(p,'re')&&Math.abs(shares-q.re)>1e-5)
   throw new RequestError('re must equal so + wi + ot; shares are source of truth');
 q.re=shares;
 return q;
}
function financeParams(values){
 try { return F.validate(values); } catch(e) { throw new RequestError(e.message); }
}

function run(body){
 if(!isObj(body)||!isObj(body.scenario))throw new RequestError('scenario object is required');
 if(body.schemaVersion!==SCHEMA)throw new RequestError(`schemaVersion must be ${SCHEMA}`,'UNSUPPORTED_SCHEMA',400);
 const raw=body.scenario.legacyParams||{};
 const params=inputParams(raw);
 const year=own(body.scenario,'year')?number(body.scenario.year,'year',2025,2050):2050;
 if(!Number.isInteger(year))throw new RequestError('year must be an integer');
 const config=financeParams(body.finance);
 const at=E.at(params,year,config), r=at.r, base=E.calc(E.bau(params)), fx=F.finance(params,config);
 const balance=E.checks(r);
 const equipmentFlows={
  sinter:{scope1GrossMt:r.s1.sinter,energyGWh:r.fuel.sinter},
  bf:{scope1GrossMt:r.s1.bf,energyGWh:r.fuel.bf},
  stoves:{scope1GrossMt:r.s1.stoves,energyGWh:r.fuel.stoves},
  mill:{scope1GrossMt:r.s1.mill,energyGWh:r.fuel.mill},
  stack:{scope1ReleasedMt:r.res},util:{scope2ProxyMt:r.s2,electricityGWh:r.el},
  ccs:{capturedMt:r.cap,captureElectricityGWh:r.pg},
  comp:{capturedMt:r.cap},pipe:{transportedMt:r.transported},
  stor:{retainedMt:r.store}
 };
 const annualSeries=E.YRS.map(y=>{
  const item=E.at(params,y,config),r=item.r;
  return {year:y,deployedFraction:item.u,netMt:r.net,operationalMt:r.op,
    scope1ReleasedMt:r.res,scope2ProxyMt:r.s2,capturedMt:r.cap,
    horizonAdjustedStorageLossMt:r.leak,transportLossMt:r.transportLoss,
    utilizationReleaseMt:r.utilizationRelease,injectedMt:r.injected,retainedMt:r.store,avoidedMt:base.net-r.net};
 });
 const response={
  schemaVersion:SCHEMA,modelVersion:VERSION,quality,
  boundary:'Generic illustrative BF-BOF plant, not a measured or site-calibrated facility',
  source:'shared deterministic CarbonEngine + FinancialEngine',
  units:{emissions:'Mt CO2e/year',electricity:'GWh/year',money:'million 2025 USD',carbonPrice:'USD/t'},
  year,deployedFraction:at.u,validatedInputs:params,financeInputs:config,
  context:isObj(body.context)?{siteId:String(body.context.siteId||'generic').slice(0,32)}:{siteId:'generic'},
  metrics:{
   netMt:r.net,operationalMt:r.op,scope1GrossMt:r.t1,scope1ReleasedMt:r.res,
   scope2ProxyMt:r.s2,capturedMt:r.cap,storedRetainedMt:r.store,
   storageLoss100yAdjustedMt:r.leak,avoidedVsBauMt:base.net-r.net,
   transportLossMt:r.transportLoss,utilizationReleaseMt:r.utilizationRelease,injectedMt:r.injected,
   intensityTonPerTon:r.net/(E.K.steel*params.scale),steelOutputMt:E.K.steel*params.scale,baselineNetMt:base.net,
   captureEnergyGWh:r.pg,captureEnergyEmissionsMt:r.pen,
   npvMUsd:fx.npv,grossCapexMUsd:fx.capexGross,opex2050MUsd:fx.opex,
   irr:fx.irr,paybackYear:fx.payback
  },
  equipmentFlows,physical:r,annualSeries,
  finance:{npvMUsd:fx.npv,grossCapexMUsd:fx.capexGross,
    netCapexMUsd:fx.capex,capexSpentMUsd:fx.capexSpent,subsidyPaidMUsd:fx.subsidyTotal,opexMUsdPerYear:fx.opex,irr:fx.irr,
    paybackYear:fx.payback,lcocUsdPerTon:fx.lcoc,
    avoidedCostUsdPerTon:fx.mac,capexBoxes:fx.capexBoxes,opexBoxes:fx.opexBoxes,
    years:fx.years},
  checks:balance,
  warnings:[
   'All numerical defaults are illustrative, not facility measurements.',
   'Scope 2 represents a physical generation-mix scenario, not a formal location/market based inventory.',
   '100-year storage retention is a horizon-adjusted cohort assumption, not an annual measured leakage rate.',
   'Capture streams are assumed entirely CO2; species-specific CH4/N2O accounting is not implemented.',
   'Utilized CO2 is assumed re-released within the horizon; it receives no permanent-storage credit.',
   'Policy monetization is hypothetical and not proof of legal tax-credit eligibility.',
   'Offshore geology and 3D infrastructure are conceptual scenery, not reservoir simulation.'
  ]
 };
 response.inputHash=crypto.createHash('sha256').update(JSON.stringify([year,params,config])).digest('hex').slice(0,16);
 return response;
}
function respond(res,status,payload){
 const output=JSON.stringify(payload);
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(output);
}
function readBody(req){return new Promise((resolve,reject)=>{
 let body='',size=0;
 req.on('data',chunk=>{size+=chunk.length;if(size>100000){reject(new RequestError('Request exceeds 100KB','TOO_LARGE',413));req.destroy();return;}body+=chunk.toString('utf8');});
 req.on('end',()=>{try{resolve(JSON.parse(body||'{}'));}catch{reject(new RequestError('Malformed JSON','BAD_JSON',400))}});
 req.on('error',reject);
});}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
function serveFile(req,res,pathname){
 let file;
 if(pathname.startsWith('/shared/'))file=path.join(sharedRoot,pathname.slice('/shared/'.length));
 else if(pathname==='/')file=path.join(webRoot,'index.html');
 else file=path.join(webRoot,pathname.replace(/^\/+/,''));
 const based=pathname.startsWith('/shared/')?sharedRoot:webRoot;
 if(!(file===based||file.startsWith(based+path.sep))||!fs.existsSync(file)||!fs.statSync(file).isFile()){
  respond(res,404,{error:{code:'NOT_FOUND',message:'Asset not found'}});return;
 }
 res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream',
 'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
 if(req.method==='HEAD'){res.end();return;}
 fs.createReadStream(file).pipe(res);
}
function getReady(){return JSON.parse(fs.readFileSync(path.join(dataRoot,'readiness-states.json'),'utf8'));}
const app=http.createServer(async(req,res)=>{
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}
 catch{return respond(res,400,{error:{code:'BAD_URL',message:'Invalid path'}})}
 try{
  if(pathname.startsWith('/api/')){
   if(pathname.startsWith('/api/v1/research/')){
    const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
    let sameOrigin=true;try{if(req.headers.origin)sameOrigin=new URL(req.headers.origin).host===req.headers.host;}catch{sameOrigin=false;}
    if(!local||!sameOrigin)throw new RequestError('Research operations are local and same-origin only','FORBIDDEN',403);
    try{
     if(req.method==='POST'&&pathname==='/api/v1/research/brief')return respond(res,200,Research.brief(await readBody(req)));
     if(req.method==='POST'&&pathname==='/api/v1/research/results'){
      const result=Research.completedImport(await readBody(req));
      if(result.surveyId===FlashpointStudy.SURVEY_ID||result.researchId===FlashpointStudy.SURVEY_ID)FlashpointStudy.requireLink(result.scenarioId);
      return respond(res,200,researchStore.import(result));
     }
     if(req.method==='GET'&&pathname==='/api/v1/research/results')return respond(res,200,{results:researchStore.list(new URL(req.url,'http://localhost').searchParams.get('scenarioId'))});
     if(req.method==='GET'&&pathname==='/api/v1/research/study')return respond(res,200,FlashpointStudy.linkage(new URL(req.url,'http://localhost').searchParams.get('scenarioId')));
     if(req.method==='POST'&&pathname==='/api/v1/research/prepare-panel')return respond(res,200,FlashpointStudy.proposal(await readBody(req)));
     if(req.method==='POST'&&pathname==='/api/v1/research/sync')return respond(res,200,FlashpointStudy.sync((await readBody(req)).scenarioId,researchStore));
    }catch(error){if(error instanceof Research.ResearchError)throw new RequestError(error.message,error.code,error.status);throw error;}
   }
   if(pathname.startsWith('/api/v1/ctv/')){
    const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
    if(!local||(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host))throw new RequestError('LLM reports are local-only','FORBIDDEN',403);
    try{
     if(req.method==='GET'&&pathname==='/api/v1/ctv/config')return respond(res,200,LLM.config());
     if(req.method==='POST'&&pathname==='/api/v1/ctv/calculate'){const body=await readBody(req);return respond(res,200,CTV.calc(body.inputs));}
     if(req.method==='POST'&&pathname==='/api/v1/ctv/jobs'){const body=await readBody(req);return respond(res,200,LLM.create(body.inputs,body.band));}
     const match=pathname.match(/^\/api\/v1\/ctv\/jobs\/([a-f0-9]{24})$/);
     if(match&&req.method==='GET')return respond(res,200,LLM.summary(LLM.get(match[1])));
     if(match&&req.method==='POST')return respond(res,200,LLM.control(match[1],(await readBody(req)).action));
    }catch(e){if(e instanceof RequestError)throw e;throw new RequestError(e.message);}
   }
   if(req.method==='GET'&&pathname==='/api/v1/health')return respond(res,200,{status:'ok',modelVersion:VERSION,apiVersion:'1'});
   if(req.method==='GET'&&pathname==='/api/v1/model/config')return respond(res,200,{
    schemaVersion:SCHEMA,modelVersion:VERSION,quality,
    defaults,financeDefaults:F.DEFAULTS,parameterBounds:E.R,financeBounds:F.R,
    scienceDisclaimer:'Illustrative models are not verified inventories or investments.'
   });
   if(req.method==='GET'&&pathname==='/api/v1/readiness/states')return respond(res,200,getReady());
   if(req.method==='GET'&&/^\/api\/v1\/readiness\/states\/[A-Z]{2}$/.test(pathname)){
    const code=pathname.slice(-2),data=getReady(),state=data.states.find(s=>s.code===code);
    if(!state)return respond(res,404,{error:{code:'NOT_FOUND',message:'State not in workbook'}});
    return respond(res,200,{...state,datasetVersion:data.datasetVersion,quality:data.quality});
   }
   if(req.method==='POST'&&pathname==='/api/v1/scenarios/run')return respond(res,200,run(await readBody(req)));
   if(req.method==='POST'&&pathname==='/api/v1/scenarios/compare'){
    const body=await readBody(req);
    if(!Array.isArray(body.scenarios)||body.scenarios.length<2||body.scenarios.length>3)
      throw new RequestError('Comparison requires 2 or 3 scenarios');
    return respond(res,200,{schemaVersion:SCHEMA,modelVersion:VERSION,quality,
      scenarios:body.scenarios.map((scenario,i)=>run({...body,schemaVersion:SCHEMA,scenario}).metrics)});
   }
   if(req.method==='POST'&&pathname==='/api/v1/finance/monte-carlo'){
    const body=await readBody(req),params=inputParams(body.scenario?.legacyParams||{}),config=financeParams(body.finance);
    const trials=number(body.trials??500,'trials',50,1000);
    if(!Number.isInteger(trials))throw new RequestError('trials must be an integer');
    const m=F.monteCarlo(params,config,trials);
    return respond(res,200,{modelVersion:VERSION,quality,seed:20261115,assumptions:'Illustrative seeded triangular input distributions',...m});
   }
   return respond(res,404,{error:{code:'NOT_FOUND',message:'Unknown API route'}});
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return respond(res,405,{error:{code:'METHOD_NOT_ALLOWED',message:'Use GET or HEAD for assets'}});
  serveFile(req,res,pathname);
 }catch(e){
  const status=e instanceof RequestError?e.status:500;
  if(status===500)console.error('API error:',e);
  respond(res,status,{error:{code:e.code||'SERVER_ERROR',message:status===500?'Internal server error':e.message}});
 }
});
if(require.main===module){app.listen(PORT,'127.0.0.1',()=>console.log(`Industrial Carbon Twin: http://localhost:${PORT}/`));}
module.exports={app,run,inputParams,financeParams};
