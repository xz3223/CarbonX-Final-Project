/* Synthetic placements from the supplied offline atlas; no measured facility data. */
(function(g){
const sites=[
 {id:'gary',city:'Gary area',state:'IN',region:'Great Lakes',lat:41.60,lng:-87.35,scale:1.2,so:7,wi:9,ot:5,ef:.50,description:'Great Lakes corridor · illustrative integrated steelmaking scenario.'},
 {id:'cleveland',city:'Cleveland area',state:'OH',region:'Great Lakes',lat:41.49,lng:-81.69,scale:1.05,so:9,wi:8,ot:6,ef:.48,description:'Great Lakes corridor · illustrative high-energy industrial scenario.'},
 {id:'detroit',city:'Detroit area',state:'MI',region:'Great Lakes',lat:42.34,lng:-83.05,scale:.85,so:10,wi:10,ot:5,ef:.45,description:'Great Lakes region · conceptual process/electrification study.'},
 {id:'chicago',city:'Chicago area',state:'IL',region:'Great Lakes',lat:41.88,lng:-87.63,scale:.95,so:12,wi:11,ot:5,ef:.46,description:'Chicago area · hypothetical steel-processing decarbonization node.'},
 {id:'buffalo',city:'Buffalo area',state:'NY',region:'Northeast',lat:42.88,lng:-78.87,scale:.75,so:8,wi:13,ot:10,ef:.42,description:'Northeast industrial corridor · conceptual steel plant scenario.'},
 {id:'pittsburgh',city:'Pittsburgh area',state:'PA',region:'Northeast',lat:40.44,lng:-79.99,scale:1.1,so:12,wi:9,ot:6,ef:.46,description:'Western Pennsylvania · illustrative integrated mill case study.'},
 {id:'baltimore',city:'Baltimore area',state:'MD',region:'Northeast',lat:39.29,lng:-76.61,scale:.8,so:14,wi:8,ot:6,ef:.43,description:'Mid-Atlantic corridor · illustrative industrial electrification case.'},
 {id:'philadelphia',city:'Philadelphia area',state:'PA',region:'Northeast',lat:39.95,lng:-75.16,scale:.75,so:12,wi:8,ot:8,ef:.39,description:'Mid-Atlantic corridor · conceptual carbon-capture comparison.'},
 {id:'birmingham',city:'Birmingham area',state:'AL',region:'South',lat:33.52,lng:-86.80,scale:1.05,so:16,wi:7,ot:4,ef:.58,description:'Southeastern industrial corridor · illustrative energy-mix transition.'},
 {id:'houston',city:'Houston area',state:'TX',region:'South',lat:29.76,lng:-95.37,scale:1.3,so:18,wi:12,ot:4,ef:.56,description:'Gulf Coast industrial corridor · illustrative capture-and-storage scenario.'},
 {id:'stlouis',city:'St. Louis area',state:'MO',region:'South',lat:38.63,lng:-90.20,scale:.8,so:10,wi:12,ot:4,ef:.52,description:'Mississippi valley corridor · conceptual energy efficiency scenario.'},
 {id:'kansascity',city:'Kansas City area',state:'MO',region:'South',lat:39.10,lng:-94.58,scale:.85,so:15,wi:16,ot:3,ef:.53,description:'Central U.S. · hypothetical steel plant scenario node.'},
 {id:'losangeles',city:'Los Angeles area',state:'CA',region:'West',lat:34.05,lng:-118.24,scale:.75,so:22,wi:8,ot:8,ef:.43,description:'Pacific corridor · illustrative electrification-driven transition.'},
 {id:'portland',city:'Portland area',state:'OR',region:'West',lat:45.52,lng:-122.68,scale:.72,so:12,wi:13,ot:23,ef:.40,description:'Pacific Northwest · conceptual low-carbon electricity scenario.'},
 {id:'seattle',city:'Seattle area',state:'WA',region:'West',lat:47.60,lng:-122.33,scale:.70,so:8,wi:12,ot:25,ef:.38,description:'Pacific Northwest · illustrative grid-and-efficiency scenario.'}
];
g.CarbonAtlasSites=sites;
if(typeof module!=='undefined')module.exports=sites;
})(typeof globalThis!=='undefined'?globalThis:this);
