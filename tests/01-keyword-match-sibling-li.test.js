// Reproduces the real-world case that motivated this rule: question text
// and answer field are sibling <li> elements (Azure AD B2C security
// questions), and only 2 of 3 possible questions render per visit.
const { launchWithExtension, setRules, serveHtml, assert } = require("./helpers");
const { AZURE_B2C_STYLE } = require("./fixtures");

module.exports = async function run() {
  const { context, serviceWorker, close } = await launchWithExtension("kw-sibling");
  const site = await serveHtml(AZURE_B2C_STYLE);
  try {
    await setRules(serviceWorker, [
      { match: "first car", selector: "", value: "Toyota Corolla" },
      { match: "first job", selector: "", value: "Seattle" },
      // Third question never rendered on this page - must not misfire.
      { match: "maiden name", selector: "", value: "should-not-appear" },
    ]);

    const page = await context.newPage();
    await page.goto(site.url);
    await page.waitForTimeout(800);

    const car = await page.inputValue("#kba1_response");
    const job = await page.inputValue("#kba3_response");

    assert(car === "Toyota Corolla", `expected car answer, got "${car}"`);
    assert(job === "Seattle", `expected job answer, got "${job}"`);
  } finally {
    site.close();
    await close();
  }
};
