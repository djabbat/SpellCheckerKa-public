// ScheckerGe — Generic Content Script
// Работает на всех сайтах кроме Google Docs.
// Подчёркивает ошибки в активном textarea / contenteditable.

(function () {
  "use strict";

  let activeTarget   = null;  // textarea или contenteditable
  let lastText       = "";
  let debounceTimer  = null;
  let panelCreated   = false;

  // ─────────────────────────────────────────────
  // Отслеживаем активный элемент ввода
  // ─────────────────────────────────────────────

  document.addEventListener("focusin", (e) => {
    const el = e.target;
    if (isEditable(el)) {
      activeTarget = el;
      ensurePanel();
    }
  });

  document.addEventListener("input", (e) => {
    if (!isEditable(e.target)) return;
    activeTarget = e.target;
    ensurePanel();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(autoCheck, 1200);
  });

  // ─────────────────────────────────────────────
  // Сообщения от background (shortcuts, context menu)
  // ─────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TRIGGER_CHECK") {
      runCheck(currentText());
    }
    if (msg.type === "SHOW_RESULT") {
      ensurePanel();
      renderResult(msg.data);
    }
  });

  // ─────────────────────────────────────────────
  // Panel
  // ─────────────────────────────────────────────

  function ensurePanel() {
    if (panelCreated) return;
    panelCreated = true;

    const panel = document.createElement("div");
    panel.id = "scheckerge-panel";
    panel.classList.add("hidden");
    panel.innerHTML = `
      <div id="scheckerge-panel-header">
        <span>ScheckerGe ✓</span>
        <button id="scheckerge-panel-close">✕</button>
      </div>
      <div id="scheckerge-panel-stats">
        <div class="scheckerge-stat">
          <span class="scheckerge-stat-num" id="sg-total">—</span>
          <span class="scheckerge-stat-label">სიტყვა</span>
        </div>
        <div class="scheckerge-stat">
          <span class="scheckerge-stat-num" id="sg-errors">—</span>
          <span class="scheckerge-stat-label">შეცდომა</span>
        </div>
        <div class="scheckerge-stat">
          <span class="scheckerge-stat-num" id="sg-accuracy">—</span>
          <span class="scheckerge-stat-label">სიზუსტე</span>
        </div>
      </div>
      <div id="scheckerge-panel-body">
        <div id="sg-loading" class="hidden" style="padding:10px;color:#666;font-style:italic">⏳ მოწმდება...</div>
        <div id="sg-results"></div>
      </div>
      <div id="scheckerge-panel-footer">
        <button class="scheckerge-btn" id="sg-btn-check">✓ შემოწმება</button>
      </div>
    `;
    document.body.appendChild(panel);

    makeDraggable(panel, document.getElementById("scheckerge-panel-header"));
    document.getElementById("scheckerge-panel-close").onclick = () => panel.classList.toggle("hidden");
    document.getElementById("sg-btn-check").onclick = () => {
      panel.classList.remove("hidden");
      runCheck(currentText());
    };
  }

  function showPanel() {
    const p = document.getElementById("scheckerge-panel");
    if (p) p.classList.remove("hidden");
  }

  // ─────────────────────────────────────────────
  // Текущий текст
  // ─────────────────────────────────────────────

  function currentText() {
    if (!activeTarget) return window.getSelection()?.toString() || "";
    return activeTarget.tagName === "TEXTAREA"
      ? activeTarget.value
      : activeTarget.innerText;
  }

  function isEditable(el) {
    if (!el) return false;
    return el.tagName === "TEXTAREA" ||
           (el.tagName === "INPUT" && ["text", "search", "email"].includes(el.type)) ||
           el.isContentEditable;
  }

  // ─────────────────────────────────────────────
  // Авто-проверка
  // ─────────────────────────────────────────────

  function autoCheck() {
    const text = currentText();
    if (!text || text === lastText) return;
    if (!hasGeorgian(text)) return;  // проверяем только грузинский текст
    lastText = text;
    runCheck(text);
  }

  function hasGeorgian(text) {
    return /[ა-ჰ]/.test(text);
  }

  // ─────────────────────────────────────────────
  // Запрос к API через background
  // ─────────────────────────────────────────────

  function runCheck(text) {
    if (!text || !text.trim()) return;
    if (!hasGeorgian(text)) return;

    ensurePanel();
    showPanel();
    document.getElementById("sg-loading").classList.remove("hidden");
    document.getElementById("sg-results").innerHTML = "";

    chrome.runtime.sendMessage({ type: "CHECK_TEXT", text }, (resp) => {
      document.getElementById("sg-loading").classList.add("hidden");

      if (chrome.runtime.lastError || !resp || !resp.ok) {
        document.getElementById("sg-results").innerHTML =
          `<div style="padding:8px;color:#c00">❌ სერვერი მიუწვდომელია</div>`;
        return;
      }
      renderResult(resp.data);
    });
  }

  // ─────────────────────────────────────────────
  // Отображение результатов
  // ─────────────────────────────────────────────

  function renderResult(data) {
    document.getElementById("sg-total").textContent    = data.total_words;
    document.getElementById("sg-errors").textContent   = data.error_count;
    document.getElementById("sg-accuracy").textContent = data.accuracy + "%";

    const results = document.getElementById("sg-results");

    if (!data.errors || data.errors.length === 0) {
      results.innerHTML = `<div style="padding:10px;color:#090;font-weight:bold">✓ შეცდომები არ არის!</div>`;
      return;
    }

    results.innerHTML = data.errors.map(err => `
      <div class="scheckerge-error-item">
        <span class="scheckerge-error-word">${esc(err.word)}</span>
        <span class="scheckerge-error-count">×${err.count}</span>
        ${err.suggestions.length ? `
        <div class="scheckerge-suggestions">
          ${err.suggestions.map(s =>
            `<span class="scheckerge-suggestion" data-word="${esc(err.word)}" data-sug="${esc(s)}">${esc(s)}</span>`
          ).join("")}
        </div>` : ""}
      </div>
    `).join("");

    // Клик по предложению → заменить слово в активном поле
    results.querySelectorAll(".scheckerge-suggestion").forEach(btn => {
      btn.addEventListener("click", () => {
        replaceInTarget(btn.dataset.word, btn.dataset.sug);
        btn.closest(".scheckerge-error-item").style.opacity = "0.4";
      });
    });
  }

  // ─────────────────────────────────────────────
  // Замена слова в активном поле
  // ─────────────────────────────────────────────

  function replaceInTarget(original, replacement) {
    if (!activeTarget) return;

    if (activeTarget.tagName === "TEXTAREA" || activeTarget.tagName === "INPUT") {
      const val   = activeTarget.value;
      const regex = new RegExp(`(?<![ა-ჰ])${escapeRegex(original)}(?![ა-ჰ])`, "g");
      activeTarget.value = val.replace(regex, replacement);
      activeTarget.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    if (activeTarget.isContentEditable) {
      // execCommand для contenteditable
      activeTarget.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(activeTarget);
      sel.removeAllRanges();
      sel.addRange(range);
      const html = activeTarget.innerHTML;
      const regex = new RegExp(`(?<![ა-ჰ])${escapeRegex(original)}(?![ა-ჰ])`, "g");
      activeTarget.innerHTML = html.replace(regex, `<mark style="background:none">${replacement}</mark>`);
      // Убираем mark теги
      activeTarget.querySelectorAll("mark").forEach(m => {
        const t = document.createTextNode(m.textContent);
        m.replaceWith(t);
      });
    }
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function makeDraggable(el, handle) {
    let ox = 0, oy = 0, sx = 0, sy = 0;
    handle.onmousedown = (e) => {
      e.preventDefault();
      sx = e.clientX; sy = e.clientY;
      document.onmouseup   = () => { document.onmouseup = null; document.onmousemove = null; };
      document.onmousemove = (e2) => {
        ox = sx - e2.clientX; oy = sy - e2.clientY;
        sx = e2.clientX; sy = e2.clientY;
        el.style.top  = (el.offsetTop  - oy) + "px";
        el.style.left = (el.offsetLeft - ox) + "px";
        el.style.right = "auto";
      };
    };
  }

})();
