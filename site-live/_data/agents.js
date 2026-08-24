// The agent roster: one entry per agent, one job each.
// `output` is a hand-built mockup of what the agent actually hands a human.
// Used by the homepage grid and /agents/ so the two never drift.
module.exports = [
  {
    id: "logan",
    before: "Friday afternoon spent assembling status out of tickets, threads and memory.",
    after: "The update is already written, and the blockers were chased on Tuesday.",
    headline: "Turns a noisy board into one status update nobody has to write.",
    mark: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"> <rect x="10" y="13" width="44" height="8" rx="4" opacity=".28"/><rect x="10" y="13" width="44" height="8" rx="4"/> <rect x="10" y="28" width="30" height="8" rx="4" opacity=".28"/><rect x="10" y="28" width="19" height="8" rx="4"/> <rect x="10" y="43" width="36" height="8" rx="4" opacity=".28"/><rect x="10" y="43" width="30" height="8" rx="4"/> <path d="M46 32.5l3.5 3.5 7-7"/></svg>`,
    initials: "LO",
    name: "Logan",
    role: "Technical project manager",
    accent: "sky",
    summary: "Reads the board and the channels, finds what is stuck, chases the person who can unstick it, and writes the status update leadership actually reads.",
    long: "Every engineering team has the same leak: the work is fine, the reporting on the work is not. Someone spends Friday afternoon assembling a status update out of tickets, threads, and memory. Logan does it continuously instead of weekly. It notices when a ticket has gone quiet, asks the one person who can move it, and writes the update in prose a non-engineer can read.",
    automates: [
      "Daily blocker sweep and nudges",
      "Sprint status written, not templated",
      "Flags scope creep and slipped dates",
      "Turns meeting notes into tickets"
    ],
    connectors: ["Linear", "Jira", "GitHub", "Slack"],
    outputLabel: "Friday digest, posted to #eng",
    output: `<div class="ui-msg">
  <div class="av" style="background:var(--orb-sky)">LO</div>
  <div class="txt">
    <b>Logan</b><span class="t">Fri 9:02am</span>
    <div style="margin-top:4px">Week 34. <b>Checkout v2 is the only thing at risk.</b></div>
    <ul>
      <li>Payments migration shipped Wednesday. No rollbacks.</li>
      <li>Checkout v2 slipped 3 days. Blocked on the Stripe sandbox key since Tuesday, owner is Priya.</li>
      <li>Two tickets added to the sprint after kickoff. Both from the same customer escalation.</li>
      <li>Onboarding redesign is quiet. Last movement 6 days ago.</li>
    </ul>
  </div>
</div>`,
    outputFoot: { left: "Nudged Priya twice", right: "Lead approves any date change" },
    brief: {
      Job: "Keep every workstream visible and unblocked, and write the weekly status.",
      Reads: "The board, repo activity, and the engineering channels.",
      Runs: "Continuously. Digest posts Friday morning.",
      Human: "An engineering lead approves anything that changes scope or dates.",
      Working: "No item sits untouched for more than two days."
    }
  },
  {
    id: "pearl",
    before: "Denials pile up until month end. Half never get appealed at all.",
    after: "Every denial triaged the day it lands, with the appeal already drafted.",
    headline: "Works every denial the day it lands, instead of at month end.",
    mark: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"> <path d="M17 11h17l12 12v18"/><path d="M34 11v12h12" opacity=".45"/><path d="M17 11v34" /> <path d="M24 27h12M24 34h8" opacity=".55"/> <path d="M20 45a13 13 0 1 0 13-13" /><path d="M20 39v6h6"/></svg>`,
    initials: "PE",
    name: "Pearl",
    role: "Dental insurance billing",
    accent: "mint",
    summary: "Checks coverage before the chair, scrubs claims before they go out, and works the denials and aging balances that usually sit untouched.",
    long: "Dental billing loses money in three predictable places: coverage nobody verified, claims rejected for a fixable detail, and denials that sit in a pile because the front desk is busy with patients. Pearl works all three. It verifies eligibility ahead of appointments, scrubs each claim against that payer's known rules, triages every denial the day it lands, and keeps a worklist sorted by what is actually collectible.",
    automates: [
      "Eligibility checks ahead of appointments",
      "Claim scrubbing before submission",
      "Denial triage with drafted appeals",
      "Aging A/R worklist by payer"
    ],
    connectors: ["Practice management", "Clearinghouse", "Payer portals", "Email"],
    outputLabel: "This morning's denial worklist",
    output: `<div class="ui-row"><div class="who"><b>Delta Dental · #40219</b><span>D2740 downgraded to D2751</span></div><span class="amt">$1,240</span><span class="tag tag-green">Appeal drafted</span></div>
<div class="ui-row"><div class="who"><b>MetLife · #40174</b><span>Missing narrative for perio</span></div><span class="amt">$860</span><span class="tag tag-green">Appeal drafted</span></div>
<div class="ui-row"><div class="who"><b>Cigna · #40188</b><span>Frequency limit, last cleaning 4 mo ago</span></div><span class="amt">$212</span><span class="tag tag-red">Write off</span></div>
<div class="ui-row"><div class="who"><b>Aetna · #40203</b><span>Coordination of benefits missing</span></div><span class="amt">$1,905</span><span class="tag tag-amber">Needs patient call</span></div>
<div class="ui-row"><div class="who"><b>Guardian · #40160</b><span>Clean, resubmitted with attachment</span></div><span class="amt">$430</span><span class="tag tag-ink">Resubmitted</span></div>`,
    outputFoot: { left: "12 worked before 8am", right: "A biller approves every submission" },
    brief: {
      Job: "Verify coverage, scrub claims, triage denials, and work the aging balances.",
      Reads: "The fee schedule, paid claim history, and the practice's payer rules.",
      Runs: "Daily, ahead of the next day's schedule.",
      Human: "A biller reviews every submission and appeal before it sends.",
      Working: "Days in A/R come down without adding a person."
    }
  },
  {
    id: "nadia",
    before: "Two hundred unread, and the thing you promised in a meeting is gone.",
    after: "Three decisions on your desk by 6am. Everything else handled or drafted.",
    headline: "Answers the inbox that does not need you, and remembers the rest.",
    mark: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"> <path d="M8 15h48" opacity=".3"/><path d="M13 24h38" opacity=".45"/><path d="M19 33h26" opacity=".65"/> <path d="M25 42h14"/><path d="M30 51h4"/></svg>`,
    initials: "NA",
    name: "Nadia",
    role: "Chief of staff",
    accent: "lavender",
    summary: "Triages the inbox, drafts the replies that are obvious, builds the prep for every meeting, and tracks the commitments people make so nothing quietly dies.",
    long: "Nadia is an AI agent, not a person, and she runs inside Sora Labs as well as for clients. The job is the unglamorous half of a chief of staff role: read everything, decide what actually needs the principal, draft what does not, and remember every commitment made in a meeting. What arrives each morning is a short brief on the day's real decisions instead of a wall of unread mail.",
    automates: [
      "Morning brief with the day's decisions",
      "Inbox triage and drafted replies",
      "Meeting prep packets",
      "Commitment tracking and weekly review"
    ],
    connectors: ["Gmail", "Google Calendar", "Drive", "Slack"],
    outputLabel: "6:00am brief",
    output: `<div class="ui-msg">
  <div class="av" style="background:var(--orb-lavender)">NA</div>
  <div class="txt">
    <b>Three things need you today.</b>
    <ul>
      <li>Renewal for the Peterson account. They asked for 15% off, contract ends Friday. Draft reply ready.</li>
      <li>You promised Marcus a intro to Dana on the 11th. Not sent yet.</li>
      <li>2pm board prep: last quarter's deck is stale on two slides. Updated versions attached.</li>
    </ul>
    <div style="margin-top:10px;color:var(--muted);font-size:.75rem">41 other emails triaged. 9 replies drafted and waiting. Nothing else needs you.</div>
  </div>
</div>`,
    outputFoot: { left: "9 drafts waiting", right: "Nothing sends under your name unread" },
    brief: {
      Job: "Triage the inbox, prep every meeting, and track what people committed to.",
      Reads: "Mail, calendar, and the docs attached to each meeting.",
      Runs: "Every morning at 6am, then continuously through the day.",
      Human: "Nothing sends under the principal's name without their review.",
      Working: "No commitment made in a meeting gets dropped."
    }
  },
  {
    id: "tony",
    before: "Twenty minutes searching, two hours reconciling policy, calendar and receipts.",
    after: "Two itineraries that already fit, held for the day, receipts filed on arrival.",
    headline: "Books the trip that fits the calendar, the policy and the budget.",
    mark: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"> <path d="M17 47c10-1 6-14 16-19s12-4 15-6" stroke-dasharray="1 6" opacity=".7"/> <path d="M14 46a5 5 0 1 0 6 0c3-3 3-9-3-9s-6 6-3 9z"/><circle cx="17" cy="41" r="2" fill="currentColor" stroke="none"/> <circle cx="48" cy="20" r="6"/><circle cx="48" cy="20" r="2" fill="currentColor" stroke="none"/></svg>`,
    initials: "TO",
    name: "Tony",
    role: "Travel agent",
    accent: "peach",
    summary: "Plans and books trips against a traveler's actual rules: preferred carriers, budget ceilings, loyalty status, and the meetings already on the calendar.",
    long: "Booking a trip is twenty minutes of searching and two hours of reconciling: the cheap flight that lands after the first meeting, the hotel that is technically in policy but forty minutes from the site, the receipt nobody filed. Tony holds every constraint at once. It proposes two or three itineraries that already fit the calendar, the budget, and the loyalty programs, books the one that gets picked, and files the receipts.",
    automates: [
      "Itinerary options that fit policy",
      "Price watching and rebooking alerts",
      "Confirmations onto the calendar",
      "Receipts routed to expense"
    ],
    connectors: ["Flight and hotel APIs", "Gmail", "Google Calendar", "Expense"],
    outputLabel: "Austin, Mar 4–6 · three options",
    output: `<div class="ui-row"><div class="who"><b>UA 2287 · 6:40am, lands 9:15</b><span>Hyatt Regency, 4 min from the site</span></div><span class="amt">$684</span><span class="tag tag-green">Best fit</span></div>
<div class="ui-row"><div class="who"><b>AA 1102 · 9:05am, lands 11:40</b><span>Marriott downtown, 12 min</span></div><span class="amt">$612</span><span class="tag tag-amber">Misses 11am</span></div>
<div class="ui-row"><div class="who"><b>UA 411 · 7:15am, lands 10:00</b><span>Hyatt Regency, 4 min</span></div><span class="amt">$795</span><span class="tag tag-ink">Over budget</span></div>
<div style="margin-top:12px;font-size:.8125rem;line-height:1.6;color:var(--body-text)">Option one keeps your Star Alliance status, clears the 11am on-site by 90 minutes, and sits $116 under the trip cap. Held until 4pm today.</div>`,
    outputFoot: { left: "Fare held 6h", right: "You pick before anything books" },
    brief: {
      Job: "Plan trips that fit the calendar, the policy, and the loyalty programs, then book them.",
      Reads: "Travel policy, loyalty numbers, and the traveler's calendar.",
      Runs: "On request, then watches prices until departure.",
      Human: "The traveler picks the itinerary before anything is booked.",
      Working: "Trips booked same day, inside policy, without a back and forth."
    }
  },
  {
    id: "george",
    before: "Reps skip the research, so the first touch reads like a template.",
    after: "Every account researched before contact, and the reason to reach out is in line one.",
    headline: "Finds the account, does the homework, drafts the first touch.",
    mark: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"> <circle cx="34" cy="32" r="19" opacity=".3"/><circle cx="34" cy="32" r="11" opacity=".6"/> <circle cx="34" cy="32" r="3.5" fill="currentColor" stroke="none"/> <path d="M6 32h13"/><path d="M15 27l5 5-5 5"/></svg>`,
    initials: "GE",
    name: "George",
    role: "Go-to-market agent",
    accent: "rose",
    summary: "Finds accounts that match the profile, researches each one properly, and writes a first touch that reads like someone did the homework.",
    long: "Most outbound fails at research, not at volume. George starts from the accounts you actually closed, finds more that look like them in Apollo, enriches the contacts, and then does the part reps skip: reads the company, finds the specific reason to reach out this quarter, and drafts a first touch about that reason. Reps approve every send.",
    automates: [
      "List building and contact enrichment",
      "Account research briefs before outreach",
      "Drafted sequences, one per account",
      "Reply routing and weekly pipeline report"
    ],
    connectors: ["Apollo", "HubSpot", "Gmail", "LinkedIn"],
    outputLabel: "Draft 14 of 25 · Ridgeline Dental Group",
    output: `<div class="ui-mail">
  <div class="sub">Re: the two practices you added in Tempe</div>
  <div>Hi Dana,</div>
  <div style="margin-top:8px">Saw Ridgeline picked up <span class="hl">two Tempe practices in January</span> and posted for a third biller last week. That order usually means claims volume grew faster than the billing desk did.</div>
  <div style="margin-top:8px">We built an agent for a six-location group that works denials the day they land instead of at month end. Worth fifteen minutes?</div>
  <div style="margin-top:8px;color:var(--muted);font-size:.75rem">Signal: 2 acquisitions (Jan), biller req posted Mar 2 · Fit score 91</div>
</div>`,
    outputFoot: { left: "25 drafted this morning", right: "A rep approves every send" },
    brief: {
      Job: "Find accounts like our best customers, research them, and draft the first touch.",
      Reads: "Closed-won accounts from the last 18 months and our positioning doc.",
      Runs: "Every weekday at 6am. 25 accounts a day.",
      Human: "Reps approve every email before it sends.",
      Working: "Meetings booked per 100 accounts worked."
    }
  },
  {
    id: "frank",
    before: "The daily report gets written from memory a week later, if at all.",
    after: "Filed before the crew leaves, from the notes and photos the super already took.",
    headline: "Files the daily report before the crew leaves the site.",
    mark: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"> <path d="M7 52h50"/> <rect x="12" y="36" width="13" height="16" opacity=".45"/> <rect x="27" y="25" width="13" height="27"/> <rect x="42" y="31" width="12" height="21" opacity=".7"/> <path d="M27 18l7-6 7 6" opacity=".55"/></svg>`,
    initials: "FR",
    name: "Frank",
    role: "Construction project manager",
    accent: "sand",
    summary: "Turns field notes and photos into the daily report, tracks the RFIs and submittals nobody wants to track, and flags a slipping date while it can still be fixed.",
    long: "On a job site the documentation is the last thing done and the first thing that matters in a dispute. Frank takes what the super already captures, voice notes, photos, a few lines of text, and turns it into the daily report before the crew leaves. It tracks every RFI and submittal against its due date, follows up with the subs who have gone quiet, and flags a slipping milestone while there is still float to protect.",
    automates: [
      "Daily reports from field notes and photos",
      "RFI and submittal tracking",
      "Subcontractor follow-up",
      "Schedule slippage and change-order prep"
    ],
    connectors: ["Procore", "Email", "Drive", "Weather data"],
    outputLabel: "Daily report · Lot 7, Tue",
    output: `<div class="ui-kv"><div class="ui-k">Crew</div><div class="ui-v">14 on site. Framing 6, electrical 4, sitework 4.</div></div>
<div class="ui-kv"><div class="ui-k">Weather</div><div class="ui-v">Rain 11:20am to 1:40pm. <span class="dim">2.3 hrs lost, sitework only.</span></div></div>
<div class="ui-kv"><div class="ui-k">Progress</div><div class="ui-v">Second floor framing 80%. Rough-in started east wing. 9 photos filed.</div></div>
<div class="ui-kv"><div class="ui-k">Risk</div><div class="ui-v">RFI 042 (beam penetration) is 6 days out. Blocks inspection Thursday. <span class="dim">Architect chased twice.</span></div></div>
<div class="ui-kv"><div class="ui-k">Prepped</div><div class="ui-v">CO draft for the added trench drain, awaiting your pricing.</div></div>`,
    outputFoot: { left: "Filed 4:52pm, before the crew left", right: "You price and sign every CO" },
    brief: {
      Job: "Produce the daily report, track RFIs and submittals, and flag schedule risk early.",
      Reads: "Field notes, site photos, the schedule, and the sub contact list.",
      Runs: "Every workday at close of site, plus a Monday schedule review.",
      Human: "The project manager prices and signs every change order.",
      Working: "Daily reports filed same day, no RFI past due."
    }
  }
];
