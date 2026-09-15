// Falcon DLP content script.
// Runs at document_start and hooks paste in the CAPTURE phase, so we see the
// text before the AI site's own paste handler does. If the local agent says
// "block", we cancel the paste and show a banner offering a sanitized paste
// or a logged override.

const AGENT = "http://127.0.0.1:8765";

document.addEventListener(
  "paste",
  async (e) => {
    const text = (e.clipboardData || window.clipboardData).getData("text");
    if (!text || text.length < 8) return;

    // Remember where the paste was headed so the buttons can act on it.
    const target = e.target;

    let res = null;
    try {
      res = await fetch(`${AGENT}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, url: location.href }),
      }).then((r) => r.json());
    } catch (_) {
      // Agent down: fail OPEN for the prototype (don't wedge the user's
      // browser). The URLBlocklist policy is the hard backstop; this hook is
      // the "allow but police" layer. Backend availability is what the popup
      // connection dot surfaces.
      return;
    }

    if (res && res.verdict === "block") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      showBanner(res.findings, res.redacted, text, target);
    }
  },
  true
);

// Insert text into the element the paste was aimed at. execCommand("insertText")
// works for both <textarea>/<input> and contenteditable composers (which is
// what ChatGPT, Claude, and Gemini use), and keeps the site's input events firing.
function insertText(target, value) {
  if (target && typeof target.focus === "function") target.focus();
  const ok = document.execCommand && document.execCommand("insertText", false, value);
  if (ok) return;
  // Fallback for plain form fields if execCommand is unavailable.
  if (target && "value" in target) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    target.value = target.value.slice(0, start) + value + target.value.slice(end);
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

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

function showBanner(findings, redacted, original, target) {
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
  msg.textContent = `Paste blocked — Contains client PII: ${kinds}. A sanitized version is ready.`;

  const sanitizedBtn = document.createElement("button");
  sanitizedBtn.textContent = "Paste sanitized";
  const overrideBtn = document.createElement("button");
  overrideBtn.textContent = "Override and log";

  for (const b of [sanitizedBtn, overrideBtn]) {
    Object.assign(b.style, {
      cursor: "pointer",
      border: "0",
      borderRadius: "6px",
      padding: "8px 12px",
      fontWeight: "600",
    });
  }
  Object.assign(sanitizedBtn.style, { background: "#fff", color: "#b00020" });
  Object.assign(overrideBtn.style, {
    background: "transparent",
    color: "#fff",
    border: "1px solid rgba(255,255,255,.6)",
  });

  sanitizedBtn.onclick = () => {
    insertText(target, redacted);
    bar.remove();
  };

  overrideBtn.onclick = async () => {
    try {
      await fetch(`${AGENT}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: location.href, findings }),
      });
    } catch (_) {
      /* still let the user proceed; the block already happened locally */
    }
    insertText(target, original);
    bar.remove();
  };

  bar.append(msg, sanitizedBtn, overrideBtn);
  (document.body || document.documentElement).appendChild(bar);
}
