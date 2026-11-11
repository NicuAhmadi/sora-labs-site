// Long-run trends for /city-signals/trends/: monthly series since July 2008,
// computed server-side by DataSF (SoQL aggregates over ~9M cases), so no raw
// records are downloaded.
//
// Output (trends.json):
//   { months: ["2008-07", ...],            complete months only
//     areas: ["Citywide", ...neighborhoods],
//     total:   { area: [n per month] },
//     close: { names: [time-to-close buckets + "Still open"], data: { area: { name: [n] } } },
//     categories: { names: [top 5 by last 12 months], data: { area: { name: [n] } } },
//     channels:   { names: [...],                     data: { area: { name: [n] } } } }
// Citywide includes cases with no neighborhood; neighborhoods do not.

const ENDPOINT = "https://data.sf.gov/resource/vw6y-z8j6.json";
const PAGE = 50000;

// DataSF "source" values grouped into how people actually reach 311.
const CHANNELS = [
  ["Mobile app", ["Mobile", "Mobile/Open311"]],
  ["Phone", ["Phone"]],
  ["Web", ["Web"]],
  ["City agencies and other", null], // everything else
];
const channelOf = (s) => (CHANNELS.find(([, v]) => v && v.includes(s)) || CHANNELS.at(-1))[0];

async function soql(params, attempt = 1) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const qs = new URLSearchParams({ ...params, $limit: String(PAGE), $offset: String(offset) });
    const headers = { Accept: "application/json" };
    if (process.env.SOCRATA_APP_TOKEN) headers["X-App-Token"] = process.env.SOCRATA_APP_TOKEN;
    let page;
    try {
      const res = await fetch(`${ENDPOINT}?${qs}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      page = await res.json();
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 5000 * attempt));
      return soql(params, attempt + 1);
    }
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

const monthKey = (iso) => iso.slice(0, 7);

// Time to close, in whole days (SoQL has no hour-level difference). The
// buckets partition every case, so they always sum to the month's total.
const DD = "date_diff_d(closed_date, requested_datetime)";
const CLOSE_BUCKETS = [
  ["Under 1 day", "d0", `closed_date IS NOT NULL AND ${DD} < 1`],
  ["1 to 6 days", "d1", `closed_date IS NOT NULL AND ${DD} >= 1 AND ${DD} < 7`],
  ["1 to 4 weeks", "d7", `closed_date IS NOT NULL AND ${DD} >= 7 AND ${DD} < 30`],
  ["1 to 3 months", "d30", `closed_date IS NOT NULL AND ${DD} >= 30 AND ${DD} < 90`],
  ["3 months or more", "d90", `closed_date IS NOT NULL AND ${DD} >= 90`],
  ["Still open", "open", "closed_date IS NULL"],
];

export async function fetchTrends({ asOf }) {
  // Only complete months: drop the month the data is currently in.
  const asOfMs = Date.parse(String(asOf).slice(0, 19) + "Z");
  const currentMonth = new Date(asOfMs).toISOString().slice(0, 7);

  const top = await soql({
    $select: "service_name, count(*) as n",
    $where: `requested_datetime >= '${new Date(Date.UTC(new Date(asOfMs).getUTCFullYear() - 1, new Date(asOfMs).getUTCMonth(), 1)).toISOString().slice(0, 19)}' AND requested_datetime < '${currentMonth}-01T00:00:00'`,
    $group: "service_name",
    $order: "n DESC",
  });
  const catNames = top.filter((r) => r.service_name).slice(0, 5).map((r) => r.service_name);
  const catIn = catNames.map((c) => `'${c.replace(/'/g, "''")}'`).join(",");

  const [totals, cats, sources] = await Promise.all([
    soql({
      $select: "date_trunc_ym(requested_datetime) as m, analysis_neighborhood as h, count(*) as n, " +
        CLOSE_BUCKETS.map(([, key, cond]) => `sum(case(${cond}, 1, true, 0)) as ${key}`).join(", "),
      $group: "m, h", $order: "m, h",
    }),
    soql({
      $select: "date_trunc_ym(requested_datetime) as m, analysis_neighborhood as h, service_name as c, count(*) as n",
      $where: `service_name in (${catIn})`, $group: "m, h, c", $order: "m, h, c",
    }),
    soql({
      $select: "date_trunc_ym(requested_datetime) as m, analysis_neighborhood as h, source as s, count(*) as n",
      $group: "m, h, s", $order: "m, h, s",
    }),
  ]);

  const months = [...new Set(totals.map((r) => monthKey(r.m)))].filter((m) => m < currentMonth).sort();
  const mi = new Map(months.map((m, i) => [m, i]));
  const hoods = [...new Set(totals.map((r) => r.h).filter(Boolean))].sort();
  const areas = ["Citywide", ...hoods];
  const zeros = () => new Array(months.length).fill(0);

  const total = {}, close = {};
  for (const a of areas) { total[a] = zeros(); close[a] = Object.fromEntries(CLOSE_BUCKETS.map(([n]) => [n, zeros()])); }
  for (const r of totals) {
    const i = mi.get(monthKey(r.m));
    if (i == null) continue;
    for (const a of r.h ? ["Citywide", r.h] : ["Citywide"]) {
      total[a][i] += +r.n;
      for (const [n, key] of CLOSE_BUCKETS) close[a][n][i] += +r[key];
    }
  }

  const breakdown = (rows, names, keyOf) => {
    const data = {};
    for (const a of areas) data[a] = Object.fromEntries(names.map((n) => [n, zeros()]));
    for (const r of rows) {
      const i = mi.get(monthKey(r.m));
      const k = keyOf(r);
      if (i == null || !names.includes(k)) continue;
      for (const a of r.h ? ["Citywide", r.h] : ["Citywide"]) data[a][k][i] += +r.n;
    }
    return { names, data };
  };

  return {
    months,
    areas,
    total,
    close: { names: CLOSE_BUCKETS.map(([n]) => n), data: close },
    categories: breakdown(cats, catNames, (r) => r.c),
    channels: breakdown(sources, CHANNELS.map(([n]) => n), (r) => channelOf(r.s)),
  };
}
