// Housing & neighborhood services data for /city-signals/housing/.
//
// Neighborhood-level aggregates only. No site names, addresses or coordinates
// are written to the output: sites MOHCD marks "Confidential" are dropped, and
// point data (tent counts) is only used to assign counts to neighborhoods.
//
// Sources (all DataSF open data; each keeps its own publication schedule, and
// its as-of date is carried into the output):
//   311 Cases                         vw6y-z8j6  last 12 complete months, by neighborhood
//   ACS population (2019-2023 5-yr)   4qbq-hvtt  residents per analysis neighborhood
//   Analysis Neighborhoods            j2bu-swwd  boundaries, for land area and point assignment
//   Registered Business Locations     g8m3-pdis  active business locations (commercial activity)
//   MOHCD Affordable Housing          pyxv-n29e  homeless-designated affordable units, by completion date
//   Tents, structures, vehicles       w9ip-yrij  quarterly visual count
//   Street & Sidewalk Standards FY26  8kn2-p6vj  Controller's inspections: sidewalk litter rating
// HSH's Housing Inventory and Shelter Inventory are only published as
// dashboards (no open data), so they are linked on the page, not integrated.

const BASE = "https://data.sf.gov/resource";
const PAGE = 50000;

async function soql(id, params, attempt = 1) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const qs = new URLSearchParams({ ...params, $limit: String(PAGE), $offset: String(offset) });
    const headers = { Accept: "application/json" };
    if (process.env.SOCRATA_APP_TOKEN) headers["X-App-Token"] = process.env.SOCRATA_APP_TOKEN;
    let page;
    try {
      const res = await fetch(`${BASE}/${id}.json?${qs}`, { headers });
      if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
      page = await res.json();
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 4000 * attempt));
      return soql(id, params, attempt + 1);
    }
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}
async function updatedAt(id) {
  try { const v = await (await fetch(`https://data.sf.gov/api/views/${id}.json`)).json(); return v.rowsUpdatedAt ? new Date(v.rowsUpdatedAt * 1000).toISOString() : null; } catch { return null; }
}

// --- geometry: planar approximation, fine at city scale
const LAT0 = 37.76, KX = 111.32 * Math.cos((LAT0 * Math.PI) / 180), KY = 110.57;
function ringArea(ring) { let a = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] * KX) * (ring[i][1] * KY) - (ring[i][0] * KX) * (ring[j][1] * KY); return Math.abs(a) / 2; }
function polyArea(mp) { return mp.reduce((s, poly) => s + ringArea(poly[0]) - poly.slice(1).reduce((h, r) => h + ringArea(r), 0), 0); }
function inRing([x, y], ring) { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }
const inMulti = (pt, mp) => mp.some((poly) => inRing(pt, poly[0]) && !poly.slice(1).some((h) => inRing(pt, h)));

