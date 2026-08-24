# sora-labs.net

The live site, built from `site-live/` → `_site/` and deployed to sora-labs.net
by `.github/workflows/deploy.yml` on every push to `main`.

`archive-consulting-site/` is the previous consulting-positioned site, kept for
reference. It sits outside the Eleventy input directory, so it is never built or
published. Tag `pre-agents-relaunch` marks the last commit where it was live.

It is positioned around the actual product:
**agents on demand.** Sora Labs is a product company. The product is the ability
to turn any job description into a working agent; the six running agents are
proof of it, not the offer.

The voice follows from that. It is "describe the job and it comes back as a
spec", not "we will scope an engagement with you". Words that make it sound like
an agency (founder-led, consulting, retainer, engagement, advisory) are out, and
a grep guards against them coming back.

Nothing here touches the live site. `src/` → `_site/` still builds and deploys
exactly as before.

## Run it

```
npm run serve      # local preview with live reload
npm run build      # site-live/ → _site/
```

## What is new

| Page | What it does |
| --- | --- |
| `/` | The mechanic front and centre: a composer that hands off to the brief, then paragraph → scope → real output, the six agents on a dark band, and two more output mockups |
| `/build/` | **The product.** A four-step wizard beside a **live agent** that takes shape as you fill it in: it gets initials, a name, a role, and connectors that attach as chips. Only step 1 is required. Posts to Formspree `mgojplrg` |
| `/agents/` | Each agent: its mark, a one-line claim, a before/after, what it runs on, and the output it produces. Narrative, automations and the brief sit behind one disclosure |
| `/how-it-works/` | A drawn process timeline: six icon nodes on a rail, each tagged YOU / US / BOTH with a duration. Plus what we send back, and the pre-call questions |
| `/about/` | Rewritten for the new positioning. Keeps the disclosure that Nadia and Logan are AI agents |
| `/contact/` | General inquiries, pointing anyone who is ready at `/build/` |

## Design system

Light editorial, from the ElevenLabs DESIGN.md (`design-md/elevenlabs` in
voltagent/awesome-design-md). Off-white `#F5F5F5` canvas, warm near-black ink
`#0C0A09`, near-black pill CTAs, 1px hairlines, white cards at 16px radius, 96px
section rhythm, and pastel gradient orbs (mint / peach / lavender / sky / rose /
sand) as the only colour.

**Fonts.** Verified against elevenlabs.io itself, not against their DESIGN.md.
That document calls Waldenburg "a custom serif" and gives it a
`'Times New Roman', serif` fallback. **It is wrong.** Their site serves
`KMR-Waldenburg-Buch-latin.woff2` and renders its `h1` in it at weight 300, and
Waldenburg is a neo-grotesque **sans**.

Waldenburg is licensed, so we cannot ship it. Twelve free sans candidates were
rendered at their exact display spec (56px, -1.7px) and measured against the
real face: **Inter Light is the closest, within 0.9% on set width** (next best
was Schibsted Grotesk at 1.2%, Geist at 3.8%). Inter is also the family
ElevenLabs uses for body, and unlike a serif substitute it has a genuine weight
300, which is their display signature.

So the site is one family at two weights: **Inter 300 for display, Inter 400/500
for text**, with the `opsz` axis (14..32) picking up the tightened Inter Display
forms at large sizes. To swap in real Waldenburg if you license it: put it first
in `--display` in `tokens-light.css`. Nothing else changes.

**There is no monospace in the ElevenLabs system**, so there is none here. Every
small label is their `caption-uppercase` token: Inter, 12px, weight 600,
+0.96px, uppercase. The three pages with real code blocks keep a system mono
stack for the code only.

The full type scale lives as tokens in `css/tokens-light.css`, values taken
verbatim from their spec (display-mega 64/1.05/-1.92px down to
caption-uppercase 12/600/+0.96px). Every `font-size` in `site.css` sits on that
scale: 64 / 48 / 36 / 32 / 24 / 20 / 18 / 16 / 15 / 14 / 12 and nothing between.

