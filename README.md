# SmartFill (Chrome Extension)

SmartFill automatically fills in form fields — most commonly security /
knowledge-based-auth (KBA) questions like *"What was your first car?"* —
based on rules you define yourself. It's a generic, site-agnostic matcher:
nothing in the extension is hardcoded to any particular website. You
maintain the rules; the extension just watches pages and applies them.

## Contents

- [How it works](#how-it-works)
- [Install (developer mode)](#install-developer-mode)
- [Configuring rules](#configuring-rules)
- [Matching behavior in detail](#matching-behavior-in-detail)
- [Files](#files)
- [Running the tests](#running-the-tests)
- [Privacy](#privacy)
- [Limitations / troubleshooting](#limitations--troubleshooting)

## How it works

A **content script** (`content.js`) runs on every page you visit. It reads
the rules you saved on the **options page** (`options.html` /
`options.js`), then scans the page's `<input>` elements. For each input,
it decides whether a rule applies using one of two strategies, and if so,
fills the input's value and dispatches the events a real page would expect
(`input`, `change`) so frameworks like React/Vue pick up the change too.

Because matching is done per-input and by content rather than by page URL,
one rule set works across different pages and even different sites: if a
site shows only 2 of 3 possible security questions on any given visit
(a common KBA pattern), you can configure all 3 answers as separate rules
and whichever 2 happen to render will be filled — the third rule simply
finds nothing to match and does nothing.

A `MutationObserver` keeps watching after the initial page load, so fields
that appear later (after a dropdown selection, an AJAX call, or any DOM
update) get filled too, without needing a page reload.

SmartFill **never overwrites a field that already has a value** — so if
you've started typing, or a previous fill already happened, it won't stomp
on it.

## Install (developer mode)

1. Clone this repo (or download it) onto your computer.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this project's folder.
5. Click the SmartFill icon in the toolbar — it opens the rule settings
   page directly. (If you don't see the icon, click the puzzle-piece
   "Extensions" icon in the toolbar and pin SmartFill.)

After changing any of the extension's own files, go back to
`chrome://extensions` and click the refresh icon on the SmartFill card to
reload it.

## Configuring rules

Each rule has three parts:

| Field | Required? | Meaning |
|---|---|---|
| **Match keyword** | One of match/selector required | A substring to look for in the text near a field (its label, placeholder, or a preceding question). Case-insensitive. |
| **CSS selector** | One of match/selector required | A specific selector (e.g. `#kba1_response`, `input[name="answer2"]`) that directly targets the field. Checked first, and doesn't need any matching text. |
| **Value to fill in** | Yes | What gets typed into the field when the rule matches. |

**When to use which:** if you know a field's `id` or a stable selector
(open DevTools, right-click the field → Inspect), use a CSS selector — it's
the most reliable, because it doesn't depend on guessing what text is
"nearby." If the field's id changes between visits, or you'd rather not
dig through DevTools, use a match keyword against the question text
instead — that's the generic, no-inspection-required option, and it's what
handles the "2 of 3 questions, randomly" case well since it keys off the
question's own wording.

You can mix both kinds of rules freely. Selector-based rules are applied
first; keyword-based rules are applied afterward, only to fields no
selector rule already claimed.

## Matching behavior in detail

For a keyword rule, SmartFill looks for context text in this priority
order, stopping at the first one that finds something:

1. A sibling list item's text — covers layouts (e.g. Azure AD B2C security
   question pages) where the question `<p>` and the answer `<input>` are
   side-by-side `<li>` elements rather than parent/child.
2. A real `<label for="...">` pointing at the field.
3. `aria-label` / `aria-labelledby`.
4. `placeholder`, `name`, or `id` attributes on the input itself.
5. As a last resort, if none of the above exist anywhere: the text inside
   the field's immediate parent element or enclosing `<li>` only — never a
   shared ancestor like a `<ul>` or `<form>`, since that text is shared
   with every other field on the page and would cause false matches.

## Files

```
manifest.json    Extension config (Manifest V3)
background.js    Toolbar icon click -> opens the options page
content.js       Injected into every page; scans inputs, matches rules, fills them
options.html     Rule settings UI
options.js       Rule settings logic (reads/writes chrome.storage.sync)
tests/           Automated tests (Playwright) - see below
```

Rules are stored in `chrome.storage.sync`, so they follow you across
Chrome installs signed into the same Google account.

## Running the tests

Tests use [Playwright](https://playwright.dev) to launch a real Chromium
with the unpacked extension loaded, against small mock pages that
reproduce real-world layouts (including the Azure B2C sibling-`<li>`
case), then assert on the filled values.

```bash
npm install
npx playwright install --with-deps chromium
npm test
```

Tests run automatically on every push/PR via GitHub Actions
(`.github/workflows/test.yml`). Current coverage:

| Test | What it checks |
|---|---|
| `01-keyword-match-sibling-li` | Real-world Azure B2C layout; 2 of 3 questions render, each gets the right answer, the absent third rule doesn't misfire |
| `02-standard-label-match` | Plain `<label for>` layout; two independent fields don't leak context into each other |
| `03-css-selector-priority` | Selector-based rules fill correctly and take priority over keyword rules |
| `04-does-not-overwrite-existing-value` | A pre-filled field is left untouched |
| `05-dynamic-content-mutation-observer` | A field injected into the DOM after page load still gets filled |
| `06-invalid-selector-does-not-crash` | A malformed selector in one rule doesn't break other rules or throw page errors |
| `07-toolbar-icon-opens-options` | Clicking the toolbar icon opens the settings page |
| `08-options-ui-add-save-persist` | Add/save/reload/delete flow in the settings UI round-trips correctly through storage |

## Privacy

All rules live only in your own Chrome account's `chrome.storage.sync`.
Nothing is sent to any third-party server — the extension makes no network
requests of its own and does no tracking or analytics.

## Limitations / troubleshooting

- SmartFill fills text-like inputs (`text`, `password`, `tel`, `email`,
  `search`). It does not handle `<select>` dropdowns, checkboxes/radios,
  or rich-text/contenteditable fields.
- If a field still isn't filled: open DevTools, inspect the field for a
  stable `id`, and add a CSS-selector rule for it directly — that sidesteps
  the text-matching heuristics entirely.
- If a keyword rule fires on the wrong field, tighten the keyword (use
  more of the exact question wording) or switch that rule to a CSS
  selector.