export async function fetchHousing({ asOf, records = [] }) {
  const asOfMs = Date.parse(String(asOf).slice(0, 19) + "Z");
  const cur = new Date(asOfMs), end = `${cur.toISOString().slice(0, 7)}-01T00:00:00`;
  const start = new Date(Date.UTC(cur.getUTCFullYear() - 1, cur.getUTCMonth(), 1)).toISOString().slice(0, 19);
  const DD = "date_diff_d(closed_date, requested_datetime)";
  const agedCut = new Date(asOfMs - 7 * 864e5).toISOString().slice(0, 19);

  const [polys, acs, biz, mohcd, tents, litter, r311] = await Promise.all([
    soql("j2bu-swwd", { $select: "nhood, the_geom" }),
    soql("4qbq-hvtt", { $select: "geography_name, estimate, start_year, end_year", $where: "geography='neighborhood' AND demographic_category='all'" }),
    soql("g8m3-pdis", { $select: "neighborhoods_analysis_boundaries as h, count(*) as n", $where: "location_end_date IS NULL AND administratively_closed IS NULL AND neighborhoods_analysis_boundaries IS NOT NULL", $group: "h" }),
    soql("pyxv-n29e", { $select: "city_analysis_marketing as h, project_status, estimated_actual_construction as d, homeless_units_rollup as hu, income_restricted_resid_units as au" }),
    soql("w9ip-yrij", { $select: "observed_month, latitude, longitude, tents, structures, passenger_vehicles, other_vehicles" }),
    soql("8kn2-p6vj", { $select: "analysis_neighborhoods as h, select_the_statement_that_1 as sidewalk, evaluation_period" }),
    soql("vw6y-z8j6", {
      $select: `analysis_neighborhood as h, case(service_name = 'Street and Sidewalk Cleaning', 'clean', service_name = 'Encampment', 'enc', true, 'other') as k, count(*) as n, ` +
        `sum(case(closed_date IS NOT NULL AND ${DD} < 1, 1, true, 0)) as d0, sum(case(closed_date IS NULL, 1, true, 0)) as open, ` +
        `sum(case(closed_date IS NOT NULL, 1, true, 0)) as closed, sum(case(closed_date IS NOT NULL AND ${DD} >= 7, 1, true, 0)) as closed_slow, ` +
        `sum(case(closed_date IS NULL AND requested_datetime < '${agedCut}', 1, true, 0)) as open_aged`,
      $where: `requested_datetime >= '${start}' AND requested_datetime < '${end}'`,
      $group: "h, k",
    }),
  ]);

  const names = polys.map((p) => p.nhood).filter((n) => n && n !== "The Farallones").sort();
  const known = new Set(names);
  const H = Object.fromEntries(names.map((n) => [n, { name: n }]));
  const unmatched = new Set();
  const get = (n) => { if (H[n]) return H[n]; if (n) unmatched.add(n); return null; };

  // Land area
  for (const p of polys) { const h = get(p.nhood); if (h && p.the_geom) h.area_km2 = +polyArea(p.the_geom.type === "Polygon" ? [p.the_geom.coordinates] : p.the_geom.coordinates).toFixed(3); }

  // Population: latest ACS 5-year release
  const acsEnd = Math.max(...acs.map((r) => +r.end_year));
  const acsStart = acs.find((r) => +r.end_year === acsEnd)?.start_year;
  for (const r of acs) if (+r.end_year === acsEnd) { const h = get(r.geography_name); if (h) h.population = Math.round(+r.estimate); }

  // Active business locations
  for (const r of biz) { const h = get(r.h); if (h) h.businesses = +r.n; }

  // MOHCD homeless-designated units (complete vs under rehabilitation); confidential sites excluded.
  const year0 = 2000, yearNow = cur.getUTCFullYear();
  const years = Array.from({ length: yearNow - year0 + 1 }, (_, i) => year0 + i);
  const unitsByYear = { Citywide: years.map(() => 0) };
  const openings = {};
  let confidentialSkipped = 0;
  for (const r of mohcd) {
    if (!r.h || r.h === "Confidential") { confidentialSkipped++; continue; }
    const h = get(r.h); if (!h) continue;
    const hu = +r.hu || 0, au = +r.au || 0, done = r.project_status === "Construction Complete";
    h.homeless_units = (h.homeless_units || 0) + (done ? hu : 0);
    h.affordable_units = (h.affordable_units || 0) + (done ? au : 0);
    h.homeless_units_in_progress = (h.homeless_units_in_progress || 0) + (done ? 0 : hu);
    if (done && hu > 0 && r.d) {
      const y = +r.d.slice(0, 4), m = r.d.slice(0, 7);
      if (y >= year0) { (unitsByYear[h.name] ||= years.map(() => 0))[y - year0] += hu; unitsByYear.Citywide[y - year0] += hu; }
      (openings[h.name] ||= {}); openings[h.name][m] = (openings[h.name][m] || 0) + hu;
    }
  }

  // Tents etc.: assign each observation point to a neighborhood, sum by quarter.
  const geoms = polys.filter((p) => known.has(p.nhood) && p.the_geom).map((p) => ({ n: p.nhood, g: p.the_geom.type === "Polygon" ? [p.the_geom.coordinates] : p.the_geom.coordinates }));
  const quarters = [...new Set(tents.map((r) => r.observed_month.slice(0, 7)))].sort();
  const qi = new Map(quarters.map((q, i) => [q, i]));
  const KINDS = ["tents", "structures", "passenger_vehicles", "other_vehicles"];
  const tentSeries = {};
  const blank = () => Object.fromEntries(KINDS.map((k) => [k, quarters.map(() => 0)]));
  tentSeries.Citywide = blank();
  let unplaced = 0;
  for (const r of tents) {
    const i = qi.get(r.observed_month.slice(0, 7)); const pt = [+r.longitude, +r.latitude];
    const g = Number.isFinite(pt[0]) ? geoms.find((x) => inMulti(pt, x.g)) : null;
    for (const k of KINDS) tentSeries.Citywide[k][i] += +r[k] || 0;
    if (!g) { unplaced++; continue; }
    tentSeries[g.n] ||= blank();
    for (const k of KINDS) tentSeries[g.n][k][i] += +r[k] || 0;
  }
  for (const n of names) { const s = tentSeries[n]; H[n].tents_latest = s ? Object.fromEntries(KINDS.map((k) => [k, s[k].at(-1)])) : Object.fromEntries(KINDS.map((k) => [k, 0])); }

  // Controller's sidewalk litter rating (1 none .. 5 heavy). A route listing several
  // neighborhoods counts toward each of them.
  const litterAcc = {};
  const cityL = { sum: 0, sq: 0, n: 0, heavy: 0 };
  let period = null;
  for (const r of litter) {
    const v = +r.sidewalk; if (!(v >= 1 && v <= 5) || !r.h) continue;
    period ||= r.evaluation_period;
    cityL.sum += v; cityL.sq += v * v; cityL.n++; if (v >= 4) cityL.heavy++;
    const parts = r.h.split(/,\s*(?=\d+\s*-\s*)|,\s*/).map((s) => s.replace(/^\d+\s*-\s*/, "").trim()).filter(Boolean);
    for (const p of parts) { const h = get(p); if (!h) continue; const a = (litterAcc[p] ||= { sum: 0, sq: 0, n: 0, heavy: 0 }); a.sum += v; a.sq += v * v; a.n++; if (v >= 4) a.heavy++; }
  }
  // Mean rating with a 95% margin of error (normal approximation).
  const litterStat = (a) => { const mean = a.sum / a.n, sd = a.n > 1 ? Math.sqrt(Math.max(0, (a.sq - a.n * mean * mean) / (a.n - 1))) : null; return { avg: +mean.toFixed(2), n: a.n, moe: sd == null ? null : +(1.96 * sd / Math.sqrt(a.n)).toFixed(2), heavy_share: +(a.heavy / a.n).toFixed(3) }; };
  for (const [n, a] of Object.entries(litterAcc)) H[n].litter = litterStat(a);

  // 311, last 12 complete months
  const F311 = ["n", "d0", "open", "closed", "closed_slow", "open_aged"];
  const blank311 = () => Object.fromEntries(["all", "clean", "enc"].map((k) => [k, Object.fromEntries(F311.map((f) => [f, 0]))]));
  const city311 = blank311();
  for (const n of names) H[n].r311 = blank311();
  for (const r of r311) {
    const targets = [city311]; if (r.h && H[r.h]) targets.push(H[r.h].r311);
    for (const t of targets) for (const key of ["all", r.k === "other" ? null : r.k].filter(Boolean)) for (const f of F311) t[key][f] += +r[f];
  }

  const citywide = {
    name: "Citywide",
    population: names.reduce((s, n) => s + (H[n].population || 0), 0),
    area_km2: +names.reduce((s, n) => s + (H[n].area_km2 || 0), 0).toFixed(2),
    businesses: names.reduce((s, n) => s + (H[n].businesses || 0), 0),
    homeless_units: names.reduce((s, n) => s + (H[n].homeless_units || 0), 0),
    affordable_units: names.reduce((s, n) => s + (H[n].affordable_units || 0), 0),
    homeless_units_in_progress: names.reduce((s, n) => s + (H[n].homeless_units_in_progress || 0), 0),
    tents_latest: Object.fromEntries(KINDS.map((k) => [k, tentSeries.Citywide[k].at(-1)])),
    r311: city311,
  };
  // Median hours to close, from exact timestamps in the 90-day snapshot.
  const med = (a) => { if (!a.length) return null; a.sort((x, y) => x - y); const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  const durs = {};
  let medFrom = null, medTo = null;
  for (const r of records) {
    const k = r.service_name === "Street and Sidewalk Cleaning" ? "clean" : r.service_name === "Encampment" ? "enc" : null;
    if (!k || !r.closed_date) continue;
    const hrs = (Date.parse(r.closed_date.slice(0, 19) + "Z") - Date.parse(r.requested_datetime.slice(0, 19) + "Z")) / 36e5;
    if (!(hrs >= 0)) continue;
    const d = r.requested_datetime.slice(0, 10); if (!medFrom || d < medFrom) medFrom = d; if (!medTo || d > medTo) medTo = d;
    for (const a of ["Citywide", H[r.analysis_neighborhood] ? r.analysis_neighborhood : null].filter(Boolean)) ((durs[a] ||= { clean: [], enc: [] })[k]).push(hrs);
  }
  const medOf = (a) => (a && a.length ? { hours: +med(a).toFixed(1), n: a.length } : null);
  for (const n of names) H[n].median_close = { clean: medOf(durs[n]?.clean), enc: medOf(durs[n]?.enc) };
  citywide.median_close = { clean: medOf(durs.Citywide?.clean), enc: medOf(durs.Citywide?.enc) };

  const [u311, uAcs, uBiz, uMohcd, uTents, uLitter] = await Promise.all(["vw6y-z8j6", "4qbq-hvtt", "g8m3-pdis", "pyxv-n29e", "w9ip-yrij", "8kn2-p6vj"].map(updatedAt));
  const ds = (id) => `https://data.sf.gov/d/${id}`;
  return {
    window_311: { from: start.slice(0, 7), to: new Date(Date.parse(end + "Z") - 864e5).toISOString().slice(0, 7) },
    acs_years: `${Math.round(+acsStart)} to ${acsEnd}`,
    litter_period: period,
    tents_latest_quarter: quarters.at(-1),
    sources: [
      { key: "311", name: "311 Cases", url: ds("vw6y-z8j6"), updated: u311, schedule: "Daily (this page refreshes every 6 hours)" },
      { key: "acs", name: `Population: American Community Survey ${Math.round(+acsStart)} to ${acsEnd}`, url: ds("4qbq-hvtt"), updated: uAcs, schedule: "Yearly" },
      { key: "mohcd", name: "MOHCD Affordable Housing Portfolio", url: ds("pyxv-n29e"), updated: uMohcd, schedule: "Periodic" },
      { key: "tents", name: "Quarterly count of tents, structures, and lived-in vehicles", url: ds("w9ip-yrij"), updated: uTents, schedule: "Quarterly" },
      { key: "litter", name: `Street & Sidewalk Maintenance Standards (${period || "FY26"})`, url: ds("8kn2-p6vj"), updated: uLitter, schedule: "Ongoing inspections, one file per fiscal year" },
      { key: "biz", name: "Registered Business Locations", url: ds("g8m3-pdis"), updated: uBiz, schedule: "Daily" },
    ],
    citywide: { ...citywide, litter: cityL.n ? litterStat(cityL) : null },
    median_window: medFrom ? { from: medFrom, to: medTo } : null,
    litter_coverage: { inspected: Object.keys(litterAcc).length, total: names.length },
    hoods: names.map((n) => H[n]),
    units_by_year: { years, data: unitsByYear },
    openings,
    tents: { quarters, kinds: KINDS, data: tentSeries },
    notes: { confidential_sites_excluded: confidentialSkipped, tent_points_outside_neighborhoods: unplaced, unmatched_names: [...unmatched] },
  };
}
