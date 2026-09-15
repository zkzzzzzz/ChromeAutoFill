const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const http = require("http");

const EXT_PATH = path.resolve(__dirname, "..");

// Allow pinning a specific Chromium build via env var (useful in sandboxes
// where the installed browser version doesn't match the npm package's
// expected version). Falls back to Playwright's own resolution otherwise.
const EXECUTABLE_PATH = process.env.PW_CHROMIUM_PATH || undefined;

/**
 * Launches a persistent Chromium context with the extension loaded, and
 * resolves once the extension's background service worker is up.
 * Returns { context, extensionId, close }.
 */
async function launchWithExtension(profileName) {
  const userDataDir = path.resolve(
    __dirname,
    ".tmp-profiles",
    profileName || `profile-${Date.now()}`
  );
  fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(userDataDir), { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    executablePath: EXECUTABLE_PATH,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      "--headless=new",
      "--no-sandbox",
    ],
  });

  let sw = context.serviceWorkers()[0];
  if (!sw) {
    sw = await context.waitForEvent("serviceworker", { timeout: 10000 });
  }
  const extensionId = new URL(sw.url()).host;

  return {
    context,
    extensionId,
    serviceWorker: sw,
    close: async () => {
      await context.close();
      fs.rmSync(userDataDir, { recursive: true, force: true });
    },
  };
}

/** Sets chrome.storage.sync rules via the extension's own background context. */
async function setRules(serviceWorker, rules) {
  await serviceWorker.evaluate((rules) => {
    return new Promise((resolve) => chrome.storage.sync.set({ rules }, resolve));
  }, rules);
}

/** Serves a raw HTML string over http:// (closer to real usage than file://). */
async function serveHtml(html) {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  return {
    url: `http://localhost:${port}/`,
    close: () => server.close(),
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

module.exports = { launchWithExtension, setRules, serveHtml, assert, EXT_PATH };
