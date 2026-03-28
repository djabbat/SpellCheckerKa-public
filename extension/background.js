// SpellCheckerKa — Service Worker (Manifest V3)
// Принимает запросы от content scripts, вызывает API, возвращает результаты.
// Extension origin обходит CORS, поэтому здесь нет ограничений.

const DEFAULT_API_URL = "https://spellcheckerka.drjaba.com/api/check";

// ─────────────────────────────────────────────
// Слушатель сообщений от content scripts
// ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "CHECK_TEXT") {
    checkText(msg.text)
      .then(result => sendResponse({ ok: true, data: result }))
      .catch(err  => sendResponse({ ok: false, error: err.message }));
    return true; // keep channel open for async response
  }

  if (msg.type === "GET_SERVER_URL") {
    getServerUrl().then(url => sendResponse({ url }));
    return true;
  }
});

// ─────────────────────────────────────────────
// Keyboard shortcut command
// ─────────────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  if (command === "check-spelling") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_CHECK" });
      }
    });
  }
});

// ─────────────────────────────────────────────
// Context menu: check selected text
// ─────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "spellcheckerka-check",
    title: "SpellCheckerKa: მოირტყა მართლწერა",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "spellcheckerka-check" && info.selectionText) {
    checkText(info.selectionText)
      .then(result => {
        chrome.tabs.sendMessage(tab.id, {
          type: "SHOW_RESULT",
          data: result,
          text: info.selectionText
        });
      })
      .catch(() => {});
  }
});

// ─────────────────────────────────────────────
// API call
// ─────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8000;
const MAX_RETRIES      = 2;

async function checkText(text, attempt = 0) {
  const url        = await getServerUrl();
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text }),
      signal:  controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  } catch (err) {
    clearTimeout(timer);
    // Retry on network errors (not on 4xx/5xx — those are definitive)
    if (attempt < MAX_RETRIES && (err.name === "AbortError" || err.name === "TypeError")) {
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));  // backoff
      return checkText(text, attempt + 1);
    }
    throw err;
  }
}

async function getServerUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ server_url: DEFAULT_API_URL }, items => {
      resolve(items.server_url);
    });
  });
}
