// City Signals analyst: turns 90 days of SF 311 cases into a per-neighborhood
// operations brief.
//
// Two layers, kept apart on purpose:
//   1. Findings (this file, deterministic). Every number and every case ID in
//      a finding is computed here from the records. These are OBSERVATIONS.
//   2. Interpretation (Claude, optional). If ANTHROPIC_API_KEY is set, Claude
//      reads the findings and writes why each matters, a hypothesis for each,
//      and what to investigate tomorrow. It never sees raw records and is told
//      not to introduce numbers that are not in the findings.
// Without a key the brief still publishes, with the findings and a ranked
// investigate list, and marks the interpretation layer as unavailable.

import Anthropic from "@anthropic-ai/sdk";

const DAY = 864e5;
const MODEL = "claude-opus-5-5";
const CASE_URL = (id) => `https://mobile311.sfgov.org/tickets/${id}`;

// Floating SF-local timestamps, treated as UTC consistently (same as the snapshot).
const ms = (s) => (s ? Date.parse(String(s).slice(0, 19) + "Z") : NaN);
const dayOf = (s) => Math.floor(ms(s) / DAY);
const dayStr = (d) => new Date(d * DAY).toISOString().slice(0, 10);
const fmtDay = (d) => new Date(d * DAY).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fmtHours = (h) => (h < 48 ? `${h.toFixed(1)} hours` : `${(h / 24).toFixed(1)} days`);
const label = (r) => `${r.service_name || "Uncategorized"}${r.service_subtype ? ` / ${r.service_subtype.replace(/_/g, " ")}` : ""}`;
const pct = (x) => `${Math.round(x * 100)}%`;
const isOpen = (r) => !String(r.status_description || "").toLowerCase().startsWith("clos");

