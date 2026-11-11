# City Signals design system

> **v2 (November 2026).** Calmer chrome after comparing with lighter civic-data
> sites: a slim top navigation bar replaces the dark sidebar; the type scale is
> smaller (page title 26px, section 19px, component 16px, body 14.5px); every
> section sits in one consistent white card (12px radius, 1px `--line` border);
> the canvas is `#F9F9F7`. Place-based pages put the place in the title as an
> inline picker (`.title-pick`), answer first in one sentence (`.summary`, key
> numbers in bold), and show "share of the city" bars against a dashed
> share-of-residents line (`.shares`). Values below are updated to v2 where they
> changed; the principles are unchanged. Site locations are still never shown.

Direction: **Editorial Intelligence**. Something between a well-designed data
publication and a serious operational tool: restrained, spacious, analytical.
References: Observable Framework (composition, whitespace, narrative), IBM
Carbon (tokens, dense tables, consistent controls), Linear (navigation and
filter discipline).

**Scope: the four City Signals pages only** (`/city-signals/`, `/this-week/`,
`/trends/`, `/housing/`). The rest of sora-labs.net keeps its own design.

Implementation: `site-live/city-signals/shell.css` holds every token and shared
component. Pages add only page-specific rules in a short `<style>` block. If a
rule would be useful on a second page, it belongs in `shell.css`.

---

## 1. Principles

1. **One thing dominates.** Each view has one lead finding or one primary chart.
   Everything else is visibly secondary.
2. **Cards are for meaningful groupings, not the default container.** Charts sit
   on the canvas, separated by a hairline rule (`.module`). Bordered surfaces are
   reserved for navigation targets (`.go`) and floating UI (tooltips, menus).
3. **Green means interaction, selection or emphasis.** Not decoration.
4. **The data color follows the metric**, on every page (section 4).
5. **Say what the data shows, then let people check it.** Every finding names its
   window and source; details sit behind a disclosure, never removed.

## 2. Tokens

### Color

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#F7F8F6` | Page background |
| `--surface` | `#FFFFFF` | Tooltips, menus, inputs, `.go` links |
| `--ink` | `#172924` | Titles, values |
| `--ink-2` | `#3D4F48` | Body text |
| `--muted` | `#66726C` | Metadata, labels (4.7:1 on canvas) |
| `--faint` | `#98A39D` | Disabled, "not available" values |
| `--line` / `--line-strong` | `#E3E8E4` / `#CDD5D0` | Hairlines / module rules |
| `--accent` | `#087C69` | Interaction, selection, section numbers |
| `--side` | `#132B25` | Sidebar |

The reference proposal suggested `#75817B` for muted text; it measures 3.8:1 on
the canvas and fails WCAG AA for small text, so `#66726C` is used instead.

### Type

One family (Inter, loaded from Google Fonts), five roles. No uppercase,
letter-spaced labels anywhere.

| Role | Token | Size | Weight | Use |
|---|---|---|---|---|
| Page title | `--t-page` | 26px (22px mobile) | 700 | The `<h1>`, one per page |
| Section title | `--t-section` | 19px | 700 | Chapters within a view |
| Component title | `--t-component` | 17px | 650 | Chart modules, findings |
| Body | `--t-body` | 14.5px | 400 | Explanations, interpretations |
| Metadata | `--t-meta` | 12.5px | 400 to 600 | Sources, windows, units, labels |

Lead finding statements use 28px; big numbers 40px; KPI values 30px. Numbers in
tables, KPIs and charts use tabular figures.

### Spacing (8px rhythm)

| Token | Value | Use |
|---|---|---|
| `--sp1` | 8px | Closely related elements |
| `--sp2` | 16px | Label to control, title to text |
| `--sp3` | 24px | Inside modules |
| `--sp4` | 32px | Header to tabs, KPI strip |
| `--sp6` | 48px | Between related sections (`.block`) and modules |
| `--sp9` | 72px | Between chapters (`.chapter`) |

Spacing tokens are named `--sp*` so they never collide with chart color
variables.

## 3. Page anatomy

```
kicker              City Signals / Page name             (.kicker, links home)
page title          One question or statement, has "San Francisco"   (h1.page-title)
dek                 One sentence on what the page lets you do        (.dek)
note (optional)     One-line caveat + "How to interpret" disclosure  (.note-line)
meta                Status: refresh time, data window                (.meta / .status)
page tabs           Overview / Explore / Data & methodology          (.page-tabs, when needed)
KPI strip           3 or 4 scope numbers, divided by rules, no cards (.kpi-strip)
chapter 01          Section label + lead finding                     (.chapter, .finding-lead)
block 02 to 04      Secondary findings in a row                      (.block, .finding-row)
modules             Chart modules on a 2-column grid                 (.modules, .module[.wide])
chapters            Tables, sources, methods                         (.chapter)
footer              Source line                                      (.foot)
```

