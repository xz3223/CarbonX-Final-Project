// Separately approved one-shot research path. The default client stays locked.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm';
import { Agent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import { wallet, balance, connect, parseRpcText } from './flashpoint.mjs';
import { NETWORK, USDC } from './x402-policy.mjs';

export const requestHash = request => createHash('sha256').update(JSON.stringify({tool:request.tool,arguments:request.arguments})).digest('hex');
function atomic(value) {
  if(typeof value!=='string'||!/^\d+(?:\.\d{1,6})?$/.test(value))throw Error('Invalid maximum USDC amount.');
  const [whole,fraction='']=value.split('.');return BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'));
}
export function validateApproval(request,approval) {
  if(!approval||approval.confirmed!==true||approval.hash!==requestHash(request))throw Error('Explicit approval of this exact request hash is required.');
  const args=request.arguments;
  if(!args||typeof args!=='object'||Array.isArray(args))throw Error('Invalid approved tool arguments.');
  if(request.tool==='tool_survey'){
    if(request.purpose==='scoped-analysis'){
      const scope=request.analyticsScope;
      if(!scope||Object.values(scope).some(value=>typeof value!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(value))||
       !scope.surveyId||!scope.panelId||!scope.runId||args.survey_id!==scope.surveyId||typeof args.conversation_id!=='string'||
       Object.keys(args).some(key=>!['brief','survey_id','conversation_id'].includes(key))||typeof args.brief!=='string'||
       !args.brief.startsWith('Retrieve existing synthetic research results')||!args.brief.includes('Do not publish')||
       !args.brief.includes(scope.panelId)||!args.brief.includes(scope.runId))throw Error('Analysis must be scoped to the approved existing survey, panel and run.');
    }else if(Object.keys(args).some(key=>key!=='brief')||typeof args.brief!=='string'||!args.brief.startsWith('Prepare a DRAFT survey')||!args.brief.includes('Do not publish'))throw Error('Only a new draft-only survey request is supported.');
  }else if(request.tool==='panel'){
    if(Object.keys(args).some(key=>!['action','name','num_respondents','research_objective','context','survey_id'].includes(key))||
      args.action!=='create_and_run'||!Number.isInteger(args.num_respondents)||args.num_respondents<1||args.num_respondents>20||
      typeof args.name!=='string'||!args.name.trim()||typeof args.research_objective!=='string'||!args.research_objective.trim()||
      typeof args.context!=='string'||!args.context.includes('Do not publish')||
      typeof args.survey_id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(args.survey_id))throw Error('Only one small synthetic panel on an existing draft survey is supported.');
  }else throw Error('This tool is outside the supported explicit approval scope.');
  if(approval.retryLimit!==0||request.paidRetries!==0||request.businessCalls!==1)throw Error('Only one business call and zero paid retries are permitted.');
  if((approval.id||null)!==(request.approvalId||null)||(request.approvalId!==undefined&&!/^[a-zA-Z0-9_-]{1,80}$/.test(request.approvalId)))throw Error('Explicit approval of this recovery authorization ID is required.');
  const maximum=atomic(approval.maximumUsdc);
  if(maximum<=0n||maximum>atomic(request.maximumUsdc))throw Error('Approval exceeds the reviewed request ceiling.');
  return maximum;
}

export function assertFunds(balanceUsdc,maximumUsdc) {
  if(atomic(balanceUsdc)<atomic(maximumUsdc))throw Error('Insufficient Base USDC for the approved ceiling; no tool call or payment signature was made.');
}

export function createLongTransport(timeout=650000) {
  const previous=getGlobalDispatcher(),agent=new Agent({headersTimeout:timeout,bodyTimeout:timeout});
  // setGlobalDispatcher installs undici's compatibility adapter for Node's
  // built-in fetch. Passing an undici 8 Agent as a direct dispatcher does not.
  setGlobalDispatcher(agent);
  return {fetch:(input,init={})=>fetch(input,{...init,redirect:'error',signal:AbortSignal.timeout(timeout)}),
    close:async()=>{setGlobalDispatcher(previous);await agent.destroy();}};
}

export function approvedFetch(account,session,request,approval,consume,fetchImpl=fetch,cachedChallenge=null) {
  const maximum=validateApproval(request,approval),id=1;
  const payload={jsonrpc:'2.0',id,method:'tools/call',params:{name:request.tool,arguments:request.arguments}};
  let attempted=false,unsigned=0,signed=0;
  const client=new x402Client()
    .register(NETWORK,new ExactEvmScheme(account))
    .registerPolicy((version,requirements)=>version===2?requirements.filter(r=>
      r.network===NETWORK&&r.scheme==='exact'&&r.asset.toLowerCase()===USDC.toLowerCase()&&
      /^\d+$/.test(r.amount)&&BigInt(r.amount)>0n&&BigInt(r.amount)<=maximum):[])
    .onBeforePaymentCreation(async({selectedRequirements})=>{
      if(attempted||BigInt(selectedRequirements.amount)>maximum)return {abort:true,reason:'Approved payment budget is exhausted.'};
      // A durable one-shot marker is written before a payment signature exists.
      // A timeout or failed response never automatically makes approval reusable.
      consume();attempted=true;
    });
  const transport=async(input,init={})=>{
    const message=new Request(input,init);
    if(message.url!=='https://api.flashpoint.ai/mcp'||message.method!=='POST'||
      message.headers.get('authorization')!==session.headers.Authorization||
      JSON.stringify(await message.clone().json())!==JSON.stringify(payload))throw Error('Request does not match the approved operation.');
    const paid=message.headers.has('payment-signature')||message.headers.has('x-payment');
    if(paid){if(!attempted||++signed>1)throw Error('Paid retries are forbidden.');}
    else if(++unsigned>1)throw Error('Unapproved HTTP retry refused.');
    if(!paid&&cachedChallenge){const response=cachedChallenge.clone();cachedChallenge=null;return response;}
    // Request construction transfers a Request input's body. Forward the
    // validated message, not the now-consumed original SDK Request.
    return fetchImpl(message,{redirect:'error'});
  };
  const guarded=wrapFetchWithPayment(transport,client);
  return ()=>guarded('https://api.flashpoint.ai/mcp',{method:'POST',headers:{'Content-Type':'application/json',...session.headers},body:JSON.stringify(payload)});
}

function redact(value) {
  if(typeof value==='string')return value.replace(/0x[0-9a-fA-F]{64}\b/g,'[REDACTED_HEX]').replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[REDACTED_TOKEN]');
  if(Array.isArray(value))return value.map(redact);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,/token|secret|private.?key|authorization/i.test(key)?'[REDACTED]':redact(item)]));
  return value;
}

