// KBA Security Question Autofill - content script
//
// Logic: read the rules the user configured on the options page
// ({match, value} pairs). For every input on the page, gather whatever
// surrounding text we can find (label / aria-label / placeholder /
// parent element text, etc.), and if it contains a rule's match
// keyword, fill that rule's value into the input.

(function () {
  let rules = [];

  function normalize(s) {
    return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function loadRules(cb) {
    chrome.storage.sync.get({ rules: [] }, (data) => {
      rules = Array.isArray(data.rules) ? data.rules : [];
      if (cb) cb();
    });
  }

  // Some forms (e.g. Azure AD B2C security-question pages) render the
  // question text in a sibling <li> right before the answer field's own
  // <li>, rather than as an ancestor of the input. Walk backwards through
  // preceding siblings of the input's containing <li> to find the nearest
  // one with real text - that's almost always the paired question.
  function getPrecedingSiblingQuestionText(input) {
    const li = input.closest("li");
    if (!li) return "";
    let sib = li.previousElementSibling;
    while (sib) {
      const clone = sib.cloneNode(true);
      clone
        .querySelectorAll("input, select, textarea, script, style")
        .forEach((n) => n.remove());
      // aria-label often carries the exact question text even when the
      // visible text node is the same, so prefer it when present.
      const ariaEl = sib.querySelector("[aria-label]");
      const ariaText = ariaEl ? ariaEl.getAttribute("aria-label") : "";
      const t = (ariaText || clone.textContent || "").trim();
      if (t) return t;
      sib = sib.previousElementSibling;
    }
    return "";
  }

  // Collect the text clue(s) near an input that most likely contain the
  // "question text" associated with it. This is tiered on purpose: once we
  // have a *specific*, per-field signal (a real <label for>, aria
  // attributes, a paired sibling question, placeholder/name/id), we stop
  // there. We only fall back to walking up ancestor containers when none
  // of those exist - because ancestor text is shared with every sibling
  // field too, and mixing it in when we already have a precise signal
  // causes false matches on *other* fields on the same page (e.g. two
  // <label>/<input> pairs directly under one <form>).
  function getFieldContextText(input) {
    const specific = [];

    const siblingQuestion = getPrecedingSiblingQuestionText(input);
    if (siblingQuestion) specific.push(siblingQuestion);

    if (input.id) {
      const label = document.querySelector(`label[for="${cssEscape(input.id)}"]`);
      if (label) specific.push(label.textContent);
    }

    const ariaLabel = input.getAttribute("aria-label");
    if (ariaLabel) specific.push(ariaLabel);

    const labelledby = input.getAttribute("aria-labelledby");
    if (labelledby) {
      labelledby.split(/\s+/).forEach((id) => {
        const el = document.getElementById(id);
        if (el) specific.push(el.textContent);
      });
    }

    if (input.placeholder) specific.push(input.placeholder);
    if (input.name) specific.push(input.name);
    if (input.id) specific.push(input.id);

    if (specific.length) return normalize(specific.join(" | "));

    // Last resort: no precise signal found anywhere. Look at the input's
    // own immediate wrapper and list item only - never further up into a
    // shared <ul>/<form>, which would mix in every other field's text too.
    const fallback = [];
    let el = input;
    for (let depth = 0; depth < 2 && el && el.parentElement; depth++) {
      el = el.parentElement;
      const clone = el.cloneNode(true);
      clone
        .querySelectorAll("input, select, textarea, script, style")
        .forEach((n) => n.remove());
      const t = clone.textContent;
      if (t && t.trim()) fallback.push(t);
      if (el.tagName === "LI") break; // stop once we've covered the list item
    }
    return normalize(fallback.join(" | "));
  }

  function cssEscape(id) {
    if (window.CSS && CSS.escape) return CSS.escape(id);
    return id.replace(/([^\w-])/g, "\\$1");
  }

  function fillValue(input, value) {
    const proto = Object.getPrototypeOf(input);
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) {
      desc.set.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function isCandidateInput(input) {
    if (input.disabled || input.readOnly) return false;
    const type = (input.getAttribute("type") || "text").toLowerCase();
    return ["text", "password", "tel", "email", "search"].includes(type);
  }

  function applyRule(input, rule) {
    if (input.dataset.kbaFilled === "1") return false;
    if (input.value) return false; // never overwrite something the user already typed
    fillValue(input, rule.value);
    input.dataset.kbaFilled = "1";
    return true;
  }

  function tryFillAll() {
    if (!rules.length) return;

    // Selector-based rules: most reliable, applied first, independent of
    // any text matching.
    rules.forEach((rule) => {
      const selector = (rule.selector || "").trim();
      if (!selector) return;
      let matches;
      try {
        matches = document.querySelectorAll(selector);
      } catch (e) {
        return; // invalid selector, skip quietly
      }
      matches.forEach((input) => {
        if (isCandidateInput(input)) applyRule(input, rule);
      });
    });

    // Keyword-based rules: fall back to matching nearby text.
    const keywordRules = rules.filter((r) => normalize(r.match));
    if (!keywordRules.length) return;

    const inputs = document.querySelectorAll("input");
    inputs.forEach((input) => {
      if (!isCandidateInput(input)) return;
      if (input.dataset.kbaFilled === "1") return;
      if (input.value) return;

      const context = getFieldContextText(input);
      for (const rule of keywordRules) {
        const match = normalize(rule.match);
        if (match && context.includes(match)) {
          applyRule(input, rule);
          break;
        }
      }
    });
  }

  loadRules(() => {
    tryFillAll();

    // Many security questions only appear after a dropdown selection or
    // an async page update, so keep watching for DOM changes.
    const observer = new MutationObserver(() => {
      clearTimeout(window.__kbaFillTimer);
      window.__kbaFillTimer = setTimeout(tryFillAll, 150);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.rules) {
      rules = changes.rules.newValue || [];
      tryFillAll();
    }
  });
})();
