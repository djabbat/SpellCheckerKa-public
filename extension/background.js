// ScheckerGe — Service Worker (Manifest V3)
// Принимает запросы от content scripts, вызывает API, возвращает результаты.
// Extension origin обходит CORS, поэтому здесь нет ограничений.

const DEFAULT_API_URL = "https://scheckerge.ge/api/check";

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
    id: "scheckerge-check",
    title: "ScheckerGe: მოირტყა მართლწერა",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "scheckerge-check" && info.selectionText) {
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

async function checkText(text) {
  const url = await getServerUrl();
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function getServerUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ server_url: DEFAULT_API_URL }, items => {
      resolve(items.server_url);
    });
  });
}
