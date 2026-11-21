'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
// Execute only the two trusted, existing model scripts, exactly as the browser
// does. No UI/3D code or user-provided JavaScript is evaluated here.
const html=fs.readFileSync(path.join(root,'apps/web/scenario.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].slice(0,2).map(m=>m[1]);
const context=vm.createContext({});
scripts.forEach(code=>vm.runInContext(code,context,{timeout:1000}));
const E=context.CarbonEngine,F=context.FinancialEngine;
if(!E?.calc||!F?.finance)throw Error('Active scenario models not found');
const controls=vm.runInContext('('+html.match(/const TEA_VARS=(\{[\s\S]*?\});/)[1]+')',context);
const modelVersion='original-ccus-'+crypto.createHash('sha256').update(scripts.join('\n')).digest('hex').slice(0,12);
const syntheticLabel='AI-Simulated Respondents — Exploratory Research Only';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
class ResearchError extends Error{constructor(message,status=422){super(message);this.status=status;this.code='INVALID_RESEARCH_DATA';}}
const fail=message=>{throw new ResearchError(message)};
function text(value,label,max=500){if(typeof value!=='string'||!value.trim()||value.length>max)fail(label+' must be nonempty text, maximum '+max+' characters');return value.trim();}
function num(value,label,min,max,integer=false){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))fail(label+' is outside its permitted range');return value;}
const strings=(values,label)=>{if(!Array.isArray(values)||values.length>30)fail(label+' must be an array of up to 30 strings');return values.map(v=>text(v,label,1500));};
const identifier=(v,label)=>{v=text(v,label,100);if(!/^[a-zA-Z0-9_-]+$/.test(v))fail(label+' contains unsupported characters');return v;};
function assertNoSecrets(value){if(/0x[0-9a-fA-F]{64}\b|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|FLASHPOINT_WALLET_KEY|FLASHPOINT_WALLET_JWT/i.test(JSON.stringify(value)))fail('Remove credentials from research data before importing');}

function brief(body){
 if(!object(body)||!object(body.params)||!object(body.finance))fail('params and finance objects are required');
 const p={...E.P0},config={...F.DEFAULTS};
 for(const [k,v]of Object.entries(body.params)){
  if(!Object.hasOwn(p,k))fail('Unsupported physical parameter: '+k);
  if(k==='ccs'){if(typeof v!=='boolean')fail('ccs must be boolean');p[k]=v;}
  else{const range=k==='re'?[0,100]:E.R[k];if(!range)fail('Missing bounds: '+k);p[k]=num(v,k,range[0],range[1],['yr','dur'].includes(k));}
 }
 if(p.so+p.wi+p.ot>100+1e-8)fail('Electricity shares exceed 100%');
 if(Object.hasOwn(body.params,'re')&&Math.abs(p.re-p.so-p.wi-p.ot)>1e-7)fail('re must equal the sum of low-carbon shares');
 p.re=p.so+p.wi+p.ot;
 for(const [k,v]of Object.entries(body.finance)){
  if(!Object.hasOwn(config,k))fail('Unsupported financial parameter: '+k);
  if(controls[k])config[k]=num(v,k,controls[k][1],controls[k][2]);
  else if(v!==config[k])fail('Fixed original-model coefficient cannot be changed: '+k);
 }
 const year=num(body.year,'year',2025,2050,true),name=text(body.scenarioName||'Current Carbon Twin scenario','scenarioName',120);
 const a=E.at(p,year),r=a.r,baseline=E.calc(E.bau(p)),fx=F.finance(p,config),annual=fx.years.find(row=>row.year===year);
 const scenarioId=crypto.createHash('sha256').update(JSON.stringify([modelVersion,year,p,config])).digest('hex').slice(0,24);
 const limitations=[
  'All engineering inputs and financial coefficients are illustrative assumptions, not measured facility data or validated investment forecasts.',
  'Gross injection is not proof of permanent storage. The original physical retention proxy and financial routing are separate simplified boundaries; permanent storage after transport and utilization is not established.',
  'Utilized CO2 is not permanent sequestration. The original avoided-emissions ledger has a utilization limitation; this integration preserves rather than changes that model.',
  'Carbon-price and subsidy values are hypothetical assumptions, not guaranteed revenue or proof of tax-credit eligibility.',
  fx.finance_quality,
  'Synthetic stakeholder opinions are exploratory AI output, not evidence of actual market demand or representative industry preferences.'
 ];
 const result={schemaVersion:'1',scenarioId,scenarioName:name,modelVersion,year,quality:'illustrative',
  inputs:{params:p,finance:config,year},
  units:{carbon:'Mt CO2/year',money:'million constant 2025 USD',rate:'percent'},
  scenario:{facilityType:'Illustrative BF-BOF steel plant',steelOutputMtPerYear:2,
   deploymentFraction:a.u,baselineNetMt:baseline.net,captureRatePct:p.cap,ccsEnabled:p.ccs,
   capturedMt:r.cap,grossInjectedMt:annual.stored,utilizedMt:annual.utilized,transportLossMt:annual.transportLoss,
   physicalRetainedProxyMt:r.store,permanentStoredMt:null,residualOperationalMt:r.op,
   horizonAdjustedNetMt:r.net,physicalAvoidedMt:baseline.net-r.net,financeAvoidedMt:annual.avoided,
   selectedMeasures:{efficiencyPct:p.eff,electrificationPct:p.el,lowCarbonPowerPct:p.re,ccs:p.ccs}},
  finance:{grossCapexMUsd:fx.capexGross,netDesignCapexMUsd:fx.capex,selectedYearOpexMUsd:annual.opex,
   npvMUsd:fx.npv,irr:fx.irr==='—'?null:fx.irr,paybackYear:/^\d{4}$/.test(fx.payback)?Number(fx.payback):null,
   carbonPriceUsdPerTonne:p.cp,discountRatePct:config.discount,uncertaintyRangePct:config.uncertainty},
  limitations,
  researchObjective:'Explore hypothetical stakeholder reactions to this illustrative decarbonization investment scenario and the usefulness of the Carbon Twin interface.',
  surveyQuestions:[
   'Which perspective best describes you? Industrial operations; sustainability/ESG; finance/investment; engineering; research/academia; policy/regulation; other.',
   'Which factor matters most? Emissions reduction; initial CAPEX; OPEX; financial returns; regulatory compliance; technology maturity.',
   'How attractive is this scenario under its stated assumptions? Rate 1 (not attractive) to 5 (very attractive), or not enough information.',
   'What is your biggest concern about this strategy? Select one: cost; financial uncertainty; technology performance; storage durability; policy uncertainty; other.',
   'Would scenario-based financial projections increase your decision confidence? Rate 1 (not at all) to 5 (very much), or not enough information.',
   'Which additional information would you need before recommending an investment? Open-ended.',
   'How useful is this interactive Carbon Twin for exploring decarbonization options? Rate 1 (not useful) to 5 (very useful), or unable to assess.'
  ]};
 result.flashpointArguments={brief:[
  'Prepare a DRAFT survey titled Industrial Decarbonization Investment Decision Study. Return all proposed questions for review. If your workflow requires plan approval, return the plan and stop.',
  'Do not publish, send emails, recruit participants, launch a panel, or perform any additional paid actions. Do not treat this request as confirmation of any prior action.',
  'Use these calculated illustrative scenario figures as context. Do not invent missing values or describe utilization as permanent storage.',
  JSON.stringify({scenarioId,scenarioName:name,year,units:result.units,scenario:result.scenario,finance:result.finance,limitations}),
  'Use these seven questions, in plain language:',...result.surveyQuestions,
  'Intended later study: a small synthetic panel, explicitly labeled '+syntheticLabel+'. No real participants are being recruited by this request.'
 ].join('\n\n')};
 return JSON.parse(JSON.stringify(result));
}

