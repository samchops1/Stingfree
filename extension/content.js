// Falcon DLP content script.
//
// Two browser capture points, both in the CAPTURE phase so we act before the
// AI site's own handlers:
//   1. PASTE  — scan the pasted text before the site sees it.
//   2. SUBMIT — scan the whole composer when the user presses Enter or clicks
//               the send button (closes the "typed it, then hit Send" gap that
//               paste-only scanning misses).
//
// On a block we cancel the action and show a banner with "Paste sanitized"
// (swap in the redacted text) and "Override and log" (proceed, with a logged
// justification).
//
// HONEST LIMIT: submit interception is best-effort and site-specific. Sending
// a clean message programmatically relies on finding the send button (or
// re-dispatching Enter); the heuristics below cover ChatGPT/Claude/Gemini/
// Copilot but should be re-verified when those UIs change. The paste hook is
// the reliable path; on-submit is defense-in-depth.

const AGENT = "http://127.0.0.1:8765";

// Send-button heuristics, most specific first.
const SEND_SELECTORS = [
  '[data-testid="send-button"]',
  'button[data-testid="send-button"]',
  'button[aria-label="Send message"]',
  'button[aria-label*="Send" i]',
  'button[aria-label*="Submit" i]',
];

// --- helpers ----------------------------------------------------------------

function isEditable(el) {
  if (!el) return false;
  const tag = el.tagName;
  return el.isContentEditable || tag === "TEXTAREA" || (tag === "INPUT" && el.type === "text");
}

// Walk up from a node to the nearest editable (composers nest spans/divs).
function editableFrom(node) {
  let el = node;
  while (el && el !== document.body) {
    if (isEditable(el)) return el;
    el = el.parentElement;
  }
  return isEditable(document.activeElement) ? document.activeElement : null;
}

function readText(el) {
  if (!el) return "";
  if (el.isContentEditable) return el.innerText || "";
  return el.value || "";
}

