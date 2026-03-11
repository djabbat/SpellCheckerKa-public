const DEFAULT_URL = "https://scheckerge.ge/api/check";
const input       = document.getElementById("server-url");
const statusBar   = document.getElementById("status-bar");

// ─── Load saved URL ───

chrome.storage.sync.get({ server_url: DEFAULT_URL }, (items) => {
  input.value = items.server_url;
});

// ─── Save ───

document.getElementById("btn-save").addEventListener("click", () => {
  const url = input.value.trim() || DEFAULT_URL;
  chrome.storage.sync.set({ server_url: url }, () => {
    setStatus("✓ შენახულია", "ok");
  });
});

// ─── Test connection ───

document.getElementById("btn-test").addEventListener("click", async () => {
  const url = input.value.trim() || DEFAULT_URL;
  setStatus("⏳ მოწმდება კავშირი...", "info");

  try {
    const resp = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text: "გამარჯობა" })
    });

    if (resp.ok) {
      const data = await resp.json();
      setStatus(`✓ კავშირი წარმატებულია (${data.total_words} სიტყვა)`, "ok");
    } else {
      setStatus(`❌ HTTP ${resp.status}`, "err");
    }
  } catch (e) {
    setStatus("❌ სერვერი მიუწვდომელია: " + e.message, "err");
  }
});

function setStatus(msg, type) {
  statusBar.textContent  = msg;
  statusBar.className    = "status-" + type;
}
