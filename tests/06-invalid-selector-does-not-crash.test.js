// A malformed CSS selector in a rule (e.g. user typo) must be skipped
// quietly instead of throwing and blocking every other rule on the page.
const { launchWithExtension, setRules, serveHtml, assert } = require("./helpers");
const { STANDARD_LABEL_STYLE } = require("./fixtures");

module.exports = async function run() {
  const { context, serviceWorker, close } = await launchWithExtension("bad-selector");
  const site = await serveHtml(STANDARD_LABEL_STYLE);
  try {
    await setRules(serviceWorker, [
      { match: "", selector: "###not-valid[[[", value: "should-not-crash" },
      { match: "first pet", selector: "", value: "Larry" },
    ]);

    const page = await context.newPage();
    const consoleErrors = [];
    page.on("pageerror", (err) => consoleErrors.push(String(err)));

    await page.goto(site.url);
    await page.waitForTimeout(500);

    const value = await page.inputValue("#q_pet");
    assert(value === "Larry", `valid rule should still apply despite bad selector elsewhere, got "${value}"`);
    assert(consoleErrors.length === 0, `page threw errors: ${consoleErrors.join(", ")}`);
  } finally {
    site.close();
    await close();
  }
};
