'use strict';
// Local artifacts only. This module has no wallet, network or payment code.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const R=require('./research.cjs');
const SURVEY_ID='fafab667-80e8-4f1d-8a48-5715a1103485';
const directory=path.resolve(__dirname,'../../data/flashpoint-seed');
const latestFile=path.resolve(__dirname,'../../data/flashpoint/latest-study.json');
const fail=(message,status=422)=>{throw new R.ResearchError(message,status)};
const read=name=>JSON.parse(fs.readFileSync(path.join(directory,name),'utf8'));
const hash=request=>crypto.createHash('sha256').update(JSON.stringify({tool:request.tool,arguments:request.arguments})).digest('hex');
function linkage(scenarioId){
 const survey=read('survey-workflow.json'),savedBrief=read('scenario-brief.json'),workflow=fs.existsSync(latestFile)?JSON.parse(fs.readFileSync(latestFile,'utf8')).workflow:read('synthetic-panel-workflow.json');
 if(survey.surveyId!==SURVEY_ID||workflow.surveyId!==SURVEY_ID||survey.scenarioId!==savedBrief.scenarioId||R.brief(savedBrief.inputs).scenarioId!==savedBrief.scenarioId)fail('Saved survey/scenario linkage is inconsistent. No results were attached.',409);
 return {surveyId:SURVEY_ID,scenarioId:savedBrief.scenarioId,matches:scenarioId===savedBrief.scenarioId,calibrationVersion:workflow.calibrationVersion||workflow.analyticsScope?.calibration_version||null,
  surveyTitle:survey.surveyTitle,conversationId:survey.conversationId,panelId:workflow.panelId,runId:workflow.runId};
}
function requireLink(scenarioId){const link=linkage(scenarioId);if(!link.matches)fail('This scenario does not match the existing survey. Restore Combined with default finance and year 2050, then generate the brief again. The study was not relinked.',409);return link;}
function proposal(body){
 const brief=R.brief(body),link=requireLink(brief.scenarioId);
 const previous=read('synthetic-panel-request.json');
 if(previous.tool!=='panel'||previous.arguments?.action!=='create_and_run'||previous.arguments?.survey_id!==SURVEY_ID||previous.scenarioId!==brief.scenarioId)fail('Saved panel request does not match this study');
 const request={tool:'panel',arguments:{...previous.arguments,num_respondents:12,context:previous.arguments.context+'\n\nUse a fresh run distinct from the earlier empty-answer run. Return the exact survey_id, panel_id and run_id. Include stored question-level answers when available; report missing answers explicitly. Do not fabricate or copy answers from the earlier run.'},
  scenarioId:brief.scenarioId,approvalId:'synthetic-panel-ui-repair-20261121-1',approvalStatus:'not approved',maximumUsdc:'0.60',businessCalls:1,paidRetries:0,
  sourceSurveyConversationId:link.conversationId};
 request.requestHash=hash(request);
 return {request,pricing:{currency:'USDC',network:'Base',panel:'0.60',optionalAnalysis:'0.50',maximumIfBothSeparatelyApproved:'1.10',
  basis:'Official documented defaults checked 2026-11-21; verify unsigned x402 terms before signing. This is not a live payment quote.',source:'https://docs.flashpoint.ai/api-reference'},
  automaticImport:'After an approved call returns, scripts/import-flashpoint-results.cjs reads its saved result files, validates the exact scope, and imports them. Refresh Saved Results reads local artifacts only.',
  analysisResponseFormat:{scope:{survey_id:SURVEY_ID,panel_id:'<actual returned analytics panel_id>',run_id:'<actual returned run_id>',scope_warning:null},
   analytics_summary:{total_responses:12,fielding_date:'<actual date>'},questionnaire:'Actual Q1–Q7 mappings: {text,type,options:{code:label}}. Q1–Q5/Q7 use select/single; Q6 is open text.',
   responses:'12 actual rows: {response_id,status:"COMPLETE",run_id,data:{Q1:code,Q2:code,Q3:code,Q4:code,Q5:code,Q6:actualText,Q7:code}}. Missing data must remain missing.',limitations:[]},
  warning:'An earlier 12-person run returned empty answer payloads. A new paid run is not guaranteed to repair that external defect. No payment or additional analysis is approved.'};
}
function reportFromEnvelope(envelope){
 if(envelope?.result?.isError)fail('Saved Flashpoint response contains an error');
 let task=envelope?.result?.structuredContent;
 if(!task){try{task=JSON.parse(envelope?.result?.content?.find(c=>c.type==='text')?.text);}catch{fail('Missing Flashpoint analysis task');}}
 if(task?.status!=='completed'||task.error)fail('Flashpoint analysis task has not completed');
 const content=task.result?.final_text;
 if(typeof content!=='string')fail('Missing Flashpoint analysis text');
 for(const candidate of [content,content.replace(/\\n/g,'\n')]){
  const match=candidate.match(/```json\s*([\s\S]*?)```/);
  if(match){try{return JSON.parse(match[1]);}catch{}}
 }
 fail('Flashpoint must return valid fenced report JSON; no answers were guessed');
}
function fromReport(report,scope){
 if(report?.scope?.survey_id!==SURVEY_ID||report.scope.panel_id!==scope.panelId||report.scope.run_id!==scope.runId||report.scope.scope_warning||(scope.calibrationVersion&&report.scope.calibration_version!==scope.calibrationVersion))fail('Flashpoint survey/panel/run scope mismatch or warning. Existing results were preserved.',409);
 const base={researchId:SURVEY_ID,scenarioId:scope.scenarioId,source:'flashpoint',panelType:'synthetic',surveyId:SURVEY_ID,surveyTitle:scope.surveyTitle,
  conversationId:scope.conversationId,panelId:scope.panelId,runId:scope.runId,researchDate:report.analytics_summary?.fielding_date||null,
  questionResults:[],keyFindings:[],stakeholderSegments:[],openEndedAnswers:[]};
 const total=report.analytics_summary?.total_responses;
 if(!Number.isInteger(total)||total!==12)fail('Expected exactly 12 response records for this synthetic study');
 if(report.BLOCKER_answer_data_unavailable?.status==='BLOCKED'){
  if(!Array.isArray(report.persona_roster)||report.persona_roster.length!==total||report.persona_roster.some(r=>r.run_id!==scope.runId||r.status!=='COMPLETE'||r.answers!=='NOT STORED'))fail('Missing-answer evidence does not match the scoped run');
  return {...base,status:'failed',respondentCount:total,usableAnswerCount:0,collectionStatus:'completed',analysisStatus:'blocked',limitations:[
   'The saved Flashpoint analysis reports 12 COMPLETE records with empty answer payloads. No rating, preference, or role comparison can be inferred.',
   'Refreshing reads saved local artifacts only; it does not query Flashpoint or repair missing external data.',...report.limitations||[]]};
 }
 // Explicit interchange format requested from the approved analysis step.
 // Unknown worker shapes are rejected rather than mapped by guesswork.
 const rows=report.responses,questions=report.questionnaire;
 if(!Array.isArray(rows)||rows.length!==total||!questions||typeof questions!=='object')fail('Expected questionnaire and 12 actual responses; no completed results were imported');
 const ids=['Q1','Q2','Q3','Q4','Q5','Q6','Q7'],seen=new Set();
 for(const id of ids){const q=questions[id];if(typeof q?.text!=='string'||(id!=='Q6'&&(q.type!=='select/single'||!q.options||typeof q.options!=='object'||Array.isArray(q.options)||!Object.keys(q.options).length)))fail('Missing or unsupported question mapping for '+id);}
 const usable=[];
 for(const row of rows){
  if(typeof row.response_id!=='string'||seen.has(row.response_id)||row.run_id!==scope.runId||row.status!=='COMPLETE')fail('Duplicate, incomplete, or incorrectly scoped response row');
  seen.add(row.response_id);
  const data=row.data;
  if(!data||typeof data!=='object'||Array.isArray(data)||ids.some(id=>data[id]==null||data[id]===''))continue;
  if(Object.keys(data).some(id=>!ids.includes(id)))fail('Response contains unknown question labels');
  for(const id of ids.filter(id=>id!=='Q6'))if(!['string','number'].includes(typeof data[id])||!Object.hasOwn(questions[id].options,String(data[id])))fail('Unknown answer-option code for '+id);
  if(typeof data.Q6!=='string')fail('Q6 requires the actual open-ended answer text');
  usable.push(row);
 }
 if(!usable.length)fail('No usable answer sets were returned. Existing blocked results were preserved.');
 const distributions=group=>ids.filter(id=>id!=='Q6').map(id=>({id,title:questions[id].text,kind:id==='Q2'?'priority':id==='Q3'?'attractiveness':'other',answeredCount:group.length,
  choices:Object.entries(questions[id].options).map(([code,label])=>({label,count:group.filter(row=>String(row.data[id])===code).length}))}));
 return {...base,status:'completed',respondentCount:total,usableAnswerCount:usable.length,collectionStatus:'completed',analysisStatus:'completed',
  questionResults:distributions(usable),openEndedAnswers:usable.map(row=>({questionId:'Q6',respondentId:row.response_id,answer:row.data.Q6})),
  stakeholderSegments:Object.entries(questions.Q1.options).map(([code,label])=>{const group=usable.filter(row=>String(row.data.Q1)===code);return {label,respondentCount:group.length,questionResults:group.length?distributions(group):[]};}),
  limitations:['Counts are calculated from actual returned answer-option codes, not occupations or invented responses.',
   `${usable.length} of ${total} response records have usable answers to all seven questions. Partial or empty sets are excluded from distributions.`,...report.limitations||[]]};
}
function sync(scenarioId,store=R.createStore()){
 const link=requireLink(scenarioId),envelope=fs.existsSync(latestFile)?JSON.parse(fs.readFileSync(latestFile,'utf8')).analysis:read('synthetic-analysis-response.json');
 if(envelope.scenarioId!==scenarioId)fail('Saved response belongs to another scenario',409);
 const result=store.import(fromReport(reportFromEnvelope(envelope),link),{provenance:'saved-flashpoint-response'});
 return {result,surveyId:SURVEY_ID,paidCalls:0,source:'saved-local-flashpoint-response',message:result.analysisStatus==='blocked'?
  'Saved Flashpoint response imported: 12 COMPLETE records, 0 usable answer sets. Analysis remains blocked. No live or paid call was made.':
  `Actual saved Flashpoint results imported: ${result.usableAnswerCount} usable answer sets. Dashboard updated. No live or paid call was made.`};
}
module.exports={SURVEY_ID,linkage,requireLink,proposal,reportFromEnvelope,fromReport,sync};
