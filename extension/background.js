// Falcon DLP service worker.
// Lightweight domain tracking: notes the last AI site seen so the popup can
// show context, and keeps a heartbeat on the local agent's health so the
// popup's connection dot is accurate even before /logs is fetched.

const AGENT = "http://127.0.0.1:8765";
const AI_HOSTS = [
  "chatgpt.com",
  "chat.openai.com",
  "claude.ai",
  "gemini.google.com",
  "copilot.microsoft.com",
];

chrome.tabs?.onUpdated.addListener((_tabId, info, tab) => {
  if (!info.url && !tab?.url) return;
  try {
    const host = new URL(info.url || tab.url).hostname;
    if (AI_HOSTS.some((h) => host.endsWith(h))) {
      chrome.storage.local.set({ lastAiSite: host, lastSeen: Date.now() });
    }
  } catch (_) {
    /* non-http URL, ignore */
  }
});

async function checkAgent() {
  let ok = false;
  try {
    const r = await fetch(`${AGENT}/health`);
    ok = r.ok;
  } catch (_) {
    ok = false;
  }
  chrome.storage.local.set({ agentOk: ok, agentCheckedAt: Date.now() });
}

// Poll agent health on a light interval.
chrome.runtime.onInstalled.addListener(checkAgent);
chrome.runtime.onStartup?.addListener(checkAgent);
chrome.alarms?.create("agent-health", { periodInMinutes: 1 });
chrome.alarms?.onAlarm.addListener((a) => {
  if (a.name === "agent-health") checkAgent();
});
