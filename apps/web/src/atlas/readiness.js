(function(){
 const data=window.CarbonReadinessData,q=document.getElementById('filter'),rows=document.getElementById('rows');
 document.getElementById('metadata').textContent='50 states · imported workbook scores · six dimensions, 0–6 each';
 const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function draw(){const filter=q.value.toLowerCase();rows.innerHTML=data.states.filter(x=>(x.code+' '+x.name+' '+x.exampleRegions).toLowerCase().includes(filter)).map(x=>`<tr data-state="${x.code}" tabindex="0" role="button" aria-label="View ${x.name} readiness"><td><b>${x.code}</b> ${safe(x.name)}</td><td>${x.total}</td><td>${x.scores.permits}</td><td>${x.scores.storage}</td><td>${x.scores.water}</td><td>${x.scores.transport}</td><td>${x.scores.economics}</td><td>${x.scores.cluster}</td><td>${safe(x.exampleRegions)}</td></tr>`).join('')}
 function select(event){const row=event.target.closest('[data-state]');if(!row)return;window.dispatchEvent(new CustomEvent('readiness:select',{detail:{state:row.dataset.state,kind:'state'}}));document.getElementById('readinessPanel').scrollIntoView({behavior:'smooth',block:'start'})}
 q.addEventListener('input',draw);rows.addEventListener('click',select);rows.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(event)}});draw();
})();