**No coloured italic in headings, and no gold eyebrows.** A gold italic kicker
on every heading is the single fastest way to make a page read as generated, and
it is not in the ElevenLabs system either: their headlines are one ink weight.
`h1 em` / `h2 em` are neutered in `site.css` so the pattern cannot creep back.
Gold now appears only where it carries meaning: the animated wire pulse, the
last line of the brief in the assembly, the AFTER label, the required-field
mark, and the YOU pill on the process timeline. Zero gold text nodes on a
marketing page.

**Headlines are statements, not epigrams.** "Agents on demand", "What an agent
hands back", "Three rules, in writing". If a line needs a coloured italic to
land, write a better line.

One deliberate departure from the reference:
- `--muted` is `#6E6862`, darkened from their `#777169`, which lands at 4.43
  against the canvas and fails AA for small text.

### One theme, every page

`css/tokens-light.css` loads site-wide from `base.njk`, **after** `tokens.css`,
so it overrides the old dark palette everywhere. The carried-over marketing
pages were token-driven, so they flipped for free. The ten pages that inlined
their own dark `:root` (products, research, guides, tools, clients) had their
palettes remapped in place, and their hardcoded dark literals lightened.

Every page in the sitemap now renders on the light canvas in EB Garamond, and
every one passes WCAG AA for text contrast. `.band-dark` is still in `site.css`
if you ever want a section to invert.

## The community hub

`/resources/` is the community page. It leads with The Briefing (what a typical
issue holds, subscribe, archive), then the library of research, sample
deliverables and operator guides, then the agent roster as six marks, then where
to follow.

Everything on it points at something that actually exists. If you ever want a
real community space (Slack, Discord, a forum) that needs a real destination
first: do not let the page imply one that is not there. For the same reason the
newsletter panel shows *what a typical issue covers* rather than invented back
issues with numbers on them.

## The /build/ sidebar and the tool picker

Two things were making the form feel heavy, and both are worth keeping fixed.

**Twenty connector pills in one flat wall read as a wall.** They are now in five
named groups behind a search field, in a scrollable box, with a live "4
connected" count. Typing narrows it to one group and one pill; typing nonsense
says so and points at the free-text field.

**Five one-click examples sit above the wizard**, covering the roles people
recognise first: chief of staff, technical PM, dental billing, outbound sales,
construction PM. One click fills all nine fields, ticks the right tools,
and the live agent assembles instantly at 8 of 8. It is the fastest way to show
what a finished description looks like without asking anyone to write one first,
and it makes the form feel light while proving it is thorough. Switching example clears the previous one's tools. They wrap to two rows at
desktop and become one swipeable row under 620px; that scroller needs
`min-width: 0` on the grid children or it widens the whole page instead of
scrolling. The step legends are visually hidden because
the wizard rail already names each step (they stay in the DOM for screen
readers).

**The sidebar was a static spec table.** It is now the agent itself: a
desaturated orb that saturates the moment you name it, initials derived from the
name, the role beneath, connectors attaching as chips with a small overshoot,
the spec rows under that, and a progress meter. Filling the form now feels like
assembling something rather than answering a questionnaire.

One trap to remember: `.btn-primary` sets `display: inline-flex`, which beats the
UA rule for `[hidden]`. Without the global `[hidden] { display: none !important }`
in `site.css`, the wizard's submit button renders on every step alongside Next.

## Forms

Both `/build/` and `/contact/` POST to Formspree `mgojplrg`, the same endpoint
the live site uses. Verified live: a POST returns `{"ok":true}`.

`_next` sends people to `/thanks/` on our own domain after submitting, rather
than Formspree's default confirmation page. `/thanks/` carries `noindex` and is
in the sitemap's exclusion list.

The newsletter forms on `/`, `/contact/`, `/newsletter/` and the construction
briefing post to Buttondown (`nclawdev`), unchanged.

Google Analytics (`G-J1F2ETBV5K`) is in `base.njk` and, for the handful of
standalone HTML pages, in their own heads. All 22 built pages carry both the
gtag script and the config call.

## Animation

The how-it-works flow animates on scroll, once per visit.

**The assembly** (`.assembly`) is the centrepiece: a brief writes itself line by
line on the left, gold pulses travel down curved wires into a living agent core,
its connectors click on one at a time, more pulses flow out the far side, and
finished work lands on the right. Everything after the reveal keeps running:
the core breathes and slowly rotates, sonar rings pulse out of it, the wire
flows loop, and the connectors light in rotation. Pure CSS, no assets, no
libraries.

