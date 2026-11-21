/* Industrial Carbon Twin engine: deterministic, no UI. ALL PARAMETERS ILLUSTRATIVE.
   Boundary: one BF-BOF plant, 2.0 Mt steel/yr. Scope 1 + illustrative electricity supply-mix proxy (not a formal location-based inventory) + capture energy.
   Units: emissions Mt CO2e/yr; energy GWh/yr; factors kg CO2/kWh; GWh*kg/kWh/1000 = Mt. */
(function (g) {
'use strict';
const SRC = [ // e = baseline Scope 1 (Mt/yr); gwh = fuel energy (GWh/yr); c = capture-eligible
  { id: 'sinter', e: .38, c: 1, gwh: 2100, fuel: 'coal' }, { id: 'bf', e: .80, c: 1, gwh: 6800, fuel: 'coal' },
  { id: 'stoves', e: .30, c: 1, gwh: 2300, fuel: 'pgas' }, { id: 'mill', e: .50, c: 0, gwh: 2500, fuel: 'ngas' }];
const K = { reducible: .6, capShare: .75, elecPerFuel: .7, steel: 2, rate: .08,
  lc: { so: .045, wi: .011, ot: .012 } }; // lifecycle kg/kWh: illustrative memo only, never added to operational totals
const P0 = { re: 20, ef: .42, eff: 0, ccs: false, cap: 90, pen: .3, perm: 99, cp: 75, el: 0, sub: 0, yr: 2030, so: 8, wi: 7, ot: 5, ed: 1000, dur: 10, scale: 1 };
const R = { so: [0, 100], wi: [0, 100], ot: [0, 100], ef: [0, 1.2], eff: [0, 50], el: [0, 100], cap: [0, 100], pen: [0, 1], perm: [0, 100],
  cp: [0, 1000], sub: [0, 100], yr: [2025, 2050], dur: [1, 25], ed: [100, 5000], scale: [.1, 10] };
const cl = (v, [a, b]) => Math.min(b, Math.max(a, v));
const YRS = Array.from({ length: 26 }, (_, i) => 2025 + i);

/* Reject/clamp invalid input; supply shares are the source of truth (re is derived); fossil = remainder. */
function validate(x) {
  const p = { ...P0, ...x }, w = [];
  for (const k in R) { let v = +p[k]; if (!Number.isFinite(v)) { w.push(k + ' invalid, default used'); v = P0[k]; }
    const c = cl(v, R[k]); if (c !== v) w.push(`${k} clamped to ${c}`); p[k] = c; }
  p.ccs = !!p.ccs; let s = p.so + p.wi + p.ot;
  if (s > 100 + 1e-9) { w.push('supply shares exceeded 100%, scaled to 100%'); for (const k of ['so', 'wi', 'ot']) p[k] *= 100 / s; s = 100; }
  p.re = s; return { p, w };
}

/* Steady-state accounting for one set of parameters. */
function calc(x) {
  const { p } = validate(x), k = 1 - p.eff / 100 * K.reducible, s1 = {}, fuel = {}; let t1 = 0, cp = 0;
  for (const s of SRC) { const f = s.id === 'mill' ? 1 - p.el / 100 : 1; s1[s.id] = s.e * p.scale * k * f; fuel[s.id] = s.gwh * p.scale * k * f; t1 += s1[s.id]; if (s.c) cp += s1[s.id] * K.capShare; }
  const cap = p.ccs ? cp * p.cap / 100 : 0, pg = cap * p.pen * 1000;            // capture energy, GWh = Mt * MWh/t * 1000
  const disp = SRC[3].gwh * p.scale * k * p.el / 100, eh = disp * K.elecPerFuel; // fuel displaced -> electricity needed
  const base = p.ed * p.scale * (1 - p.eff / 100), el = base + eh + pg;          // purchased electricity demand
  const fs = Math.max(0, 100 - p.re), sup = { so: el * p.so / 100, wi: el * p.wi / 100, ot: el * p.ot / 100, fo: el * fs / 100 }, gf = p.ef / 1000;
  const s2 = sup.fo * gf, pen = pg * fs / 100 * gf, leak = cap * (1 - p.perm / 100), res = t1 - cap, op = res + s2;
  const lc = s2 + (sup.so * K.lc.so + sup.wi * K.lc.wi + sup.ot * K.lc.ot) / 1000;
  return { p, s1, fuel, t1, cp, cf: p.ccs ? K.capShare * p.cap / 100 : 0, cap, pg, eh, disp, base, el, sup, s2, pen, leak,
    store: cap - leak, res, op, net: op + leak, lc }; // net = operational + expected 100-yr storage loss (attributed to capture year)
}
const bau = p => ({ ...p, eff: 0, el: 0, so: P0.so, wi: P0.wi, ot: P0.ot, re: P0.re, ccs: false });
/* Explicit project-chain extension. calc() retains the document's plant-only reference.
   Utilization has no demonstrated durability: assume re-release within the horizon.
   Retention applies only to CO2 actually injected, never to transport losses or products. */
function chain(r, config) {
  const cfg = config || {}, transportLoss = r.cap * (cfg.transportLoss ?? 0) / 100;
  const transported = r.cap - transportLoss, utilized = transported * (cfg.utilShare ?? 0) / 100;
  const injected = transported - utilized, leak = injected * (1 - r.p.perm / 100), store = injected - leak;
  return { ...r, plantNet: r.net, plantStorageLoss: r.leak, transportLoss, transported,
    utilized, utilizationRelease: utilized, injected, leak, store,
    net: r.op + transportLoss + utilized + leak };
}
const ramp = (p, y) => cl((y - p.yr) / p.dur, [0, 1]);
function at(x, y, config) { const { p } = validate(x), u = ramp(p, y);
  const q = { ...p, eff: p.eff * u, el: p.el * u, so: P0.so + (p.so - P0.so) * u, wi: P0.wi + (p.wi - P0.wi) * u, ot: P0.ot + (p.ot - P0.ot) * u, ccs: p.ccs && u > 0, cap: p.cap * u };
  const r = calc(q); return { u, q: r.p, r: config ? chain(r, config) : r }; }

function fin(x) {
 if(!g.FinancialEngine)throw new Error('Load FinancialEngine before calculating finance');
 return g.FinancialEngine.finance(x,g.TEA_CONFIG);
}

/* Flow tables for the two Sankeys. Node = [column, label, colour]; link = [from, to, value]. Never mix units. */
function energyFlows(r) {
  const N = { coal: [0, 'Coal & coke', '#5a4638'], pgas: [0, 'Furnace gas', '#c9742a'], ngas: [0, 'Natural gas', '#e8742a'], sol: [0, 'Solar', '#f2b632'], win: [0, 'Wind', '#4aa3d8'], oth: [0, 'Other low-carbon', '#2a9d62'], fgr: [0, 'Fossil grid power', '#8a949d'],
    ele: [1, 'Purchased electricity', '#c9a227'], sin: [2, 'Coke & sinter', '#7f93a5'], bf: [2, 'Blast furnace', '#7f93a5'], sto: [2, 'Hot-blast stoves', '#7f93a5'], mil: [2, 'Steel shop (fuel)', '#7f93a5'],
    aux: [2, 'Base electric loads', '#7f93a5'], eht: [2, 'Electric heating', '#7f93a5'], ccs: [2, 'CCS capture & compression', '#0e8f93'] };
  return { N, unit: 'GWh', X: [190, 450, 690], L: [['coal', 'sin', r.fuel.sinter], ['coal', 'bf', r.fuel.bf], ['pgas', 'sto', r.fuel.stoves], ['ngas', 'mil', r.fuel.mill],
    ['sol', 'ele', r.sup.so], ['win', 'ele', r.sup.wi], ['oth', 'ele', r.sup.ot], ['fgr', 'ele', r.sup.fo], ['ele', 'aux', r.base], ['ele', 'eht', r.eh], ['ele', 'ccs', r.pg]] };
}
function carbonFlows(r) {
  const N = { coal: [0, 'Coal & coke carbon', '#5a4638'], pgas: [0, 'Furnace-gas combustion', '#c9742a'], ngas: [0, 'Natural gas & fuel', '#e8742a'], fgr: [0, 'Fossil grid generation', '#8a949d'],
    sin: [1, 'Coke & sinter', '#7f93a5'], bf: [1, 'Blast furnace', '#7f93a5'], sto: [1, 'Hot-blast stoves', '#7f93a5'], mil: [1, 'Steel shop & rolling', '#7f93a5'], ele: [1, 'Electricity use (Scope 2)', '#c9a227'],
    atm: [2, 'Plant release', '#e0583a'], cap: [2, 'Captured CO₂', '#0e8f93'], stg: [3, 'Retained (100 y)', '#2a9d62'], lost: [3, 'Chain release + 100y loss', '#d64545'] }, c = r.cf, s = r.s1;
  return { N, unit: 'Mt', X: [170, 400, 620, 800], L: [['coal', 'sin', s.sinter], ['coal', 'bf', s.bf], ['pgas', 'sto', s.stoves], ['ngas', 'mil', s.mill], ['fgr', 'ele', r.s2],
    ['sin', 'atm', s.sinter * (1 - c)], ['bf', 'atm', s.bf * (1 - c)], ['sto', 'atm', s.stoves * (1 - c)], ['mil', 'atm', s.mill], ['ele', 'atm', r.s2],
    ['sin', 'cap', s.sinter * c], ['bf', 'cap', s.bf * c], ['sto', 'cap', s.stoves * c], ['cap', 'stg', r.store],
    ['cap', 'lost', r.leak + (r.transportLoss || 0) + (r.utilizationRelease || 0)]] };
}
function imbalance(L) { const m = {}; L.forEach(([a, b, v]) => { (m[a] = m[a] || { i: 0, o: 0 }).o += v; (m[b] = m[b] || { i: 0, o: 0 }).i += v; });
  return Math.max(0, ...Object.values(m).filter(n => n.i && n.o).map(n => Math.abs(n.i - n.o))); }
const checks = r => ({ energy_GWh: imbalance(energyFlows(r).L), carbon_Mt: imbalance(carbonFlows(r).L),
  supply_vs_demand_GWh: Math.abs(r.sup.so + r.sup.wi + r.sup.ot + r.sup.fo - r.el) });

/* Controlled tool interface for any LLM: validated inputs in, structured numbers out. */
const MAP = { solar_share: 'so', wind_share: 'wi', other_lowcarbon_share: 'ot', electrification_rate: 'el', efficiency_improvement: 'eff', ccs_enabled: 'ccs',
  capture_rate: 'cap', carbon_price: 'cp', subsidy_rate: 'sub', adoption_start_year: 'yr', ramp_years: 'dur', storage_retention: 'perm',
  capture_energy_penalty: 'pen', fossil_emission_factor: 'ef', electricity_demand_gwh: 'ed' };
// Keep analyst/tool outputs unrounded; presentation layers format numbers.
const n4 = v => v;
function runScenario(inp) {
  const y = +(inp.target_year ?? 2050); if (!Number.isInteger(y) || !(y >= 2025 && y <= 2050)) throw new Error('target_year must be an integer 2025-2050');
  const x = { ...P0, ...(inp.base || {}) }, w = [], ov = inp.overrides || {};
  // AI/tool inputs must not silently bypass slider constraints. UI imports are handled by validate().
  for (const k in ov) {
    if (!MAP[k]) throw new Error('Unsupported scenario parameter: ' + k);
    const target=MAP[k];
    if (target==='ccs') {if (typeof ov[k]!=='boolean') throw new Error(k+' must be boolean');}
    else {
      if (typeof ov[k]!=='number'||!Number.isFinite(ov[k])) throw new Error(k+' must be a finite number');
      const bounds=R[target];if (bounds && (ov[k]<bounds[0]||ov[k]>bounds[1]))throw new Error(k+' out of range: '+bounds.join('–'));
      if(['yr','dur'].includes(target)&&!Number.isInteger(ov[k]))throw new Error(k+' must be an integer');
    }
    x[target]=ov[k];
  }
  for(const [key,value] of Object.entries(x)){
    if(key==='re')continue;
    if(key==='ccs'){if(typeof value!=='boolean')throw new Error('ccs must be boolean');continue;}
    if(!R[key])throw new Error('Unsupported base parameter: '+key);
    if(typeof value!=='number'||!Number.isFinite(value)||value<R[key][0]||value>R[key][1])throw new Error(key+' invalid or out of range');
    if(['yr','dur'].includes(key)&&!Number.isInteger(value))throw new Error(key+' must be an integer');
  }
  if (x.so+x.wi+x.ot>100+1e-7) throw new Error('Electricity supply shares must total at most 100% (remainder is fossil)');
  const config = inp.finance || g.TEA_CONFIG;
  const v = validate(x), p = v.p, a = at(p, y, config), r = a.r, bn = calc(bau(p)).net,
    F = g.FinancialEngine ? g.FinancialEngine.finance(p, config) : fin(p), ck = checks(r);
  const cum = YRS.filter(t => t <= y).reduce((s, t) => s + bn - at(p, t, config).r.net, 0), tot = r.el || 1;
  return { scenario_name: inp.scenario_name || 'custom', year: y, deployment_fraction: n4(a.u), inputs: p,
    energy_mix: { demand_GWh: n4(r.el), supply_GWh: { solar: n4(r.sup.so), wind: n4(r.sup.wi), other_low_carbon: n4(r.sup.ot), fossil_grid: n4(r.sup.fo) },
      shares_pct: { solar: n4(r.sup.so / tot * 100), wind: n4(r.sup.wi / tot * 100), other_low_carbon: n4(r.sup.ot / tot * 100), fossil_grid: n4(r.sup.fo / tot * 100) } },
    scope1_gross_MtCO2e: n4(r.t1), scope1_released_MtCO2e: n4(r.res), scope2_scenario_MtCO2e: n4(r.s2), scope2_method: 'illustrative physical supply mix; not an audited location-based or market-based inventory', operational_total_MtCO2e: n4(r.op),
    expected_storage_loss_100y_MtCO2e: n4(r.leak), net_incl_storage_loss_MtCO2e: n4(r.net), captured_MtCO2e: n4(r.cap), retained_in_storage_MtCO2e: n4(r.store),
    capture_energy_CO2_MtCO2e: n4(r.pen), bau_net_MtCO2e: n4(bn), avoided_vs_bau_MtCO2e: n4(bn - r.net), cumulative_avoided_to_year_MtCO2e: n4(cum),
    transport_loss_MtCO2: r.transportLoss || 0, utilization_release_MtCO2: r.utilizationRelease || 0,
    intensity_tCO2_per_t_steel: n4(r.net / (K.steel * p.scale)), lifecycle_scope2_memo_MtCO2e: n4(r.lc),
    finance: { capex_MUSD: n4(F.capex), opex_MUSD_per_yr_final: n4(F.opex), npv_MUSD: n4(F.npv), irr: F.irr, usd_per_t_avoided: F.mac == null ? null : n4(F.mac), basis: `2025-2050 dated annual deployment/cashflows, ${config?.discount ?? 8}% discount, no terminal value or tax; illustrative costs`, finance_quality: F.finance_quality },
    net_zero_claim_allowed: false, net_zero_within_limited_boundary: r.net <= 0.01, model_id: 'industrial-carbon-twin-illustrative-v0.3', model_boundary: 'Illustrative BF-BOF plant, direct emissions + electricity-mix proxy + explicit CO2 chain and 100-year storage adjustment; no full Scope 3', checks: ck, warnings: [...v.w, ...w],
    assumptions: ['Illustrative physical supply-mix estimate: fossil share × fossil-generation emission factor; not a formal location-based or market-based Scope 2 inventory',
      'Electrification: 0.7 MWh electricity per MWh of displaced gas (illustrative)', 'Efficiency lowers energy use; 60% of Scope 1 treated as energy-related (illustrative)',
      'Storage loss = (1 - 100 y retention) of captured CO2, attributed to capture year', 'Excluded: Scope 3, CO2 transport/injection fuel, lifecycle emissions of equipment, hydrogen DRI',
      'Conditional scenario results, not forecasts'], data_quality: 'illustrative' };
}
g.CarbonEngine = { SRC, K, P0, R, YRS, validate, calc, chain, bau, at, fin, energyFlows, carbonFlows, checks, runScenario, MAP };
if (typeof module !== 'undefined') module.exports = g.CarbonEngine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
