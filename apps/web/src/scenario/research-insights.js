(function(){'use strict';
const panel=document.createElement('section');panel.className='research cd';panel.id='flashpointResearch';
panel.setAttribute('aria-labelledby','researchTitle');
const action=(id,label)=>`<div class="research-action"><button type="button" id="${id}" aria-describedby="${id}Feedback">${label}</button><p id="${id}Feedback" class="research-feedback" role="status" aria-live="polite"></p></div>`;
panel.innerHTML=`<div class="research-heading"><div><p class="research-eyebrow">SCENARIO RESEARCH</p><h2 id="researchTitle">Flashpoint Research Insights</h2></div><span class="research-badge">Local preparation · no paid calls</span></div>
<p>Generate a brief to link these exact simulator inputs to the existing survey. Saved Flashpoint responses load automatically from the backend. Preparing or downloading a request does not run a survey.</p>
<div class="research-actions">${action('researchGenerate','Generate Research Brief')}${action('researchRefresh','Refresh Saved Results')}</div>
<p id="researchStatus" role="status" aria-live="polite">Start with Generate Research Brief. No wallet is needed and this page cannot sign payments.</p>
<p id="researchLink" class="research-link">Scenario linkage has not been checked.</p>
<details id="researchBriefDetails" hidden><summary>Calculated scenario brief and assumptions</summary><pre id="researchBrief"></pre></details>
<div class="research-import"><div><label for="researchStudy">Saved studies for this exact scenario</label><select id="researchStudy" disabled><option value="">Generate a brief first</option></select><p id="researchStudyFeedback" class="research-feedback" role="status" aria-live="polite"></p><div id="researchResults"><p class="research-empty">No completed study is shown yet. Generate a brief to load the actual saved study, including any missing-answer errors.</p></div></div>
<div><details id="researchPlanDetails"><summary>Prepare the next synthetic panel (approval required)</summary><p>Reuse survey <code>fafab667-80e8-4f1d-8a48-5715a1103485</code>. A fresh 12-person run has a documented price of 0.60 USDC; separate analysis, if required, is 0.50 USDC. Zero paid retries. There is no Run or Pay button here.</p>
${action('researchPrepare','Prepare 12-Respondent Request')}${action('researchCopy','Copy Flashpoint Prompt')}${action('researchDownload','Download Panel Request')}<pre id="researchPlan" hidden></pre></details>
<details id="researchImportDetails"><summary>Advanced: import completed study results</summary><p>Normally use Refresh Saved Results; the backend imports saved Flashpoint responses. This field accepts only normalized, completed study results with actual answers or distributions. Survey/panel request JSON and pending or blocked records are not results.</p><label for="researchJSON">Completed Research Results JSON</label><textarea id="researchJSON" rows="9" spellcheck="false" placeholder="Completed study results only — not flashpoint-survey-request.json" aria-describedby="researchImportFeedback researchScenarioId"></textarea>${action('researchImport','Validate and Import')}<p id="researchScenarioId">Generate a brief to see the required scenario ID.</p></details></div></div>`;
document.getElementById('simImpactBox').before(panel);
const $=id=>document.getElementById(id),buttonIds=['researchGenerate','researchRefresh','researchPrepare','researchCopy','researchDownload','researchImport'];
let brief=null,signature=null,studies=[],linkage=null,plan=null,working=false,stale=false;
const snapshot=()=>({scenarioName:'Current Carbon Twin scenario',year:SY,params:{...P},finance:{...window.TEA_CONFIG}});
const currentSignature=()=>JSON.stringify(snapshot());
function status(message,kind='info'){$('researchStatus').textContent=message;$('researchStatus').dataset.kind=kind;}
function feedback(id,message,kind='info'){const target=$(id+'Feedback');target.textContent=message;target.dataset.kind=kind;}
async function act(id,task){
 if(working){status('Another research action is running. Please wait.');return;}
 working=true;buttonIds.forEach(key=>$(key).disabled=true);$(id).setAttribute('aria-busy','true');feedback(id,'Working…');
 try{const message=await task();feedback(id,message,'success');status(message,'success');}
 catch(error){const message=error.name==='AbortError'?'Request timed out. Check that the local server is running, then try again.':error.message;feedback(id,message,'error');status(message,'error');if(id==='researchGenerate'&&!brief){$('researchLink').textContent='Scenario linkage could not be checked.';$('researchResults').replaceChildren(text('p','No current study loaded. '+message,'research-empty'));}}
 finally{working=false;buttonIds.forEach(key=>$(key).disabled=false);$(id).removeAttribute('aria-busy');}
}
function requireBrief(){if(!brief)throw Error('Generate Research Brief first. This action needs the current scenario ID.');if(signature!==currentSignature())throw Error('Scenario changed; generate a new brief before using this action.');}
function requireLinked(){requireBrief();if(!linkage?.matches)throw Error('This scenario does not match the existing survey. Restore Combined, default finance and year 2050, then generate the brief again.');}
async function request(url,body){
 if(location.protocol==='file:')throw Error('Start START_DEMO.cmd (or the local Node server) and open its localhost URL to use research features. Direct HTML mode supports simulation only.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(url,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:controller.signal});
  let result;try{result=await response.json();}catch{throw Error('The local server returned a non-JSON response (HTTP '+response.status+'). Restart the latest demo server.');}
  if(!response.ok)throw Error(result.error?.message||'Research request failed (HTTP '+response.status+').');return result;
 }finally{clearTimeout(timer);}
}
function text(tag,value,className){const element=document.createElement(tag);element.textContent=value;if(className)element.className=className;return element;}
function distribution(question,parent){
 parent.append(text('h4',question.title),text('p',question.answeredCount+' answered'+(question.multipleChoice?' · multiple selections permitted':'')));
 for(const choice of question.choices){const row=document.createElement('div');row.className='research-bar';const track=document.createElement('span'),fill=document.createElement('i');track.className='research-track';
  fill.style.width=(question.answeredCount?100*choice.count/question.answeredCount:0)+'%';track.append(fill);row.append(text('span',choice.label),track,text('span',choice.count+' / '+question.answeredCount));parent.append(row);}
}
function render(result){
 const host=$('researchResults');host.replaceChildren();
 if(!result){host.append(text('p','No study has been imported for these exact inputs. No study from another scenario has been attached.','research-empty'));return;}
 host.append(text('h3',result.surveyTitle));
 if(result.panelType==='synthetic')host.append(text('p','AI-Simulated Respondents — Exploratory Research Only','research-synthetic'));
 const meta=document.createElement('dl');meta.className='research-meta';
 for(const [key,value]of Object.entries({Status:result.status,Respondents:result.respondentCount,'Panel type':result.panelType,Source:result.source,'Research date':result.researchDate||'Not supplied','Survey ID':result.surveyId||'Not supplied','Scenario ID':result.scenarioId}))meta.append(text('dt',key),text('dd',value));
 for(const [key,value]of [['Collection',result.collectionStatus],['Analysis',result.analysisStatus],['Usable answer sets',result.usableAnswerCount],['Panel ID',result.panelId],['Run ID',result.runId]])if(value!=null)meta.append(text('dt',key),text('dd',value));
 host.append(meta,text('p','Provenance: '+result.sourceVerification));
 if(result.analysisStatus==='blocked')host.append(text('p','Answer data unavailable: Flashpoint marked '+result.respondentCount+' records COMPLETE, but the retrieved answer payloads are empty. No rating, preference or concern charts can be generated. Refreshing saved files cannot recover answers missing on Flashpoint.','research-empty'));
 else if(result.status!=='completed')host.append(text('p','This study is '+result.status+'. No completed research is claimed.','research-empty'));
 else{
  const charts=document.createElement('div');charts.className='research-charts';for(const question of result.questionResults){const chart=document.createElement('section');distribution(question,chart);charts.append(chart);}host.append(charts);
  if(result.keyFindings.length){host.append(text('h4','Key Research Findings'));const list=document.createElement('ul');result.keyFindings.forEach(finding=>list.append(text('li',finding)));host.append(list);}
  if(result.openEndedAnswers?.length){const answers=document.createElement('details');answers.append(text('summary','Actual open-ended answers · '+result.openEndedAnswers.length));for(const answer of result.openEndedAnswers)answers.append(text('p',answer.questionId+' · '+answer.respondentId+': '+answer.answer));host.append(answers);}
  const groups=result.stakeholderSegments.filter(group=>group.respondentCount>0&&group.questionResults.length);
  if(groups.length){host.append(text('h4','Stakeholder Comparison'));for(const group of groups){const section=document.createElement('details');section.append(text('summary',group.label+' · '+group.respondentCount+' respondents'));group.questionResults.forEach(question=>distribution(question,section));host.append(section);}}
  else host.append(text('p','Role-level comparisons were not supplied; no group differences are inferred.'));
 }
 host.append(text('h4','Research Limitations'));const limitations=document.createElement('ul');result.limitations.forEach(value=>limitations.append(text('li',value)));host.append(limitations);
}
async function loadStudies(preferred){
 requireBrief();const reply=await request('/api/v1/research/results?scenarioId='+encodeURIComponent(brief.scenarioId));requireBrief();
 if(!Array.isArray(reply.results)||reply.results.some(result=>result.scenarioId!==brief.scenarioId))throw Error('The backend returned a study for a different scenario. It was not displayed.');
 studies=reply.results;const select=$('researchStudy');select.replaceChildren();if(!studies.length)select.append(new Option('No studies for these exact inputs',''));
 studies.forEach(result=>select.append(new Option(result.surveyTitle+' · '+(result.analysisStatus||result.status),result.researchId)));
 select.disabled=!studies.length;const result=studies.find(result=>result.researchId===preferred)||studies[0];if(result)select.value=result.researchId;render(result);
 feedback('researchStudy',result?'Loaded '+result.surveyTitle+' for scenario '+brief.scenarioId+'.':'No study matches this scenario.');
}
async function prepare(){requireLinked();const reply=await request('/api/v1/research/prepare-panel',snapshot());requireLinked();plan=reply;$('researchPlan').textContent=JSON.stringify(reply,null,2);$('researchPlan').hidden=false;return reply;}
function clearPlan(){plan=null;$('researchPlan').hidden=true;$('researchPlan').textContent='';}
$('researchGenerate').onclick=()=>act('researchGenerate',async()=>{
 brief=null;signature=null;linkage=null;clearPlan();const body=snapshot(),submitted=JSON.stringify(body);
 $('researchLink').textContent='Checking the current scenario…';$('researchStudy').disabled=true;$('researchResults').replaceChildren(text('p','Loading saved study…','research-empty'));
 status('Calculating the scenario and checking the saved survey…');
 const result=await request('/api/v1/research/brief',body);if(submitted!==currentSignature())throw Error('Inputs changed while generating the brief. Generate it again.');
 brief=result;signature=submitted;stale=false;$('researchBrief').textContent=JSON.stringify(result,null,2);$('researchBriefDetails').hidden=false;$('researchScenarioId').textContent='Required scenarioId: '+result.scenarioId;
 for(const id of buttonIds.filter(id=>id!=='researchGenerate'))feedback(id,'');
 linkage=await request('/api/v1/research/study?scenarioId='+encodeURIComponent(result.scenarioId));requireBrief();
 $('researchLink').textContent=linkage.matches?'Linked to existing survey '+linkage.surveyId+' · scenario '+result.scenarioId+'.':'No link: these inputs differ from survey '+linkage.surveyId+'. Restore Combined, default finance and year 2050 to view that study.';
 if(linkage.matches){feedback('researchRefresh','Reads saved local response files; no live or paid query.');feedback('researchPrepare','Prepares an approval request only. It does not run the panel.');feedback('researchCopy','Copies the existing-survey panel prompt only.');feedback('researchDownload','Downloads a panel request for review, not study results.');}
 let message='Research brief ready. ';
 try{if(linkage.matches){const reply=await request('/api/v1/research/sync',{scenarioId:result.scenarioId});requireBrief();message+=reply.message;}else message+='The existing survey was not attached to different inputs.';await loadStudies();}
 catch(error){await loadStudies();throw Error('Research brief ready, but saved-result import failed: '+error.message);}
 return message;
});
$('researchRefresh').onclick=()=>act('researchRefresh',async()=>{requireLinked();const reply=await request('/api/v1/research/sync',{scenarioId:brief.scenarioId});await loadStudies(reply.result.researchId);return reply.message;});
$('researchPrepare').onclick=()=>act('researchPrepare',async()=>{await prepare();return 'Request prepared for 12 synthetic respondents on the existing survey. Panel: 0.60 USDC; separate analysis if needed: 0.50 USDC. Explicit approval required, zero paid retries. Nothing was executed.';});
$('researchCopy').onclick=()=>act('researchCopy',async()=>{
 const prepared=plan||await prepare();requireLinked();const prompt='Existing survey_id: '+prepared.request.arguments.survey_id+'\nAction: create_and_run; num_respondents: 12\n'+prepared.request.arguments.context;
 try{await navigator.clipboard.writeText(prompt);}catch{ $('researchPlan').hidden=false;throw Error('Clipboard access was denied. The prepared request is visible below; select and copy its context manually. No call was executed.');}requireLinked();
 return 'Flashpoint panel prompt copied for the existing survey. It was not pasted into the results field. No panel was run.';
});
$('researchDownload').onclick=()=>act('researchDownload',async()=>{
 const prepared=plan||await prepare();requireLinked();const url=URL.createObjectURL(new Blob([JSON.stringify(prepared.request,null,2)],{type:'application/json'})),anchor=document.createElement('a');
 try{anchor.href=url;anchor.download='flashpoint-panel-request.json';document.body.append(anchor);anchor.click();}finally{anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return 'Panel request download started: flashpoint-panel-request.json. This is an approval request, not completed results; do not import it. Nothing was executed.';
});
$('researchImport').onclick=()=>act('researchImport',async()=>{
 requireBrief();const value=$('researchJSON').value.trim();if(!value)throw Error('Paste completed study results first, or use Refresh Saved Results for automatic backend import.');
 let data;try{data=JSON.parse(value);}catch{throw Error('Invalid JSON. Paste completed study results, not a survey request or prompt.');}
 if(data?.tool||data?.arguments||data?.flashpointArguments||data?.paymentApproval||data?.surveyQuestions)throw Error('This is a survey or panel request, not completed study results. Actual respondent answers or distributions are required. Use Prepare Request for requests; Refresh Saved Results loads backend data.');
 if(data?.status!=='completed')throw Error('Completed study results are required here. Pending requests and blocked records are not completed results. Use Refresh Saved Results instead.');
 if(data.scenarioId!==brief.scenarioId)throw Error('Imported scenarioId does not match the current calculated brief. Generate the matching scenario; this study was not relinked.');
 const saved=await request('/api/v1/research/results',data);await loadStudies(saved.researchId);$('researchJSON').value='';return 'Research data validated, saved locally, and loaded. Provenance is labeled as user supplied.';
});
$('researchStudy').onchange=()=>{try{requireBrief();const result=studies.find(result=>result.researchId===$('researchStudy').value);if(!result)throw Error('That study is unavailable. Refresh Saved Results.');render(result);const message='Selected '+result.surveyTitle+' · '+(result.analysisStatus||result.status)+'.';feedback('researchStudy',message,'success');status(message,'success');}catch(error){feedback('researchStudy',error.message,'error');status(error.message,'error');}};
function checkStale(){if(brief&&signature!==currentSignature()&&!stale){stale=true;clearPlan();$('researchStudy').disabled=true;$('researchLink').textContent='Inputs changed. The previous survey link is no longer current.';$('researchResults').replaceChildren(text('p','Scenario changed. Generate a new brief to check matching results.','research-empty'));status('Scenario changed. Generate a new brief; no study from the previous inputs will be shown.','error');}}
for(const event of ['input','change','click'])$('sim').addEventListener(event,()=>setTimeout(checkStale,0));
})();