function replaceText(el, value) {
  if (!el) return;
  el.focus();
  try {
    if (el.isContentEditable) {
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, value);
      return;
    }
    el.select();
    if (document.execCommand("insertText", false, value)) return;
  } catch (_) {
    /* fall through */
  }
  if ("value" in el) {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function findSendButton(fromEl) {
  for (const sel of SEND_SELECTORS) {
    const btn = document.querySelector(sel);
    if (btn && !btn.disabled) return btn;
  }
  return null;
}

async function scan(text) {
  try {
    return await fetch(`${AGENT}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, url: location.href }),
    }).then((r) => r.json());
  } catch (_) {
    // Agent down: fail OPEN for the prototype (don't wedge the browser).
    return null;
  }
}

// Programmatically send a message we've decided is clean/overridden.
let passThrough = false;
function performSend(editable) {
  const btn = findSendButton(editable);
  if (btn) {
    btn.click();
    return;
  }
  // Fallback: re-dispatch Enter, flagged so our own handler lets it through.
  passThrough = true;
  const ev = new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
  });
  (editable || document.activeElement)?.dispatchEvent(ev);
  passThrough = false;
}

// --- PASTE vector -----------------------------------------------------------

document.addEventListener(
  "paste",
  async (e) => {
    const text = (e.clipboardData || window.clipboardData).getData("text");
    if (!text || text.length < 8) return;
    const target = e.target;

    const res = await scan(text);
    if (res && res.action === "block") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      showBanner({ findings: res.findings, redacted: res.redacted, original: text, editable: editableFrom(target) });
    }
  },
  true
);

// --- SUBMIT vector ----------------------------------------------------------

document.addEventListener(
  "keydown",
  async (e) => {
    if (passThrough) return; // our own re-dispatch of a cleared message
    if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;

    const editable = editableFrom(e.target);
    if (!editable) return;
    const text = readText(editable).trim();
    if (text.length < 8) return;

    // We can't scan synchronously, so stop this send and decide after.
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const res = await scan(text);
    if (!res) {
      // Agent down: fail open — let the message go.
      performSend(editable);
      return;
    }
    if (res.action === "block" || res.action === "redact") {
      showBanner({ findings: res.findings, redacted: res.redacted, original: text, editable, isSubmit: true });
    } else {
      performSend(editable); // clean (allow/monitor)
    }
  },
  true
);

// Also catch clicks on the send button (typed text, sent by mouse).
document.addEventListener(
  "click",
  async (e) => {
    if (passThrough) return;
    const btn = e.target.closest && e.target.closest(SEND_SELECTORS.join(","));
    if (!btn) return;
    const editable = editableFrom(document.activeElement) || document.querySelector('[contenteditable="true"], textarea');
    const text = readText(editable).trim();
    if (text.length < 8) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const res = await scan(text);
    if (!res) {
      performSend(editable);
      return;
    }
    if (res.action === "block" || res.action === "redact") {
      showBanner({ findings: res.findings, redacted: res.redacted, original: text, editable, isSubmit: true });
    } else {
      performSend(editable);
    }
  },
  true
);

// --- banner -----------------------------------------------------------------

function summarizeFindings(findings) {
  const labels = {
    US_SSN: "SSN",
    FIN_ACCOUNT: "account number",
    ABA_ROUTING: "routing number",
    CREDIT_CARD: "credit card",
    PERSON: "name",
    EMAIL_ADDRESS: "email",
    PHONE_NUMBER: "phone",
  };
  const types = [...new Set((findings || []).map((f) => labels[f.type] || f.type))];
  return types.length ? types.join(", ") : "client PII";
}

function showBanner({ findings, redacted, original, editable, isSubmit }) {
  document.getElementById("falcon-dlp-banner")?.remove();

  const kinds = summarizeFindings(findings);
  const bar = document.createElement("div");
  bar.id = "falcon-dlp-banner";
  bar.setAttribute("role", "alert");
  Object.assign(bar.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    zIndex: "2147483647",
    background: "#b00020",
    color: "#fff",
    font: "14px/1.4 -apple-system, Segoe UI, Roboto, sans-serif",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,.3)",
  });

  const msg = document.createElement("span");
  msg.style.flex = "1";
  const verb = isSubmit ? "Send blocked" : "Paste blocked";
  msg.textContent = `${verb} — Contains client PII: ${kinds}. A sanitized version is ready.`;

  const sanitizedBtn = document.createElement("button");
  sanitizedBtn.textContent = "Use sanitized";
  const overrideBtn = document.createElement("button");
  overrideBtn.textContent = "Override and log";

  for (const b of [sanitizedBtn, overrideBtn]) {
    Object.assign(b.style, { cursor: "pointer", border: "0", borderRadius: "6px", padding: "8px 12px", fontWeight: "600" });
  }
  Object.assign(sanitizedBtn.style, { background: "#fff", color: "#b00020" });
  Object.assign(overrideBtn.style, { background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.6)" });

  sanitizedBtn.onclick = () => {
    replaceText(editable, redacted);
    bar.remove();
    // On submit, leave it to the user to review + press Send again.
  };

  overrideBtn.onclick = async () => {
    const reason = window.prompt(
      "Override requires a reason (logged for compliance / Rule 204-2):",
      ""
    );
    if (reason === null || reason.trim() === "") {
      // Cancelled or empty — keep it blocked.
      return;
    }
    try {
      await fetch(`${AGENT}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: location.href, findings, reason: reason.trim() }),
      });
    } catch (_) {
      /* proceed anyway; the block already happened locally */
    }
    bar.remove();
    if (isSubmit) {
      replaceText(editable, original);
      performSend(editable);
    } else {
      replaceText(editable, original);
    }
  };

  bar.append(msg, sanitizedBtn, overrideBtn);
  (document.body || document.documentElement).appendChild(bar);
}
