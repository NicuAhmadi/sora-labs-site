// "This week in SF 311" insights for /city-signals/.
//
// Three template-based findings computed from the same 90-day DataSF pull as
// the page's snapshot files (no LLM, no hardcoded figures). Each insight
// reports whether its primary rule fired or its fallback was used, plus the
// numbers behind it so the copy can be spot-checked.
//
// Day windows are anchored on the newest case date in the data ("day 1"),
// because DataSF publishes with a lag of about a day.

const DAY = 864e5;
const ms = (s) => (s ? Date.parse(String(s).slice(0, 19) + "Z") : NaN);
const dayOf = (s) => Math.floor(ms(s) / DAY);
const isOpen = (r) => !String(r.status_description || "").toLowerCase().startsWith("clos");
const fmtDay = (d) => new Date(d * DAY).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fmtInt = (n) => n.toLocaleString("en-US");
const round1 = (x) => Math.round(x * 10) / 10;

function median(values) {
  if (!values.length) return null;
  const a = [...values].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// A. Category spike by neighborhood.
function categorySpike(records, end, asOfText, movers) {
  const pairs = new Map();
  for (const r of records) {
    if (!r.analysis_neighborhood || !r.service_name) continue;
    const d = dayOf(r.requested_datetime);
    const recent = d >= end - 6 && d <= end;
    const trailing = d >= end - 36 && d <= end - 7;
    if (!recent && !trailing) continue;
    const k = `${r.analysis_neighborhood}|${r.service_name}`;
    if (!pairs.has(k)) pairs.set(k, { hood: r.analysis_neighborhood, cat: r.service_name, actual: 0, trailing: 0 });
    pairs.get(k)[recent ? "actual" : "trailing"]++;
  }
  const rows = [...pairs.values()]
    .map((p) => ({ ...p, expected: (p.trailing / 30) * 7 }))
    .filter((p) => p.actual >= 20 && p.expected > 0)
    .map((p) => ({ ...p, change: (p.actual / p.expected - 1) * 100 }));
  const window = `${fmtDay(end - 6)} to ${fmtDay(end)}`;
  const numbers = (p) => ({ neighborhood: p.hood, category: p.cat, actual_7d: p.actual, trailing_30d_count: p.trailing, expected_7d: round1(p.expected), change_pct: round1(p.change) });

  const ups = rows.filter((p) => p.actual >= 1.25 * p.expected).sort((a, b) => b.change - a.change);
  const mover = (p) => ({ neighborhood: p.hood, category: p.cat, actual_7d: p.actual, expected_7d: round1(p.expected), change_pct: Math.round(p.change) });
  movers.up = ups.slice(0, 8).map(mover);
  movers.down = rows.filter((p) => p.actual <= 0.8 * p.expected).sort((a, b) => a.change - b.change).slice(0, 8).map(mover);
  if (ups.length) {
    const p = ups[0];
    return {
      key: "spike", status: "primary",
      text: `${p.cat} reports in ${p.hood} are up ${Math.round(p.change)}% vs the trailing 30-day average.`,
      context: `${fmtInt(p.actual)} reports ${window} vs ${round1(p.expected)} expected. DataSF snapshot as of ${asOfText}.`,
      numbers: numbers(p),
    };
  }
  const downs = rows.filter((p) => p.change < 0).sort((a, b) => a.change - b.change);
  if (downs.length) {
    const p = downs[0];
    return {
      key: "spike", status: "fallback",
      text: `${p.cat} reports in ${p.hood} are down ${Math.round(-p.change)}% vs the trailing 30-day average.`,
      context: `${fmtInt(p.actual)} reports ${window} vs ${round1(p.expected)} expected. DataSF snapshot as of ${asOfText}.`,
      numbers: numbers(p),
    };
  }
  return null;
}

// B. Repeat locations.
function repeatLocations(records, end, asOfText, repeatList) {
  const pairs = new Map();
  for (const r of records) {
    if (!r.street || !r.service_subtype) continue;
    const k = `${r.street}|${r.service_subtype}`;
    if (!pairs.has(k)) pairs.set(k, { street: r.street, subtype: r.service_subtype, category: r.service_name, n: 0, open: 0, active: false });
    const p = pairs.get(k);
    p.n++;
    if (isOpen(r)) p.open++;
    if (isOpen(r) || (r.closed_date && dayOf(r.closed_date) >= end - 13)) p.active = true;
  }
  const list = [...pairs.values()].filter((p) => p.n >= 5 && p.active).sort((a, b) => b.n - a.n);
  const qualifying = list.length;
  repeatList.push(...list.slice(0, 25).map(({ street, subtype, category, n, open }) => ({ street, subtype: subtype.replace(/_/g, " "), category, cases_90d: n, open_now: open })));
  if (qualifying > 0) {
    return {
      key: "repeats", status: "primary",
      text: `${fmtInt(qualifying)} street locations have 5+ repeat requests of the same subtype in the last 90 days.`,
      context: `Street and subtype pairs with an open case or a closure in the last 14 days. DataSF snapshot as of ${asOfText}.`,
      link: { label: "See list", target: "repeat-list" },
      numbers: { qualifying_pairs: qualifying, pairs_with_5plus_any_status: [...pairs.values()].filter((p) => p.n >= 5).length },
    };
  }
  const oldOpen = records.filter((r) => isOpen(r) && dayOf(r.requested_datetime) < end - 13).length;
  return {
    key: "repeats", status: "fallback",
    text: `${fmtInt(oldOpen)} cases opened more than 14 days ago are still open.`,
    context: `Open cases from the last 90 days. DataSF snapshot as of ${asOfText}.`,
    numbers: { open_older_than_14d: oldOpen },
  };
}

// C. Close time degradation.
function closeTime(records, end, asOfText) {
  const volume = new Map();
  for (const r of records) if (r.service_name) volume.set(r.service_name, (volume.get(r.service_name) || 0) + 1);
  const top = [...volume].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
  const stats = top.map((cat) => {
    const recent = [], prior = [];
    for (const r of records) {
      if (r.service_name !== cat || !r.closed_date) continue;
      const days = (ms(r.closed_date) - ms(r.requested_datetime)) / DAY;
      if (!Number.isFinite(days) || days < 0) continue;
      const cd = dayOf(r.closed_date);
      if (cd >= end - 29 && cd <= end) recent.push(days);
      else if (cd >= end - 59 && cd <= end - 30) prior.push(days);
    }
    return { category: cat, volume_90d: volume.get(cat), recent_median: median(recent), prior_median: median(prior), recent_n: recent.length, prior_n: prior.length };
  });
  const numbers = (s) => ({ ...s, recent_median: round1(s.recent_median), prior_median: round1(s.prior_median) });
  const flagged = stats
    .filter((s) => s.recent_median != null && s.prior_median != null && s.prior_median >= 3 && s.recent_median >= s.prior_median + 3)
    .sort((a, b) => (b.recent_median - b.prior_median) - (a.recent_median - a.prior_median));
  if (flagged.length) {
    const s = flagged[0];
    return {
      key: "close_time", status: "primary",
      text: `Median close time for ${s.category} is ${round1(s.recent_median)} days, up from ${round1(s.prior_median)} a month ago.`,
      context: `Cases closed ${fmtDay(end - 29)} to ${fmtDay(end)} vs ${fmtDay(end - 59)} to ${fmtDay(end - 30)}. DataSF snapshot as of ${asOfText}.`,
      numbers: { top5: stats.map(numbers) },
    };
  }
  const fastest = stats.filter((s) => s.recent_median != null).sort((a, b) => a.recent_median - b.recent_median)[0];
  if (!fastest) return null;
  return {
    key: "close_time", status: "fallback",
    text: `Fastest resolving category: ${fastest.category} at ${round1(fastest.recent_median)} days.`,
    context: `Median for cases closed ${fmtDay(end - 29)} to ${fmtDay(end)}, among the 5 highest-volume categories. DataSF snapshot as of ${asOfText}.`,
    numbers: { top5: stats.map(numbers) },
  };
}

export function computeInsights(records, { asOf }) {
  let end = -Infinity;
  for (const r of records) { const d = dayOf(r.requested_datetime); if (d > end) end = d; }
  const asOfText = asOf
    ? new Date(ms(asOf)).toLocaleString("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " PT"
    : fmtDay(end);
  const movers = { up: [], down: [] }, repeatList = [];
  return {
    as_of: asOf,
    latest_case_day: new Date(end * DAY).toISOString().slice(0, 10),
    week: { start: new Date((end - 6) * DAY).toISOString().slice(0, 10), end: new Date(end * DAY).toISOString().slice(0, 10) },
    insights: [categorySpike(records, end, asOfText, movers), repeatLocations(records, end, asOfText, repeatList), closeTime(records, end, asOfText)].filter(Boolean),
    movers,
    repeat_list: repeatList,
  };
}
