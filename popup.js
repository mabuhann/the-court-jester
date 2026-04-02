const toggleBtn        = document.getElementById("toggle");
const statusLabel      = document.getElementById("status-label");
const worseBtn         = document.getElementById("worse-btn");
const statPaused       = document.getElementById("stat-paused");
const statProclamations = document.getElementById("stat-proclamations");
const statBehaviors    = document.getElementById("stat-behaviors");

let isEnabled = false;
let isWorse   = false;

/* ── Messaging ─────────────────────────────────────────────────── */

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToContent(msg) {
  try {
    const tab = await getActiveTab();
    if (!tab?.id) return null;
    return await chrome.tabs.sendMessage(tab.id, msg);
  } catch {
    return null;
  }
}

/* ── UI ────────────────────────────────────────────────────────── */

function updateUI() {
  toggleBtn.classList.toggle("is-on", isEnabled);
  toggleBtn.setAttribute("aria-pressed", isEnabled ? "true" : "false");
  statusLabel.textContent = isEnabled ? "Unleashed" : "Dormant";
  statusLabel.classList.toggle("on", isEnabled);

  worseBtn.disabled = !isEnabled;
  worseBtn.classList.toggle("is-active", isWorse && isEnabled);
  worseBtn.textContent = (isWorse && isEnabled) ? "It Cannot Get Worse" : "Make it Worse";
}

function applyStats(s) {
  statPaused.textContent        = s?.videosPaused   ?? "0";
  statProclamations.textContent = s?.proclamations   ?? "0";
  statBehaviors.textContent     = s?.behaviorsFired  ?? "0";
}

async function refreshStats() {
  const res = await sendToContent({ type: "CJ_GET_STATS" });
  if (res?.stats) {
    applyStats(res.stats);
    return;
  }
  // Fallback: read last-known stats from storage
  chrome.storage.local.get("cj_stats", (r) => applyStats(r.cj_stats));
}

/* ── Events ────────────────────────────────────────────────────── */

toggleBtn.addEventListener("click", async () => {
  isEnabled = !isEnabled;
  if (!isEnabled) isWorse = false;

  chrome.storage.local.set({ cj_enabled: isEnabled, cj_worse: isWorse });
  updateUI();

  if (isEnabled) {
    await sendToContent({ type: "CJ_ENABLE" });
    refreshStats();
  } else {
    await sendToContent({ type: "CJ_DISABLE" });
  }
});

worseBtn.addEventListener("click", async () => {
  if (!isEnabled) return;
  isWorse = !isWorse;
  chrome.storage.local.set({ cj_worse: isWorse });
  updateUI();
  await sendToContent({ type: "CJ_WORSE", active: isWorse });
});

/* ── Boot ──────────────────────────────────────────────────────── */

chrome.storage.local.get(["cj_enabled", "cj_worse", "cj_stats"], (result) => {
  isEnabled = result.cj_enabled ?? false;
  isWorse   = result.cj_worse   ?? false;
  updateUI();
  applyStats(result.cj_stats);
  if (isEnabled) refreshStats();
});