function topCounts(rows, key, n) {
  const m = new Map();
  for (const r of rows) {
    const k = key(r);
    if (k) m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
}
const newestIds = (rows, n = 12) =>
  [...rows].sort((a, b) => ms(b.requested_datetime) - ms(a.requested_datetime)).slice(0, n).map((r) => String(r.service_request_id));

// ---------------------------------------------------------------- findings

function emerging(rows, p, scale) {
  const minN = scale === "city" ? 40 : 8;
  const groups = new Map();
  for (const r of rows) {
    const d = dayOf(r.requested_datetime);
    if (d < p.baseStart || d > p.end) continue;
    const k = label(r);
    if (!groups.has(k)) groups.set(k, { week: [], weeks: [0, 0, 0, 0] });
    const g = groups.get(k);
    if (d >= p.weekStart) g.week.push(r);
    else g.weeks[Math.floor((p.weekStart - 1 - d) / 7)]++;
  }
  const out = [];
  for (const [k, g] of groups) {
    const cur = g.week.length;
    const avg = g.weeks.reduce((a, b) => a + b, 0) / 4;
    const maxPrior = Math.max(...g.weeks);
    const z = (cur - avg) / Math.sqrt(avg + 1);
    if (cur < minN || cur < 1.5 * avg || cur <= maxPrior || z < 2) continue;
    const streets = topCounts(g.week, (r) => r.street, 3);
    const lead = streets[0];
    const concentration = lead ? lead[1] / cur : 0;
    out.push({
      type: "emerging",
      score: z,
      title: `${k} is up sharply this week`,
      observation:
        `${cur} reports in ${fmtDay(p.weekStart)} to ${fmtDay(p.end)}, against a weekly average of ${avg.toFixed(1)} over the prior four weeks ` +
        `(highest prior week: ${maxPrior}). ` +
        (lead ? `${lead[1]} of the ${cur} (${pct(concentration)}) were on ${lead[0]}.` : ""),
      metrics: { this_week: cur, prior_weekly_avg: +avg.toFixed(1), prior_weeks: [...g.weeks].reverse(), top_streets: streets, open_now: g.week.filter(isOpen).length },
      cases: newestIds(g.week),
      case_total: cur,
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}

// A recurrence is a new report at the same address and of the same type, filed
// within 14 days after an earlier report there was closed.
function recurrence(rows, p, scale) {
  const minN = scale === "city" ? 6 : 3;
  const byAddr = new Map();
  for (const r of rows) {
    // "INTERSECTION <street>" names no single place, so it cannot recur "at the same address".
    if (!r.address || !r.street || /^INTERSECTION\b/i.test(r.address)) continue;
    const k = `${r.address.toUpperCase().trim()}|${label(r)}`;
    if (!byAddr.has(k)) byAddr.set(k, []);
    byAddr.get(k).push(r);
  }
  const byStreet = new Map();
  for (const list of byAddr.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => ms(a.requested_datetime) - ms(b.requested_datetime));
    const events = [];
    for (let i = 1; i < list.length; i++) {
      const t = ms(list[i].requested_datetime);
      let lastClosed = -Infinity, prev = null;
      for (let j = 0; j < i; j++) {
        const c = ms(list[j].closed_date);
        if (c < t && c > lastClosed) { lastClosed = c; prev = list[j]; }
      }
      if (prev && t - lastClosed <= 14 * DAY) events.push({ prev, next: list[i], gapDays: (t - lastClosed) / DAY });
    }
    if (!events.length) continue;
    const sk = `${list[0].street}|${label(list[0])}`;
    if (!byStreet.has(sk)) byStreet.set(sk, { street: list[0].street, type: label(list[0]), events: [], addresses: new Map(), all: [] });
    const s = byStreet.get(sk);
    s.events.push(...events);
    s.all.push(...list);
    const addr = list[0].address.split(",")[0].trim();
    s.addresses.set(addr, (s.addresses.get(addr) || 0) + events.length);
  }
  const out = [];
  for (const s of byStreet.values()) {
    const n = s.events.length;
    if (n < minN) continue;
    if (!s.events.some((e) => dayOf(e.next.requested_datetime) > p.end - 30)) continue;
    const gaps = s.events.map((e) => e.gapDays).sort((a, b) => a - b);
    const medGap = gaps[Math.floor(gaps.length / 2)];
    const addrs = [...s.addresses].sort((a, b) => b[1] - a[1]);
    // Rank by concentration at the worst addresses, not street length.
    const score = addrs.slice(0, 3).reduce((a, [, c]) => a + c, 0);
    const ids = new Set();
    for (const e of [...s.events].sort((a, b) => ms(b.next.requested_datetime) - ms(a.next.requested_datetime))) {
      ids.add(String(e.next.service_request_id));
      ids.add(String(e.prev.service_request_id));
      if (ids.size >= 12) break;
    }
    out.push({
      type: "recurrence",
      score,
      kind: s.type,
      title: `${s.street}: ${s.type} keeps coming back after closure`,
      observation:
        `${n} times in the last 90 days, a new ${s.type} report was filed at the same address on ${s.street} within 14 days of an earlier one there being closed ` +
        `(median gap ${medGap.toFixed(1)} days, across ${addrs.length} address${addrs.length > 1 ? "es" : ""}). ` +
        `Most affected: ${addrs.slice(0, 3).map(([a, c]) => `${a} (${c})`).join(", ")}. ${s.all.filter(isOpen).length} of these ${s.all.length} reports are open now.`,
      metrics: { recurrences: n, median_gap_days: +medGap.toFixed(1), addresses: addrs.slice(0, 5), reports_total: s.all.length, open_now: s.all.filter(isOpen).length },
      cases: [...ids],
      case_total: s.all.length,
    });
  }
  // One finding per problem type, so the brief is not three streets of the same thing.
  const seenKinds = new Set();
  return out.sort((a, b) => b.score - a.score).filter((f) => !seenKinds.has(f.kind) && seenKinds.add(f.kind)).slice(0, 3)
    .map(({ kind, ...f }) => f);
}

// Response time without the open-case bias: the target T is the prior period's
// median time to close (open cases counted as "not yet"). For recent cases old
// enough to have had T hours, what share were closed within T?
function responseTimes(rows, p, scale, asOfMs) {
  const minBase = scale === "city" ? 100 : 30;
  const minRecent = scale === "city" ? 50 : 15;
  const cats = new Map();
  for (const r of rows) {
    const k = r.service_name || "Uncategorized";
    if (!cats.has(k)) cats.set(k, []);
    cats.get(k).push(r);
  }
  const dur = (r) => (r.closed_date ? (ms(r.closed_date) - ms(r.requested_datetime)) / 36e5 : Infinity);
  const out = [];
  for (const [k, list] of cats) {
    const base = list.filter((r) => { const d = dayOf(r.requested_datetime); return d >= p.end - 56 && d <= p.end - 15; });
    if (base.length < minBase) continue;
    const bd = base.map(dur).sort((a, b) => a - b);
    const T = bd[Math.floor(bd.length / 2)];
    if (!Number.isFinite(T) || T <= 0 || T > 240) continue;
    const baseShare = bd.filter((h) => h <= T).length / bd.length;
    const recent = list.filter((r) => dayOf(r.requested_datetime) >= p.end - 13 && (asOfMs - ms(r.requested_datetime)) / 36e5 >= T);
    if (recent.length < minRecent) continue;
    const late = recent.filter((r) => dur(r) > T);
    const recentShare = 1 - late.length / recent.length;
    const drop = baseShare - recentShare;
    if (drop < 0.15) continue;
    const stillOpen = recent.filter(isOpen);
    const ids = [...stillOpen.sort((a, b) => ms(a.requested_datetime) - ms(b.requested_datetime)), ...late.filter((r) => !isOpen(r))]
      .slice(0, 12).map((r) => String(r.service_request_id));
    out.push({
      type: "response_time",
      score: drop * 100,
      title: `${k} cases are closing more slowly`,
      observation:
        `${pct(recentShare)} of ${recent.length} ${k} cases opened ${fmtDay(p.end - 13)} to ${fmtDay(p.end)} (and at least ${fmtHours(T)} old) were closed within ${fmtHours(T)}, ` +
        `the prior period's median. For cases opened ${fmtDay(p.end - 56)} to ${fmtDay(p.end - 15)} it was ${pct(baseShare)}. ` +
        `${stillOpen.length} of the recent cases are still open.`,
      metrics: { target_hours: +T.toFixed(1), recent_share_within_target: +recentShare.toFixed(3), prior_share_within_target: +baseShare.toFixed(3), recent_cases: recent.length, still_open: stillOpen.length },
      cases: ids,
      case_total: late.length,
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}

export function analyze(records, { asOf }) {
  let end = -Infinity;
  for (const r of records) { const d = dayOf(r.requested_datetime); if (d > end) end = d; }
  const p = { end, weekStart: end - 6, baseStart: end - 34 };
  const asOfMs = ms(asOf) || (end + 1) * DAY;
  const areas = new Map([["Citywide", records]]);
  for (const r of records) {
    const h = r.analysis_neighborhood;
    if (!h) continue;
    if (!areas.has(h)) areas.set(h, []);
    areas.get(h).push(r);
  }
  const result = {};
  for (const [name, rows] of areas) {
    const scale = name === "Citywide" ? "city" : "hood";
    const findings = [
      ...emerging(rows, p, scale),
      ...recurrence(rows, p, scale),
      ...responseTimes(rows, p, scale, asOfMs),
    ];
    const prefix = { emerging: "E", recurrence: "R", response_time: "S" };
    const seen = {};
    for (const f of findings) {
      seen[f.type] = (seen[f.type] || 0) + 1;
      f.id = `${prefix[f.type]}${seen[f.type]}`;
      delete f.score;
    }
    const week = rows.filter((r) => dayOf(r.requested_datetime) >= p.weekStart);
    result[name] = {
      name,
      reports_this_week: week.length,
      open_now: rows.filter(isOpen).length,
      findings,
      // Deterministic fallback: the top finding of each type, in the order above.
      investigate_default: ["E1", "R1", "S1"].filter((id) => findings.some((f) => f.id === id)),
      brief: null,
    };
  }
  return {
    period: {
      week_start: dayStr(p.weekStart), week_end: dayStr(end),
      baseline_start: dayStr(p.baseStart), baseline_end: dayStr(p.weekStart - 1),
    },
    case_url_template: CASE_URL("{id}"),
    areas: result,
  };
}

// ---------------------------------------------------------- interpretation

const SYSTEM = `You are an operations analyst writing a short daily brief about San Francisco 311 service requests for a business improvement district or a city neighborhood operations manager.

You receive findings that were computed by code from the city's public 311 data. Each finding has an id, a title, an observation, metrics, and case IDs. The observations are verified facts. Your job is the interpretation layer on top of them.

Rules:
- Use only the numbers, places, and categories that appear in the findings. Do not invent statistics, causes stated as fact, agencies' internal reasons, events, or locations.
- Keep observation and interpretation separate. Anything about why something is happening is a hypothesis: say so plainly ("one possible explanation", "worth checking whether"), and state what would confirm or rule it out.
- 311 records are reports, not verified incidents. One problem can produce many reports, and closure often means administrative closure, not that the problem was fixed. Account for this where relevant, without repeating it for every finding.
- Write for a busy manager: concrete, plain language, no hype, no filler. Name streets and addresses when the findings give them.
- "investigate_tomorrow" is at most three items, most important first, each tied to one finding id, with a specific action a person could take tomorrow (walk a block, call a department, check a property, compare with a contractor schedule).
- If the findings are thin or weak, say that; a quiet week is a valid result.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "summary", "findings", "investigate_tomorrow"],
  properties: {
    headline: { type: "string", description: "One sentence, under 20 words, on the most important thing this week." },
    summary: { type: "string", description: "Two or three sentences synthesizing the findings." },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["finding_id", "why_it_matters", "interpretation", "confidence"],
        properties: {
          finding_id: { type: "string" },
          why_it_matters: { type: "string", description: "One or two sentences on the operational or business consequence." },
          interpretation: { type: "string", description: "Hypotheses for what is going on, framed as hypotheses, and what would confirm them." },
          confidence: { type: "string", enum: ["low", "medium", "high"], description: "How strongly the data supports treating this as a real operational problem." },
        },
      },
    },
    investigate_tomorrow: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["finding_id", "action", "rationale"],
        properties: {
          finding_id: { type: "string" },
          action: { type: "string" },
          rationale: { type: "string" },
        },
      },
    },
  },
};

const fingerprint = (area, period) => JSON.stringify([period, area.findings.map((f) => [f.id, f.observation, f.cases])]);

async function interpretArea(client, area, period) {
  const payload = {
    area: area.name,
    week: `${period.week_start} to ${period.week_end}`,
    baseline: `${period.baseline_start} to ${period.baseline_end}`,
    reports_this_week: area.reports_this_week,
    open_cases_now: area.open_now,
    findings: area.findings.map(({ id, type, title, observation, metrics, case_total }) => ({ id, type, title, observation, metrics, linked_cases: case_total })),
  };
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: `Findings for ${area.name}:\n\n${JSON.stringify(payload, null, 2)}\n\nWrite the brief.` }],
  });
  if (response.stop_reason === "refusal") throw new Error(`refused (${response.stop_details?.category ?? "no category"})`);
  if (response.stop_reason === "max_tokens") throw new Error("hit max_tokens");
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const out = JSON.parse(text);
  // Keep only references to findings that exist: the model cannot add its own.
  const ids = new Set(area.findings.map((f) => f.id));
  const notes = {};
  for (const f of out.findings || []) if (ids.has(f.finding_id)) notes[f.finding_id] = { why_it_matters: f.why_it_matters, interpretation: f.interpretation, confidence: f.confidence };
  return {
    headline: out.headline,
    summary: out.summary,
    notes,
    investigate: (out.investigate_tomorrow || []).filter((i) => ids.has(i.finding_id)).slice(0, 3),
    model: response.model,
    usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
  };
}

// Adds Claude briefs to `analysis` in place. Reuses the previous run's brief
// for any area whose findings are unchanged (DataSF updates about once a day,
// so most 6-hourly runs make no API calls at all).
export async function interpret(analysis, { previous, concurrency = 4, log = console.log } = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    log("ANTHROPIC_API_KEY not set: publishing findings without AI interpretation");
    analysis.ai = { status: "disabled" };
    return;
  }
  const client = new Anthropic();
  const queue = [];
  let reused = 0;
  for (const area of Object.values(analysis.areas)) {
    area.fingerprint = fingerprint(area, analysis.period);
    const prev = previous?.areas?.[area.name];
    if (prev?.brief && prev.fingerprint === area.fingerprint) { area.brief = prev.brief; reused++; continue; }
    if (area.findings.length) queue.push(area);
  }
  log(`interpretation: ${reused} reused, ${queue.length} to generate`);
  let failed = 0, tokensIn = 0, tokensOut = 0;
  const worker = async () => {
    for (let area; (area = queue.shift()); ) {
      try {
        area.brief = await interpretArea(client, area, analysis.period);
        area.brief.generated_at = new Date().toISOString();
        tokensIn += area.brief.usage.input; tokensOut += area.brief.usage.output;
      } catch (e) {
        failed++;
        const kind = e instanceof Anthropic.APIError ? `API ${e.status}` : "error";
        log(`  ${area.name}: ${kind}: ${e.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  log(`interpretation done: ${failed} failed, ${tokensIn} input / ${tokensOut} output tokens`);
  analysis.ai = { status: failed && !Object.values(analysis.areas).some((a) => a.brief) ? "failed" : "on", model: MODEL };
}
