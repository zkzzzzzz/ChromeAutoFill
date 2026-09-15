// End-to-end pass through the settings UI itself: add rows, fill them,
// save, reload, and confirm the data round-trips through chrome.storage.
const { launchWithExtension, assert } = require("./helpers");

module.exports = async function run() {
  const { context, extensionId, close } = await launchWithExtension("options-ui");
  try {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    // Options page starts empty (shows the empty-state message) - the
    // first row also has to be created via "+ Add rule".
    await page.click("#addRow");
    await page.fill(".rule-row:nth-child(1) input.match", "first pet");
    await page.fill(".rule-row:nth-child(1) input.selector", "#kba9_response");
    await page.fill(".rule-row:nth-child(1) input.value", "Larry");

    await page.click("#addRow");
    await page.fill(".rule-row:nth-child(2) input.match", "first job");
    await page.fill(".rule-row:nth-child(2) input.value", "Seattle");

    await page.click("#save");
    await page.waitForSelector("#status.show", { timeout: 3000 });

    await page.reload();
    await page.waitForTimeout(300);

    const rowCount = await page.locator(".rule-row").count();
    const match0 = await page.locator(".rule-row:nth-child(1) input.match").inputValue();
    const selector0 = await page.locator(".rule-row:nth-child(1) input.selector").inputValue();
    const value0 = await page.locator(".rule-row:nth-child(1) input.value").inputValue();
    const match1 = await page.locator(".rule-row:nth-child(2) input.match").inputValue();

    assert(rowCount === 2, `expected 2 persisted rules, got ${rowCount}`);
    assert(match0 === "first pet", `row 1 match mismatch: "${match0}"`);
    assert(selector0 === "#kba9_response", `row 1 selector mismatch: "${selector0}"`);
    assert(value0 === "Larry", `row 1 value mismatch: "${value0}"`);
    assert(match1 === "first job", `row 2 match mismatch: "${match1}"`);

    // Delete button should remove a row and, once all rows are gone, show
    // the empty state instead of an empty list.
    await page.click(".rule-row:nth-child(2) .del-btn");
    await page.click(".rule-row:nth-child(1) .del-btn");
    const emptyVisible = await page.locator(".empty-state").isVisible();
    assert(emptyVisible, "empty state did not appear after deleting all rules");
  } finally {
    await close();
  }
};