function questions(values,total){
 if(!Array.isArray(values)||values.length>20)fail('questionResults must be an array of up to 20 questions');
 const ids=new Set();
 return values.map(q=>{
  if(!object(q))fail('Each question result must be an object');
  const id=identifier(q.id,'question id');if(ids.has(id))fail('Duplicate question id');ids.add(id);
  const answeredCount=num(q.answeredCount,'answeredCount',0,total,true);
  if(!Array.isArray(q.choices)||q.choices.length<1||q.choices.length>30)fail('Each distribution requires 1–30 choices');
  const choices=q.choices.map(c=>{if(!object(c))fail('Each choice must be an object');return {label:text(c.label,'choice label',200),count:num(c.count,'choice count',0,answeredCount,true)};});
  const multipleChoice=q.multipleChoice===true;
  if(!multipleChoice&&choices.reduce((sum,c)=>sum+c.count,0)!==answeredCount)fail('Single-choice counts must sum to answeredCount');
  return {id,title:text(q.title,'question title',500),kind:['priority','attractiveness','other'].includes(q.kind)?q.kind:'other',answeredCount,multipleChoice,choices};
 });
}
function normalize(raw){
 if(!object(raw))fail('Research import must be a JSON object');assertNoSecrets(raw);
 // Accept a normalized object or an explicit JSON file wrapped in MCP content.
 // Unknown vendor response shapes are rejected, never guessed into findings.
 if(Array.isArray(raw.content)){
  try{raw=JSON.parse(raw.content.find(c=>c.type==='text')?.text);}catch{fail('MCP text must contain normalized research JSON');}
 }
 if(object(raw)&&(raw.tool||raw.arguments||raw.flashpointArguments||raw.paymentApproval||raw.surveyQuestions))fail('This is a survey or panel request, not completed study results. Import completed study results with actual respondent answers; do not paste a request JSON here.');
 if(!object(raw)||raw.source!=='flashpoint')fail('Expected normalized research JSON with source="flashpoint"');
 const researchId=identifier(raw.researchId,'researchId'),scenarioId=identifier(raw.scenarioId,'scenarioId');
 if(!['synthetic','real'].includes(raw.panelType))fail('panelType must be synthetic or real');
 if(!['pending','running','completed','failed'].includes(raw.status))fail('Unsupported research status');
 const respondentCount=num(raw.respondentCount,'respondentCount',0,1000000,true);
 const questionResults=questions(raw.questionResults||[],respondentCount),keyFindings=strings(raw.keyFindings||[],'keyFindings');
 if(raw.status==='completed'&&(!respondentCount||(!questionResults.length&&!keyFindings.length)))fail('Completed research requires a positive respondent count and actual results');
 if(raw.status==='completed'&&(raw.analysisStatus==='blocked'||raw.usableAnswerCount===0))fail('Missing answer data cannot be marked as completed research');
 const limitations=strings(raw.limitations||[],'limitations');
 const syntheticLimitation=syntheticLabel+'; not real people or statistically representative industry evidence.';
 if(raw.panelType==='synthetic'&&!limitations.includes(syntheticLimitation))limitations.unshift(syntheticLimitation);
 if(!Array.isArray(raw.stakeholderSegments||[])||(raw.stakeholderSegments||[]).length>20)fail('stakeholderSegments must contain at most 20 groups');
 const stakeholderSegments=(raw.stakeholderSegments||[]).map(s=>{if(!object(s))fail('Each segment must be an object');return {label:text(s.label,'segment label',120),
  respondentCount:num(s.respondentCount,'segment respondentCount',0,respondentCount,true),
  questionResults:questions(s.questionResults||[],s.respondentCount)};});
 if(stakeholderSegments.reduce((n,s)=>n+s.respondentCount,0)>respondentCount)fail('Role segments must not overlap or exceed the overall respondent count');
 let researchDate=null;
 if(raw.researchDate!=null){researchDate=text(raw.researchDate,'researchDate',40);if(!Number.isFinite(Date.parse(researchDate)))fail('Invalid researchDate');}
 const openEndedAnswers=raw.openEndedAnswers||[];
 if(!Array.isArray(openEndedAnswers)||openEndedAnswers.length>1000)fail('openEndedAnswers must contain at most 1000 answers');
 return {schemaVersion:'1',researchId,scenarioId,source:'flashpoint',sourceVerification:'user-imported; not independently verified',
  panelType:raw.panelType,surveyTitle:text(raw.surveyTitle,'surveyTitle',200),respondentCount,status:raw.status,
  surveyId:raw.surveyId?identifier(raw.surveyId,'surveyId'):null,conversationId:raw.conversationId?identifier(raw.conversationId,'conversationId'):null,
  researchDate,collectionStatus:['not_started','running','completed'].includes(raw.collectionStatus)?raw.collectionStatus:null,
  analysisStatus:['pending','completed','blocked'].includes(raw.analysisStatus)?raw.analysisStatus:null,
  usableAnswerCount:raw.usableAnswerCount==null?null:num(raw.usableAnswerCount,'usableAnswerCount',0,respondentCount,true),
  panelId:raw.panelId?identifier(raw.panelId,'panelId'):null,runId:raw.runId?identifier(raw.runId,'runId'):null,
  questionResults,stakeholderSegments,keyFindings,openEndedAnswers:openEndedAnswers.map(a=>{
   if(!object(a))fail('Each open-ended answer must be an object');
   return {questionId:identifier(a.questionId,'questionId'),respondentId:identifier(a.respondentId,'respondentId'),answer:text(a.answer,'open-ended answer',4000)};
  }),limitations,importedAt:new Date().toISOString()};
}
function completedImport(raw){
 const result=normalize(raw);
 if(result.status!=='completed')fail('The Research JSON field requires completed study results with actual answers. Pending requests and blocked workflow records are loaded by Refresh Saved Results instead.');
 if(!result.questionResults.some(q=>q.answeredCount>0)&&!result.openEndedAnswers.length)fail('Completed study results must contain actual answer distributions or open-ended answers; a completion label or summary alone is not enough.');
 return result;
}
function createStore(directory=process.env.CARBON_TWIN_RESEARCH_DIR||path.join(root,'data/research')){
 return {
  import(raw,options={}){const result=normalize(raw);if(options.provenance==='saved-flashpoint-response')result.sourceVerification='backend-imported from saved Flashpoint response; not independently verified';fs.mkdirSync(directory,{recursive:true});const file=path.join(directory,result.researchId+'.json');
   if(fs.existsSync(file)){const existing=JSON.parse(fs.readFileSync(file,'utf8'));if(existing.scenarioId!==result.scenarioId)fail('Research ID already belongs to another scenario');}
   const temporary=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(temporary,JSON.stringify(result,null,2),{mode:0o600});fs.renameSync(temporary,file);return result;},
  list(scenarioId){if(scenarioId)identifier(scenarioId,'scenarioId');if(!fs.existsSync(directory))return [];
   return fs.readdirSync(directory).filter(name=>/^[a-zA-Z0-9_-]+\.json$/.test(name)).map(name=>JSON.parse(fs.readFileSync(path.join(directory,name),'utf8')))
    .filter(r=>!scenarioId||r.scenarioId===scenarioId).sort((a,b)=>b.importedAt.localeCompare(a.importedAt));}
 };
}
module.exports={brief,normalize,completedImport,createStore,ResearchError,syntheticLabel,modelVersion,defaults:{params:{...E.P0},finance:{...F.DEFAULTS}}};
