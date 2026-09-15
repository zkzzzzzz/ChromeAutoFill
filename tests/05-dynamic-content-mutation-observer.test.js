// Some pages render the question field asynchronously after page load.
// The content script's MutationObserver must catch it and fill it in
// without a page reload.
const { launchWithExtension, setRules, serveHtml, assert } = require("./helpers");
const { DYNAMIC_STYLE } = require("./fixtures");

module.exports = async function run() {
  const { context, serviceWorker, close } = await launchWithExtension("dynamic-content");
  const site = await serveHtml(DYNAMIC_STYLE);
  try {
    await setRules(serviceWorker, [{ match: "maiden name", selector: "", value: "Nguyen" }]);

    const page = await context.newPage();
    await page.goto(site.url);
    // Field appears ~400ms after load (see fixtures.js); give the
    // MutationObserver time to notice and fill it.
    await page.waitForSelector("#q_maiden", { timeout: 3000 });
    await page.waitForTimeout(500);

    const value = await page.inputValue("#q_maiden");
    assert(value === "Nguyen", `dynamically-added field not filled, got "${value}"`);
  } finally {
    site.close();
    await close();
  }
};
