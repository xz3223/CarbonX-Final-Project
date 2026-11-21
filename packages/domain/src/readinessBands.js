(function(g){'use strict';
// Presentation bands, not regulatory or engineering clearance criteria.
function classify(total){if(total===null||total===undefined||!Number.isFinite(total))return {id:'unknown',color:'#344858',label:'No workbook score'};return total>=24?{id:'green',color:'#36be85',label:'Stronger readiness / diligence candidate'}:total>=18?{id:'amber',color:'#f0bb50',label:'Conditional / evidence gaps remain'}:{id:'red',color:'#ef6b65',label:'Low readiness / barriers unresolved'}}
g.ReadinessBands={classify};if(typeof module!=='undefined')module.exports=g.ReadinessBands;
})(globalThis);
