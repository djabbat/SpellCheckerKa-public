const DEFAULT_URL = "https://spellcheckerka.drjaba.com/api/check";

// ─── Tab switching ───

document.querySelectorAll(".sg-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".sg-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".sg-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
  });
});

// ─── Load saved URL ───

const urlInput = document.getElementById("server-url");
chrome.storage.sync.get({ server_url: DEFAULT_URL }, (items) => {
  urlInput.value = items.server_url;
});

// ─── Settings: save / test ───

document.getElementById("btn-save").addEventListener("click", () => {
  const url = urlInput.value.trim() || DEFAULT_URL;
  chrome.storage.sync.set({ server_url: url }, () => {
    setStatus("✓ შენახულია", "ok");
  });
});

document.getElementById("btn-test").addEventListener("click", async () => {
  const url = urlInput.value.trim() || DEFAULT_URL;
  setStatus("⏳ მოწმდება კავშირი...", "info");
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "გამარჯობა" })
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

// ─── Check: current field ───

document.getElementById("btn-check-field").addEventListener("click", async () => {
  setStatus("⏳ ველის შემოწმება...", "info");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_CHECK" });
    setStatus("✓ შემოწმება გაიგზავნა", "ok");
    switchToResults();
  } catch (e) {
    setStatus("❌ " + e.message, "err");
  }
});

// ─── Check: selected text ───

document.getElementById("btn-check-selection").addEventListener("click", async () => {
  setStatus("⏳ მონიშნულის შემოწმება...", "info");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });
    const text = results[0]?.result || "";
    if (!text.trim()) {
      setStatus("⚠ ტექსტი არ არის მონიშნული", "err");
      return;
    }
    await runCheck(text);
  } catch (e) {
    setStatus("❌ " + e.message, "err");
  }
});

// ─── Check: full page ───

document.getElementById("btn-check-page").addEventListener("click", async () => {
  setStatus("⏳ გვერდის სკანირება...", "info");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractGeorgianText
    });
    const text = results[0]?.result || "";
    if (!text.trim()) {
      setStatus("⚠ ქართული ტექსტი ვერ მოიძებნა", "err");
      return;
    }
    await runCheck(text);
  } catch (e) {
    setStatus("❌ " + e.message, "err");
  }
});

// Injected into page — extracts visible Georgian text
function extractGeorgianText() {
  const GEO = /[\u10D0-\u10FF]/;
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    { acceptNode: (n) => GEO.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
  );
  const parts = [];
  let node;
  while ((node = walker.nextNode())) {
    const trimmed = node.nodeValue.trim();
    if (trimmed) parts.push(trimmed);
  }
  return parts.join(" ");
}

// ─── Core check function ───

async function runCheck(text) {
  const { server_url: url } = await chrome.storage.sync.get({ server_url: DEFAULT_URL });
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!resp.ok) {
      setStatus(`❌ HTTP ${resp.status}`, "err");
      return;
    }
    const data = await resp.json();
    renderResults(data);
    switchToResults();
    const errCount = (data.errors || []).length;
    setStatus(errCount === 0 ? "✓ შეცდომები არ არის" : `⚠ ${errCount} შეცდომა`, errCount === 0 ? "ok" : "err");
  } catch (e) {
    setStatus("❌ სერვერი მიუწვდომელია", "err");
  }
}

// ─── Render results ───

function renderResults(data) {
  const words   = data.total_words  || 0;
  const errors  = (data.errors || []).length;
  const accuracy = words > 0 ? Math.round(((words - errors) / words) * 100) : 100;

  const statWords  = document.getElementById("stat-words");
  const statErrors = document.getElementById("stat-errors");
  const statAcc    = document.getElementById("stat-accuracy");

  statWords.textContent  = words;
  statErrors.textContent = errors;
  statAcc.textContent    = accuracy + "%";

  statErrors.className = "sg-stat-num" + (errors > 0 ? " has-errors" : " ok");
  statAcc.className    = "sg-stat-num" + (accuracy >= 95 ? " ok" : errors > 0 ? " has-errors" : "");

  const list = document.getElementById("error-list");
  if (!errors) {
    list.innerHTML = '<div class="sg-empty">✓ შეცდომები ვერ მოიძებნა</div>';
    return;
  }

  list.innerHTML = "";
  for (const err of data.errors) {
    const item = document.createElement("div");
    item.className = "sg-error-item";

    const wordEl = document.createElement("div");
    wordEl.className = "sg-error-word";
    wordEl.textContent = err.word;
    item.appendChild(wordEl);

    if (err.suggestions && err.suggestions.length) {
      const suggs = document.createElement("div");
      suggs.className = "sg-suggestions";
      for (const s of err.suggestions.slice(0, 5)) {
        const btn = document.createElement("button");
        btn.className = "sg-sugg";
        btn.textContent = s;
        btn.title = "გამოიყენე: " + s;
        suggs.appendChild(btn);
      }
      item.appendChild(suggs);
    }

    list.appendChild(item);
  }
}

// ─── Helpers ───

function switchToResults() {
  document.querySelectorAll(".sg-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".sg-panel").forEach(p => p.classList.remove("active"));
  document.querySelector('[data-tab="results"]').classList.add("active");
  document.getElementById("panel-results").classList.add("active");
}

function setStatus(msg, type) {
  const bar = document.getElementById("status-bar");
  bar.textContent = msg;
  bar.className = "status-" + type;
}
