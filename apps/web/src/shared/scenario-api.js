/* Plain browser client. Network calls are never made from the rendering loop.
 * Full scenario input snapshots are the source of truth; model outputs are read-only.
 */
(function(g){
 'use strict';
 const KEY='industrialCarbonTwin.scenarioDraft.v1';
 const defaultFinance=()=>({...g.TEA_CONFIG});
 function loadDraft(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return v?.schemaVersion==='1'?v:null}catch{return null}}
 function saveDraft(draft){try{const prev=loadDraft();const stamp=x=>JSON.stringify([x.params,x.finance,x.year,x.siteId||'generic']);if(prev&&stamp(prev)===stamp(draft))return;localStorage.setItem(KEY,JSON.stringify({schemaVersion:'1',...draft,updatedAt:new Date().toISOString()}))}catch{}}
 async function json(url,{body,signal}={}){
  const response=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal});
  let data;try{data=await response.json()}catch{throw new Error('Non-JSON API response')}
  if(!response.ok)throw new Error(data.error?.message||'HTTP '+response.status);
  return data;
 }
 const run=(draft,signal)=>json('/api/v1/scenarios/run',{
  body:{schemaVersion:'1',context:{siteId:draft.siteId||'generic'},scenario:{year:draft.year,legacyParams:draft.params},finance:draft.finance},signal
 });
 function connect({read,onResult,onStatus,delay=300}){
  let timer=null,controller=null,lastRequested='',lastConfirmed='',sequence=0;
  function schedule(){
   const draft=read();saveDraft(draft);
   const hash=JSON.stringify([draft.params,draft.finance,draft.year,draft.siteId||'generic']);
   clearTimeout(timer);
   if(hash===lastRequested){if(hash===lastConfirmed)onStatus?.('online','API confirmed · '+draft.year);return;}
   onStatus?.('pending','Local preview · calculating…');
   timer=setTimeout(async()=>{
    const id=++sequence;
    controller?.abort();controller=new AbortController();lastRequested=hash;
    try{
     const data=await run(draft,controller.signal);
     const current=read();
     const same=JSON.stringify([current.params,current.finance,current.year,current.siteId||'generic'])===hash;
     if(id!==sequence||!same)return;
     lastConfirmed=hash;
     onResult(data);
     onStatus?.('online','API confirmed · '+data.year);
    }catch(e){
     if(e.name==='AbortError')return;
     lastRequested='';
     onStatus?.('warning','API unavailable · local preview ('+e.message+')');
    }
   },delay);
  }
  return {schedule,refresh(){lastRequested='';schedule()},close(){clearTimeout(timer);controller?.abort()}};
 }
 g.CarbonTwinClient={run,connect,json,loadDraft,saveDraft,key:KEY,defaultFinance};
})(window);
