// Falcon DLP popup — reads /logs from the local agent and renders today's
// counts plus a recent-events list.

const AGENT = "http://127.0.0.1:8765";

const LABELS = {
  US_SSN: "SSN",
  FIN_ACCOUNT: "Account #",
  ABA_ROUTING: "Routing #",
  CREDIT_CARD: "Credit card",
  PERSON: "name",
  EMAIL_ADDRESS: "email",
  PHONE_NUMBER: "phone",
};

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (_) {
    return url || "unknown";
  }
}

function describe(ev) {
  const types = [...new Set((ev.findings || []).map((f) => LABELS[f.type] || f.type))];
  if (ev.verdict === "block") return { text: `${types[0] || "PII"} blocked`, cls: "block" };
  if (ev.verdict === "override") return { text: `${types[0] || "PII"} override`, cls: "block" };
  if (types.length) return { text: `${types.length} ${types.length === 1 ? "item" : "items"} redacted`, cls: "" };
  return { text: "clean", cls: "" };
}

function setConnected(ok) {
  const dot = document.getElementById("dot");
  const status = document.getElementById("status");
  const conn = document.getElementById("conn");
  dot.className = "dot " + (ok ? "active" : "down");
  status.textContent = ok ? "Active" : "Agent down";
  conn.textContent = ok ? "connected" : "not reachable";
}

async function load() {
  try {
    const data = await fetch(`${AGENT}/logs`).then((r) => r.json());
    setConnected(true);

    document.getElementById("redactions").textContent = data.counts.redactions;
    document.getElementById("blocks").textContent = data.counts.blocks;

    const list = document.getElementById("recent");
    const empty = document.getElementById("empty");
    list.innerHTML = "";

    const events = data.recent || [];
    if (!events.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    for (const ev of events.slice(0, 12)) {
      const { text, cls } = describe(ev);
      const li = document.createElement("li");
      const site = document.createElement("span");
      site.className = "site";
      site.textContent = hostOf(ev.url);
      const what = document.createElement("span");
      what.className = "what " + cls;
      what.textContent = text;
      li.append(site, what);
      list.appendChild(li);
    }
  } catch (_) {
    setConnected(false);
  }
}

load();
