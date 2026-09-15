// Clicking the toolbar icon must open the rule settings page directly
// (regression test for the "clicking the icon does nothing" bug).
const { launchWithExtension, assert } = require("./helpers");

module.exports = async function run() {
  const { context, serviceWorker, close } = await launchWithExtension("icon-click");
  try {
    await serviceWorker.evaluate(() => chrome.runtime.openOptionsPage());
    await new Promise((r) => setTimeout(r, 1200));

    const optionsPage = context.pages().find((p) => p.url().includes("options.html"));
    assert(optionsPage, "toolbar icon click did not open the options page");

    await optionsPage.waitForLoadState();
    const title = await optionsPage.title();
    assert(title.includes("SmartFill"), `unexpected options page title: "${title}"`);
  } finally {
    await close();
  }
};
