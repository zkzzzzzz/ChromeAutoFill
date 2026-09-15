// A rule with a CSS selector should fill the field directly, without
// needing any matching text nearby, and even when a keyword rule also
// exists for the same field.
const { launchWithExtension, setRules, serveHtml, assert } = require("./helpers");
const { STANDARD_LABEL_STYLE } = require("./fixtures");

module.exports = async function run() {
  const { context, serviceWorker, close } = await launchWithExtension("selector-priority");
  const site = await serveHtml(STANDARD_LABEL_STYLE);
  try {
    await setRules(serviceWorker, [
      // No "match" text at all - selector-only rule.
      { match: "", selector: "#q_pet", value: "Larry" },
      // Deliberately wrong keyword for q_city, but a correct selector
      // should still win since selector rules are applied first.
      { match: "this text does not appear anywhere", selector: "#q_city", value: "San Jose" },
    ]);

    const page = await context.newPage();
    await page.goto(site.url);
    await page.waitForTimeout(500);

    assert((await page.inputValue("#q_pet")) === "Larry", "selector-only rule failed");
    assert((await page.inputValue("#q_city")) === "San Jose", "selector should win over absent keyword match");
  } finally {
    site.close();
    await close();
  }
};