**Views.** A page that serves several audiences uses tabs within one URL:
Overview (two-minute read), Explore (interactive), Data & methodology (tables,
downloads, definitions). All views are in the HTML so they are indexed; the
active view is kept in `?view=` and can be shared.

**Section labels** are a number in accent green plus a short name
(`01 Key finding`). Titles of sections and modules state a question or a
finding, never just the variable names.

## 4. Data visualization grammar

| Element | Rule |
|---|---|
| Chart title | The question the chart answers ("How long do requests take to close?") |
| Subtitle | One computed sentence stating what the chart shows for the current filters |
| Window line | The observation window, under the subtitle, whenever sources differ |
| Axis labels | Y-axis label with units above the axis; x-axis label with units at the end |
| Grid | Horizontal only, `--grid`; baseline `--axis` |
| Legends | Line or square keys; direct labels when there are 4 or fewer series and room |
| Interaction | Crosshair + tooltip on lines, per-mark tooltip on bars, nearest-point on scatter; same on keyboard focus |
| Selection | Selected entity in `--d-sel` (dark green), everything else in `--d-ctx` gray |
| Table view | Every chart has a Table tab and a CSV download |
| Notes | Caveats live in a "Notes and caveats" disclosure in the module footer |

### One color per metric

| Metric | Token | Hex |
|---|---|---|
| All 311 requests (single series) | `--d-total` | `#172924` |
| Street and sidewalk cleaning | `--d-clean` | `#13866F` |
| Parking enforcement | `--d-parking` | `#2A78D6` |
| Graffiti | `--d-graffiti` | `#C2557F` |
| General requests | `--d-general` | `#6250D6` |
| Encampments, tents and structures | `--d-enc` | `#D08A00` |
| Lived-in vehicles | `--d-veh` | `#6250D6` |
| Homeless-designated affordable housing | `--d-housing` | `#2A78D6` |
| Reporting channels: app / phone / web / other | `--d-app` `--d-phone` `--d-web` `--d-other` | `#6250D6` `#EB6834` `#2A78D6` `#C2557F` |
| Open / still open | `--d-open` | `#EB6834` |
| Time-to-close buckets (ordered) | `--d-o1` to `--d-o5` | one blue ramp, light to dark |
| Context (non-selected) | `--d-ctx` | `#B4BCB8` |
| Selection | `--d-sel` | `#0B5D4D` |

All sets that appear together pass the dataviz validator (color-vision
separation and normal-vision floors). Amber is below 3:1 on white, so amber
series always carry labels or a table view. Gray is never a data series.

### Missing, zero and unavailable

- `0` is a measured zero.
- `n/a` means the measure does not apply (too few residents or requests).
- `not inspected` (or another plain-language reason) means no data exists;
  it never reads as a good result.
- A log-scale axis shows zero values in a separate shaded band.

## 5. Writing

- Findings are fixed templates filled with computed numbers. No generated prose.
- Lead with counts, then rates ("39 reports vs 7.5 expected, up 422%").
- Name the unit honestly ("street-name and request-type pairs", not "locations").
- Describe patterns, never causes. Say when a comparison is within the margin of error.
- Rates count requests, not people; say so where rates appear.

## 6. Accessibility

- Text contrast at least 4.5:1 (muted text 4.7:1 on canvas).
- Visible focus ring (`--accent`), keyboard readouts on every chart.
- Charts have `role="img"` and an `aria-label` pointing to the Table tab.
- Labels and tooltips use `textContent`, never HTML from data.
- No horizontal page scroll at 390px; wide tables scroll inside their container
  with the first column sticky.

## 7. Search and sharing (every City Signals page)

- `<title>` and meta description with "San Francisco" and the page's subject.
- `<h1>` is the visible page title.
- `robots: index, follow`, a canonical URL, Open Graph and Twitter tags with a
  1200x630 image, and WebPage or WebApplication JSON-LD citing the DataSF datasets.
- Listed in `sitemap.njk` and `llms.txt`.
- All tab views are present in the HTML.

## 8. Checklist for a new feature

1. Uses `shell.css` components; page CSS only for genuinely page-specific pieces.
2. Title is a question or finding; subtitle is a computed sentence; window shown.
3. Colors come from the metric table; no new hue without running the validator.
4. Table tab, CSV download, keyboard readout, notes disclosure.
5. Missing, zero and unavailable are distinguishable.
6. Checked at 1440px and 390px with no horizontal scroll and no console errors.