Below it the three detail panels play in sequence:

- **Homepage `#mechanic`** — the brief types itself out word by word with a gold
  caret, the connector arrow draws, the scope panel's rows cascade in, then the
  denial worklist lands and its status tags pop last. A discreet **Replay**
  control sits next to the CTAs.
- **`/how-it-works/` `#process`** — the six steps reveal in order, each drawing
  a short rule under its number, and the "What we send back" panel cascades.

Implementation is in `js/site.js` plus the `SEQUENCE ANIMATION` block in
`site.css`. Three things keep it safe:

1. Words are split into spans **before** the reveal, so the panel reserves its
   full height and nothing reflows mid-animation.
2. Everything is gated on a `.js` class set inline before first paint, so with
   JavaScript off the content is simply visible.
3. `prefers-reduced-motion: reduce` shows every element immediately, drops the
   caret, and hides the replay control.

## Agent marks

`_data/agents.js` carries a `mark` per agent: a line-drawn SVG on a 64-unit grid
at a single stroke weight, sitting on a disc of that agent's pastel. Six
different jobs still read as one family. They carry the homepage grid, the
`/agents/` rows, and the roster strip on `/resources/`. Add a seventh agent and
it needs a mark, a `headline` (one sentence), and a `before` / `after` pair.

## A note on the /agents/ page

It was too busy at one point, and the fixes are worth keeping in mind if you add
a seventh agent. What was fighting for attention: rows alternated sides *and*
alternated background tint, so the eye zigzagged and the ground kept changing;
and there were 30 connector chips on the page competing with the coloured status
tags inside the mockups.

The second pass went further, because the rows were still dense. Each row now
leads with the agent's mark, a one-sentence claim, and a **before / after** pair
that makes the value concrete. The narrative, the automations list, and the
brief all moved behind a single disclosure. What stays visible is the claim, the
proof, and what it runs on.

Now every row is the same shape: agent on the left, its output on the right, no
tint, separated by a hairline. Connectors read as one quiet sentence
(`Runs on Procore, email, Drive, weather data.`) instead of pills. The bullet
markers are plain hairline dashes rather than gold, so the only colour on the
row is inside the mockup, where it means something. The brief is a text
disclosure, not a second bordered panel. Keep it that way.

## Product visuals

`_data/agents.js` carries an `output` field per agent: a hand-built HTML mockup
of what that agent actually hands a human (Pearl's denial worklist, George's
drafted email, Logan's Friday digest, Frank's daily report, and so on). They are
built from the `.ui` component set in `site.css`, so they restyle with the rest
of the site and need no image assets. The homepage shows three, `/agents/` shows
all six.

## How it is wired

- `_data/agents.js` is the single source for the roster. The homepage grid and
  `/agents/` both loop over it, so they cannot drift. Add a seventh agent there
  and both pages pick it up.
- `_includes/layouts/site.njk` gives new pages fonts, `/css/site.css`, nav, and
  footer from front matter (`title`, `description`, `nav_active`).
- `css/site.css` is the shared stylesheet for the new pages. Tokens still come
  from `css/tokens.css`.
- The mobile nav menu (CSS + JS) lives in `_includes/layouts/base.njk` rather
  than `site.css`, because the carried-over pages inline their own nav CSS and
  would otherwise get a dead hamburger button.

## Carried over unchanged

`/research/*`, `/guides/*`, `/tools/*`, `/products/*`, `/resources/`,
`/newsletter/`, `/services/`, `/local-businesses/`, `/emotionos-privacy/`,
`/clients/*`, `robots.txt`, and the auto-generated `sitemap.xml`.

`/services/` and `/local-businesses/` still carry the old consulting
positioning. They are out of the nav and footer but still live, still linked
from `/resources/`, and still in the sitemap. Decide whether to rewrite them
for agents or retire them before this goes live.

## Rollback

```
git reset --hard pre-agents-relaunch && git push --force origin main
```

That restores the consulting site exactly as it was, including `src/`.
