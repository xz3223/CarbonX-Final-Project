// Read-only background-job status. NEVER uses a payment wrapper/signer.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {connect,parseRpcText} from './flashpoint.mjs';
import {createLongTransport} from './approved-draft.mjs';

export async function readPanelStatus(session,jobId,fetchImpl=fetch){
 if(typeof jobId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(jobId))throw Error('A valid actual job_id is required.');
 const response=await fetchImpl('https://api.flashpoint.ai/mcp',{method:'POST',redirect:'error',signal:AbortSignal.timeout(60000),
  headers:{'Content-Type':'application/json',...session.headers},
  body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'panel',arguments:{action:'status',job_id:jobId}}})});
 if(response.status===402){await response.text();return {jobId,httpStatus:402,paymentRequired:true,paymentSigning:false,message:'Status is paywalled. Stopped without signing or retrying; separate payment approval is required.'};}
 if(!response.ok)throw Error('Panel status HTTP '+response.status);
 const result=parseRpcText(await response.text(),1);
 if(result?.isError)throw Error('Panel status returned an error. No payment or retry was made.');
 return {jobId,httpStatus:response.status,paymentRequired:false,paymentSigning:false,result};
}
function sanitize(value){
 const json=JSON.stringify(value).replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[REDACTED_TOKEN]').replace(/0x[0-9a-fA-F]{64}\b/g,'[REDACTED_HEX]');
 return JSON.parse(json);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 let transport;
 try{
  if(process.argv.length!==3)throw Error('One actual job_id is required.');
  const jobId=process.argv[2];if(!/^[a-zA-Z0-9_-]{1,100}$/.test(jobId))throw Error('Invalid job_id.');
  const session=await connect();transport=createLongTransport(60000);
  const result=sanitize(await readPanelStatus(session,jobId,transport.fetch));result.checkedAt=new Date().toISOString();
  const directory=new URL('./.jobs/',import.meta.url);fs.mkdirSync(directory,{recursive:true});
  const file=new URL(jobId+'.status.json',directory);fs.writeFileSync(file,JSON.stringify(result,null,2),{mode:0o600});
  console.log(JSON.stringify({jobId,httpStatus:result.httpStatus,paymentRequired:result.paymentRequired,paymentSigning:false,resultFile:fileURLToPath(file)}));
 }catch{console.error('Read-only panel status failed. No payment was signed and no retry was made.');process.exitCode=1;}
 finally{if(transport)await transport.close();}
}
