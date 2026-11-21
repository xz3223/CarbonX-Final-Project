import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readPanelStatus} from './panel-status.mjs';
const session={headers:{Authorization:'Bearer offline-test'}};
test('status queries send only the documented read-only action, without payment headers',async()=>{
 const result=await readPanelStatus(session,'actual-job-fixture',async(url,init)=>{
  assert.equal(url,'https://api.flashpoint.ai/mcp');assert.equal(init.redirect,'error');
  assert.deepEqual(JSON.parse(init.body).params,{name:'panel',arguments:{action:'status',job_id:'actual-job-fixture'}});
  const headers=new Headers(init.headers);assert.ok(!headers.has('payment-signature'));assert.ok(!headers.has('x-payment'));
  return Response.json({jsonrpc:'2.0',id:1,result:{structuredContent:{status:'running',progress:0.2}}});
 });
 assert.equal(result.paymentSigning,false);assert.equal(result.result.structuredContent.status,'running');
});
test('a paywalled status query stops after one unsigned request',async()=>{
 let calls=0;const result=await readPanelStatus(session,'job-fixture',async()=>{calls++;return new Response('',{status:402});});
 assert.equal(calls,1);assert.equal(result.paymentRequired,true);assert.equal(result.paymentSigning,false);
});
test('invalid status IDs are refused before any HTTP request',async()=>{
 let called=false;await assert.rejects(readPanelStatus(session,'../another-tool',async()=>{called=true;}),/valid actual job_id/);assert.ok(!called);
});
