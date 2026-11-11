// City Signals snapshot: pulls the last 90 days of SF 311 cases from DataSF
// and writes compact 7 / 30 / 90-day files the /city-signals/ page reads.
//
// Runs in .github/workflows/deploy.yml after the Eleventy build (every push
// and every 6 hours), writing straight into _site/ so the data is deployed
// but never committed to git.
//
//   node scripts/city-signals-snapshot.mjs [outDir]   (default _site/city-signals/data)
//
// Optional env: SOCRATA_APP_TOKEN raises DataSF's rate limit.
//
// Also writes insights.json (city-signals-insights.mjs, the /this-week/ page)
// trends.json (city-signals-trends.mjs, the /trends/ page) and housing.json
// (city-signals-housing.mjs, the /housing/ page).
//
// File format (one per window, self-contained):
//   { v, generated_at, source_as_of, since, days, count, base,
//     dict: { svc, sub, street, hood },
//     rows: [[id, reqMin, closedMin|null, open(1/0), svcIdx, subIdx, streetIdx, hoodIdx, latE5|null, lonE5|null], ...] }
// reqMin / closedMin are minutes after `base` (a floating SF-local timestamp,
// same convention as the source). lat/lon are (value - origin) * 1e5 with
// origin 37 / -123. Rows are newest first.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { computeInsights } from "./city-signals-insights.mjs";
import { fetchTrends } from "./city-signals-trends.mjs";
import { fetchHousing } from "./city-signals-housing.mjs";

const ENDPOINT = "https://data.sf.gov/resource/vw6y-z8j6.json";
const PAGE = 50000;
const WINDOWS = [7, 30, 90];
const MAX_DAYS = Math.max(...WINDOWS);
const outDir = process.argv[2] || "_site/city-signals/data";
const FIELDS = "service_request_id,requested_datetime,closed_date,status_description,service_name,service_subtype,street,analysis_neighborhood,lat,long,data_as_of";

// SF-local calendar date (YYYY-MM-DD), `daysAgo` days before today.
function sfDate(daysAgo = 0) {
  const d = new Date(Date.now() - daysAgo * 864e5);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// Source timestamps are floating SF-local strings; treat them as UTC
// consistently so arithmetic is exact and the client can round-trip them.
const toMin = (s) => (s ? Math.round(Date.parse(s.slice(0, 19) + "Z") / 6e4) : null);

async function getPage(since, offset, attempt = 1) {
  const params = new URLSearchParams({
    $select: FIELDS,
    $where: `requested_datetime >= '${since}T00:00:00'`,
    $order: "requested_datetime DESC, service_request_id DESC",
    $limit: String(PAGE),
    $offset: String(offset),
  });
  const headers = { Accept: "application/json" };
  if (process.env.SOCRATA_APP_TOKEN) headers["X-App-Token"] = process.env.SOCRATA_APP_TOKEN;
  try {
    const res = await fetch(`${ENDPOINT}?${params}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error("unexpected response");
    return rows;
  } catch (e) {
    if (attempt >= 4) throw e;
    console.warn(`page @${offset} failed (${e.message}), retry ${attempt}`);
    await new Promise((r) => setTimeout(r, 5000 * attempt));
    return getPage(since, offset, attempt + 1);
  }
}

function encode(records, days, since, meta) {
  const dicts = { svc: new Map(), sub: new Map(), street: new Map(), hood: new Map() };
  const idx = (name, v) => {
    if (!v) return -1;
    const m = dicts[name];
    if (!m.has(v)) m.set(v, m.size);
    return m.get(v);
  };
  const base = toMin(`${since}T00:00:00`);
  const coord = (v, origin) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n !== 0 ? Math.round((n - origin) * 1e5) : null;
  };
  const rows = records.map((r) => {
    const req = toMin(r.requested_datetime);
    const closed = toMin(r.closed_date);
    return [
      Number(r.service_request_id) || r.service_request_id || null,
      req - base,
      closed == null ? null : closed - base,
      String(r.status_description || "").toLowerCase().startsWith("clos") ? 0 : 1,
      idx("svc", r.service_name),
      idx("sub", r.service_subtype),
      idx("street", r.street),
      idx("hood", r.analysis_neighborhood),
      coord(r.lat, 37),
      coord(r.long, -123),
    ];
  });
  const dict = Object.fromEntries(Object.entries(dicts).map(([k, m]) => [k, [...m.keys()]]));
  return { v: 1, ...meta, since, days, count: rows.length, base: `${since}T00:00:00`, dict, rows };
}

async function main() {
  const t0 = Date.now();
  const since = sfDate(MAX_DAYS);
  const all = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await getPage(since, offset);
    all.push(...page);
    console.log(`fetched ${all.length} rows`);
    if (page.length < PAGE) break;
  }
  if (!all.length) throw new Error("DataSF returned no rows; refusing to publish an empty snapshot");

  const meta = {
    generated_at: new Date().toISOString(),
    source_as_of: all.reduce((m, r) => (r.data_as_of && r.data_as_of > m ? r.data_as_of : m), ""),
  };
  await mkdir(outDir, { recursive: true });
  for (const days of WINDOWS) {
    const s = sfDate(days);
    const subset = days === MAX_DAYS ? all : all.filter((r) => String(r.requested_datetime) >= `${s}T00:00:00`);
    const json = JSON.stringify(encode(subset, days, s, meta));
    await writeFile(join(outDir, `${days}.json`), json);
    console.log(`${days}.json: ${subset.length} rows, ${(json.length / 1e6).toFixed(1)} MB`);
  }
  const insights = computeInsights(all, { asOf: meta.source_as_of });
  await writeFile(join(outDir, "insights.json"), JSON.stringify({ v: 1, generated_at: meta.generated_at, ...insights }));
  console.log(`insights.json: ${insights.insights.map((i) => `${i.key}=${i.status}`).join(", ")}`);
  // Trends and housing pull from several datasets; each fails on its own so
  // one outage does not block the other files.
  await Promise.all([
    fetchTrends({ asOf: meta.source_as_of }).then(async (trends) => {
      const json = JSON.stringify({ v: 1, ...meta, ...trends });
      await writeFile(join(outDir, "trends.json"), json);
      console.log(`trends.json: ${trends.months[0]} to ${trends.months.at(-1)}, ${trends.areas.length} areas, ${(json.length / 1e3).toFixed(0)} KB`);
    }).catch((e) => console.error(`trends.json failed: ${e.message}`)),
    fetchHousing({ asOf: meta.source_as_of, records: all }).then(async (housing) => {
      const json = JSON.stringify({ v: 1, ...meta, ...housing });
      await writeFile(join(outDir, "housing.json"), json);
      console.log(`housing.json: ${housing.hoods.length} neighborhoods, ${(json.length / 1e3).toFixed(0)} KB`, JSON.stringify(housing.notes));
    }).catch((e) => console.error(`housing.json failed: ${e.message}`)),
  ]);
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error(`City Signals snapshot failed: ${e.message}`);
  process.exit(1);
});
