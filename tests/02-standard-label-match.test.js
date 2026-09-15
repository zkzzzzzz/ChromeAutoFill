// The common case: a real <label for="..."> pointing at the input.
const { launchWithExtension, setRules, serveHtml, assert } = require("./helpers");
const { STANDARD_LABEL_STYLE } = require("./fixtures");

module.exports = async function run() {
  const { context, serviceWorker, close } = await launchWithExtension("kw-label");
  const site = await serveHtml(STANDARD_LABEL_STYLE);
  try {
    await setRules(serviceWorker, [
      { match: "first pet", selector: "", value: "Larry" },
      { match: "born in", selector: "", value: "San Jose" },
    ]);

    const page = await context.newPage();
    await page.goto(site.url);
    await page.waitForTimeout(500);

    assert((await page.inputValue("#q_pet")) === "Larry", "pet field not filled correctly");
    assert((await page.inputValue("#q_city")) === "San Jose", "city field not filled correctly");
  } finally {
    site.close();
    await close();
  }
};
