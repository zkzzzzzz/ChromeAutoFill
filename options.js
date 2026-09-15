const rulesBody = document.getElementById("rulesBody");
const statusEl = document.getElementById("status");
let statusTimer = null;

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function clearEmptyState() {
  const empty = rulesBody.querySelector(".empty-state");
  if (empty) empty.remove();
}

function showEmptyStateIfNeeded() {
  if (rulesBody.querySelector(".rule-row")) return;
  const div = document.createElement("div");
  div.className = "empty-state";
  div.textContent = "No rules yet — click “+ Add rule” to create one.";
  rulesBody.appendChild(div);
}

function addRow(match = "", selector = "", value = "") {
  clearEmptyState();
  const row = document.createElement("div");
  row.className = "rule-row";
  row.innerHTML = `
    <input type="text" class="match" value="${escapeHtml(match)}" placeholder="e.g. first car">
    <input type="text" class="selector" value="${escapeHtml(selector)}" placeholder="e.g. #kba1_response">
    <input type="text" class="value" value="${escapeHtml(value)}" placeholder="e.g. Corolla">
    <button class="del-btn" title="Delete rule" aria-label="Delete rule">&#x2715;</button>
  `;
  row.querySelector(".del-btn").addEventListener("click", () => {
    row.remove();
    showEmptyStateIfNeeded();
  });
  rulesBody.appendChild(row);
  return row;
}

function load() {
  chrome.storage.sync.get({ rules: [] }, (data) => {
    const rules = data.rules || [];
    if (rules.length) {
      rules.forEach((r) => addRow(r.match, r.selector, r.value));
    } else {
      showEmptyStateIfNeeded();
    }
  });
}

document.getElementById("addRow").addEventListener("click", () => {
  const row = addRow();
  row.querySelector(".match").focus();
});

document.getElementById("save").addEventListener("click", () => {
  const rows = rulesBody.querySelectorAll(".rule-row");
  const rules = [];
  rows.forEach((row) => {
    const match = row.querySelector(".match").value.trim();
    const selector = row.querySelector(".selector").value.trim();
    const value = row.querySelector(".value").value;
    if (match || selector) rules.push({ match, selector, value });
  });
  chrome.storage.sync.set({ rules }, () => {
    statusEl.classList.add("show");
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => statusEl.classList.remove("show"), 1600);
  });
});

load();
