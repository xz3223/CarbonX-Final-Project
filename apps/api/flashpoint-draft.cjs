'use strict';
// Map the actually observed Flashpoint questionnaire response to workflow
// metadata. A completed drafting task is NOT completed respondent research.
function fromResponse(envelope){
 if(!envelope?.result||envelope.result.isError===true)throw Error('Flashpoint returned no successful draft result');
 let task=envelope.result.structuredContent;
 if(!task){const text=envelope.result.content?.find(item=>item.type==='text')?.text;if(typeof text!=='string')throw Error('Missing Flashpoint draft content');task=JSON.parse(text);}
 const result=task?.result;
 if(task?.status!=='completed'||task.error||!result?.survey_id||typeof result.final_text!=='string')throw Error('The Flashpoint drafting task has not completed with a survey ID');
 const questionnaire=result.final_text.replace(/\\n/g,'\n');
 if(!/Status:\s*Draft\b/i.test(questionnaire))throw Error('Response does not establish a draft survey');
 const title=questionnaire.match(/^##\s+(.+?)(?:\s+[—-]\s+Draft Questions)?\s*$/m)?.[1];
 if(!title)throw Error('Missing actual draft title');
 const conversationId=result.conversation_id||task.conversation_id;
 if(!conversationId||(result.conversation_id&&task.conversation_id&&result.conversation_id!==task.conversation_id))throw Error('Missing or inconsistent conversation ID');
 return {questionnaire,surveyId:result.survey_id,conversationId,surveyTitle:title,
  record:{researchId:result.survey_id,scenarioId:envelope.scenarioId,source:'flashpoint',panelType:'synthetic',
   surveyTitle:title,surveyId:result.survey_id,conversationId,status:'pending',respondentCount:0,researchDate:null,
   questionResults:[],stakeholderSegments:[],keyFindings:[],limitations:[
    'Only the questionnaire drafting workflow is complete. The survey is DRAFT; no synthetic panel has been launched and no respondent answers have been collected.',
    'The draft and IDs were imported from the saved wallet-authenticated Flashpoint response. This is workflow metadata, not completed research findings.'
   ]}};
}
module.exports={fromResponse};
