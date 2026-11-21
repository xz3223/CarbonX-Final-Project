import {test} from 'node:test';
import assert from 'node:assert/strict';
import {approvedFetch,requestHash,validateApproval,assertFunds} from './approved-draft.mjs';
import {NETWORK,USDC} from './x402-policy.mjs';
const request={tool:'tool_survey',arguments:{brief:'Prepare a DRAFT survey for an offline test. Do not publish.'},maximumUsdc:'0.50',businessCalls:1,paidRetries:0};
const approval={confirmed:true,hash:requestHash(request),maximumUsdc:'0.50',retryLimit:0};
const terms=(amount='500000',asset=USDC)=>({x402Version:2,resource:{url:'https://api.flashpoint.ai/mcp',description:'Offline fixture',mimeType:'application/json'},accepts:[{scheme:'exact',network:NETWORK,asset,amount,payTo:'0x'+'2'.repeat(40),maxTimeoutSeconds:60,extra:{name:'USD Coin',version:'2'}}]});
const response=body=>new Response(null,{status:402,headers:{'payment-required':Buffer.from(JSON.stringify(body)).toString('base64')}});
const session={headers:{Authorization:'Bearer offline-fixture'}};
test('zero or insufficient balances stop the operation before authentication or signing',()=>{
 assert.throws(()=>assertFunds('0','0.50'),/Insufficient/);
 assert.throws(()=>assertFunds('0.49','0.50'),/Insufficient/);
 assert.doesNotThrow(()=>assertFunds('20','0.50'));
});
test('a recovery authorization is separate, explicit, and bound to its manifest ID',()=>{
 const recovery={...request,approvalId:'draft-recovery-20261120-1'};
 assert.throws(()=>validateApproval(recovery,approval),/authorization ID/);
 assert.throws(()=>validateApproval(recovery,{...approval,id:'another-grant'}),/authorization ID/);
 assert.throws(()=>validateApproval(request,{...approval,id:recovery.approvalId}),/authorization ID/);
 assert.equal(validateApproval(recovery,{...approval,id:recovery.approvalId}),500000n);
});
test('an exact approved hash, ceiling, call count and zero retry limit are mandatory',()=>{
 for(const bad of [null,{...approval,confirmed:false},{...approval,hash:'changed'},{...approval,maximumUsdc:'0.51'},{...approval,retryLimit:1}])assert.throws(()=>validateApproval(request,bad));
 assert.throws(()=>validateApproval({...request,arguments:{brief:request.arguments.brief+' changed'}},approval));
 assert.equal(validateApproval(request,approval),500000n);
});
test('panel approval permits only a small synthetic create_and_run with a real survey ID',()=>{
 const panel={tool:'panel',arguments:{action:'create_and_run',name:'Offline synthetic fixture',num_respondents:12,research_objective:'Offline test',context:'Do not publish or recruit humans.',survey_id:'actual-survey-fixture'},maximumUsdc:'0.60',businessCalls:1,paidRetries:0};
 const grant={confirmed:true,hash:requestHash(panel),maximumUsdc:'0.60',retryLimit:0};
 assert.equal(validateApproval(panel,grant),600000n);
 for(const patch of [{action:'recruit'},{action:'status'},{num_respondents:21},{survey_id:null},{provider:'prolific'}]){
  const bad={...panel,arguments:{...panel.arguments,...patch}};assert.throws(()=>validateApproval(bad,{...grant,hash:requestHash(bad)}));
 }
});
test('analysis grants cannot omit their exact survey, panel and run filters',()=>{
 const analysis={tool:'tool_survey',purpose:'scoped-analysis',analyticsScope:{surveyId:'survey-fixture',panelId:'panel-fixture',runId:'run-fixture'},arguments:{survey_id:'survey-fixture',conversation_id:'conversation-fixture',brief:'Retrieve existing synthetic research results for panel-fixture and run-fixture. Do not publish.'},maximumUsdc:'0.50',businessCalls:1,paidRetries:0};
 const grant={confirmed:true,hash:requestHash(analysis),maximumUsdc:'0.50',retryLimit:0};assert.equal(validateApproval(analysis,grant),500000n);
 const bad={...analysis,arguments:{...analysis.arguments,brief:'Retrieve existing synthetic research results. Do not publish.'}};
 assert.throws(()=>validateApproval(bad,{...grant,hash:requestHash(bad)}),/scoped/);
});
test('over-budget or wrong-asset requirements never invoke the signer or consume approval',async()=>{
 for(const body of [terms('500001'),terms('500000','0x'+'3'.repeat(40))]){
  let signed=0,consumed=0,calls=0;
  const signer={address:'0x'+'1'.repeat(40),signTypedData:async()=>{signed++;return '0x'+'1'.repeat(130);}};
  const send=approvedFetch(signer,session,request,approval,()=>consumed++,async()=>{calls++;return response(body);});
  await assert.rejects(send());assert.equal(signed,0);assert.equal(consumed,0);assert.equal(calls,1);
 }
});
test('offline approved handshake permits one signature/submission and refuses replay',async()=>{
 let signed=0,consumed=0,calls=0;
 const signer={address:'0x'+'1'.repeat(40),signTypedData:async()=>{signed++;return '0x'+'1'.repeat(130);}};
 const send=approvedFetch(signer,session,request,approval,()=>consumed++,async()=>{calls++;return calls===1?response(terms()):Response.json({jsonrpc:'2.0',id:1,result:{content:[]}});});
 assert.equal((await send()).status,200);assert.equal(signed,1);assert.equal(consumed,1);assert.equal(calls,2);
 await assert.rejects(send());assert.equal(signed,1);assert.equal(calls,2);
});
test('ambiguous transport failure after signing is never automatically retried',async()=>{
 let calls=0,consumed=0;
 const signer={address:'0x'+'1'.repeat(40),signTypedData:async()=> '0x'+'1'.repeat(130)};
 const send=approvedFetch(signer,session,request,approval,()=>consumed++,async()=>{if(++calls===1)return response(terms());throw Error('offline timeout');});
 await assert.rejects(send());assert.equal(calls,2);assert.equal(consumed,1);
});
test('validated request bodies remain readable by the actual fetch transport',async()=>{
 let calls=0;
 const signer={address:'0x'+'1'.repeat(40),signTypedData:async()=> '0x'+'1'.repeat(130)};
 const send=approvedFetch(signer,session,request,approval,()=>{},async(input,init)=>{
  const actual=new Request(input,init);
  const body=await actual.json();assert.equal(body.params.name,'tool_survey');assert.equal(body.params.arguments.brief,request.arguments.brief);
  return ++calls===1?response(terms()):Response.json({jsonrpc:'2.0',id:1,result:{content:[]}});
 });
 assert.equal((await send()).status,200);assert.equal(calls,2);
});
test('cached unsigned terms need only one actual signed HTTP submission',async()=>{
 let calls=0,signatures=0,consumed=0;
 const signer={address:'0x'+'1'.repeat(40),signTypedData:async()=>{signatures++;return '0x'+'1'.repeat(130);}};
 const send=approvedFetch(signer,session,request,approval,()=>consumed++,async(input,init)=>{
  const actual=new Request(input,init);assert.ok(actual.headers.has('payment-signature'));await actual.json();calls++;
  return Response.json({jsonrpc:'2.0',id:1,result:{content:[]}});
 },response(terms()));
 assert.equal((await send()).status,200);assert.equal(calls,1);assert.equal(signatures,1);assert.equal(consumed,1);
});
