'use strict';
// Run after an independently approved Flashpoint call. Never launches a tool,
// authenticates a wallet, signs payments, or requires copying JSON into the UI.
const fs=require('node:fs'),path=require('node:path');
const R=require('../apps/api/research.cjs'),F=require('../apps/api/flashpoint-study.cjs');
function importFiles(analysisFile,panelFile,{store=R.createStore(),destination=path.resolve(__dirname,'../data/flashpoint/latest-study.json')}={}){
 const analysis=JSON.parse(fs.readFileSync(analysisFile,'utf8')),panel=JSON.parse(fs.readFileSync(panelFile,'utf8'));
 const run=panel.result?.structuredContent?.run_result,data=run?.result,scope=data?.analytics_scope;
 const current=F.linkage(panel.scenarioId);
 if(panel.result?.isError||run?.status!=='completed'||run.error||!current.matches||analysis.scenarioId!==panel.scenarioId||scope?.survey_id!==F.SURVEY_ID||scope.panel_id!==data.panel_id||typeof scope.run_id!=='string'||data.responses_submitted!==12)throw Error('Panel result does not match the existing survey and scenario; nothing imported');
 const workflow={surveyId:F.SURVEY_ID,panelId:scope.panel_id,runId:scope.run_id,calibrationVersion:scope.calibration_version||null};
 const record=R.normalize(F.fromReport(F.reportFromEnvelope(analysis),{...current,...workflow}));
 // Whitelist the persisted envelope shape, excluding request headers/tokens.
 const safe={scenarioId:analysis.scenarioId,result:analysis.result};
 if(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|FLASHPOINT_WALLET_KEY|FLASHPOINT_WALLET_JWT|"(?:private_?key|authorization|access_token)"\s*:/i.test(JSON.stringify(safe)))throw Error('Credential-like material found; nothing imported');
 fs.mkdirSync(path.dirname(destination),{recursive:true});
 const temporary=destination+'.tmp';fs.writeFileSync(temporary,JSON.stringify({workflow,analysis:safe},null,2),{mode:0o600});fs.renameSync(temporary,destination);
 return store.import(record,{provenance:'saved-flashpoint-response'});
}
if(require.main===module){
 try{const [analysisFile,panelFile]=process.argv.slice(2);if(!analysisFile||!panelFile)throw Error('Usage: node scripts/import-flashpoint-results.cjs <saved-analysis-result.json> <saved-panel-result.json>');
  const result=importFiles(analysisFile,panelFile);console.log(JSON.stringify({surveyId:result.surveyId,scenarioId:result.scenarioId,respondents:result.respondentCount,usableAnswerSets:result.usableAnswerCount,analysis:result.analysisStatus,paidCalls:0}));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={importFiles};