async function main() {
  const [file,...flags]=process.argv.slice(2);
  if(![6,8,10].includes(flags.length)||flags[0]!=='--approve-request-sha256'||flags[2]!=='--max-usdc'||flags[4]!=='--retry-limit'||flags[5]!=='0')throw Error('Explicit request hash, USDC ceiling and zero-retry approval flags are required.');
  const extras={};for(let index=6;index<flags.length;index+=2){if(!['--payment-terms-file','--approval-id'].includes(flags[index])||extras[flags[index]])throw Error('Invalid optional authorization flags.');extras[flags[index]]=flags[index+1];}
  const request=JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));
  const approval={confirmed:true,hash:flags[1],maximumUsdc:flags[3],retryLimit:0,id:extras['--approval-id']};
  validateApproval(request,approval);
  let cachedChallenge=null;
  if(extras['--payment-terms-file']){
    const quote=JSON.parse(fs.readFileSync(path.resolve(extras['--payment-terms-file']),'utf8'));
    if(quote.requestHash!==approval.hash||quote.status!==402||quote.paymentSignatureCreated!==false||
      quote.body?.x402Version!==2||!quote.paymentRequiredHeader||Date.now()-Date.parse(quote.checkedAt)>900000||!Number.isFinite(Date.parse(quote.checkedAt)))throw Error('Cached unsigned payment terms are invalid or stale.');
    cachedChallenge=new Response(JSON.stringify(quote.body),{status:402,headers:{'Content-Type':'application/json','payment-required':quote.paymentRequiredHeader}});
  }
  const directory=new URL('./.payments/',import.meta.url);fs.mkdirSync(directory,{recursive:true});
  const operation=approval.hash+(approval.id?'.'+approval.id:'');
  const marker=new URL(operation+'.used.json',directory),output=new URL(operation+'.result.json',directory);
  if(fs.existsSync(marker))throw Error('This request approval was already consumed; inspect its saved result before considering another call.');
  const account=wallet();
  assertFunds(await balance(),approval.maximumUsdc);
  const session=await connect();
  const consume=()=>{
    const fd=fs.openSync(marker,'wx',0o600);
    try{fs.writeFileSync(fd,JSON.stringify({requestHash:approval.hash,approvalId:approval.id||null,maximumUsdc:approval.maximumUsdc,retryLimit:0,attemptedAt:new Date().toISOString()}));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  };
  const transport=createLongTransport();
  try {
    const send=approvedFetch(account,session,request,approval,consume,transport.fetch,cachedChallenge);
    const response=await send();
    if(!response.ok)throw Error('Approved request failed. Do not retry; inspect the recorded attempt.');
    const result=redact(parseRpcText(await response.text(),1));
    let receipt=null;
    try{const raw=JSON.parse(Buffer.from(response.headers.get('payment-response')||'', 'base64').toString());
      receipt={success:raw.success===true,network:raw.network===NETWORK?NETWORK:null,transaction:/^0x[0-9a-fA-F]{64}$/.test(raw.transaction)?raw.transaction:null};}catch{}
    fs.writeFileSync(output,JSON.stringify({requestHash:approval.hash,tool:request.tool,scenarioId:request.scenarioId,
      returnedAt:new Date().toISOString(),receipt,settlementVerified:receipt?.success===true,result},null,2),{mode:0o600});
    console.log(JSON.stringify({resultFile:fileURLToPath(output),settlementVerified:receipt?.success===true,receipt}));
  } catch(error){
    fs.writeFileSync(new URL(operation+'.error.json',directory),JSON.stringify({requestHash:approval.hash,approvalId:approval.id||null,failedAt:new Date().toISOString(),
      authorizationConsumptionRecorded:fs.existsSync(marker),error:redact(String(error.message)),causeCode:error.cause?.code||null,causeMessage:redact(String(error.cause?.message||'')),automaticRetries:0},null,2),{mode:0o600});
    throw error;
  } finally { await transport.close(); }
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Approved request could not complete. No automatic retry was made. Check the request, approval flags, and any .payments attempt/result files; credentials were not displayed.');process.exitCode=1;});
