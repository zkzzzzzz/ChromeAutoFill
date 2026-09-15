// SmartFill must never clobber something the user already typed.
const { launchWithExtension, setRules, serveHtml, assert } = require("./helpers");
const { PREFILLED_STYLE } = require("./fixtures");

module.exports = async function run() {
  const { context, serviceWorker, close } = await launchWithExtension("no-overwrite");
  const site = await serveHtml(PREFILLED_STYLE);
  try {
    await setRules(serviceWorker, [{ match: "first pet", selector: "", value: "Larry" }]);

    const page = await context.newPage();
    await page.goto(site.url);
    await page.waitForTimeout(500);

    const value = await page.inputValue("#q_pet");
    assert(value === "AlreadyTyped", `existing value was overwritten, got "${value}"`);
  } finally {
    site.close();
    await close();
  }
};
