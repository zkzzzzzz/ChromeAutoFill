// Clicking the toolbar icon opens the rule settings page directly.
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
