// SpellCheckerKa — Google Docs Content Script
// Google Docs использует сложный DOM (.kix-*).
// Подход: плавающая панель + извлечение текста через DOM/Selection.

(function () {
  "use strict";

  if (document.getElementById("spellcheckerka-panel")) return; // уже инжектирован

  // ─────────────────────────────────────────────
  // Создать панель
  // ─────────────────────────────────────────────

  const panel = document.createElement("div");
  panel.id = "spellcheckerka-panel";
  panel.innerHTML = `
    <div id="spellcheckerka-panel-header">
      <span>SpellCheckerKa ✓</span>
      <button id="spellcheckerka-panel-close">✕</button>
    </div>
    <div id="spellcheckerka-panel-stats">
      <div class="spellcheckerka-stat">
        <span class="spellcheckerka-stat-num" id="sg-total">—</span>
        <span class="spellcheckerka-stat-label">სიტყვა</span>
      </div>
      <div class="spellcheckerka-stat">
        <span class="spellcheckerka-stat-num" id="sg-errors">—</span>
        <span class="spellcheckerka-stat-label">შეცდომა</span>
      </div>
      <div class="spellcheckerka-stat">
        <span class="spellcheckerka-stat-num" id="sg-accuracy">—</span>
        <span class="spellcheckerka-stat-label">სიზუსტე</span>
      </div>
    </div>
    <div id="spellcheckerka-panel-body">
      <div style="padding:12px;color:#666;font-style:italic">
        Ctrl+Shift+K — შეამოწმე მართლწერა<br>
        ან მონიშნე ტექსტი → კონტექსტური მენიუ
      </div>
    </div>
    <div id="spellcheckerka-panel-footer">
      <button class="spellcheckerka-btn" id="sg-btn-check">✓ შემოწმება</button>
      <button class="spellcheckerka-btn" id="sg-btn-sel">☰ მონიშნული</button>
    </div>
  `;
  document.body.appendChild(panel);

  // Drag
  makeDraggable(panel, document.getElementById("spellcheckerka-panel-header"));

  document.getElementById("spellcheckerka-panel-close").onclick = () => panel.classList.toggle("hidden");
  document.getElementById("sg-btn-check").onclick = () => runCheck(extractAllText());
  document.getElementById("sg-btn-sel").onclick   = () => runCheck(extractSelectedText());

  // ─────────────────────────────────────────────
  // Слушаем сообщения от background
  // ─────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TRIGGER_CHECK") runCheck(extractAllText());
    if (msg.type === "SHOW_RESULT")   renderResult(msg.data);
  });

  // ─────────────────────────────────────────────
  // Извлечение текста из Google Docs
  // ─────────────────────────────────────────────

  function extractAllText() {
    // Пробуем несколько путей — Google Docs меняет DOM
    const selectors = [
      ".kix-lineview-text-block",
      ".docs-ui-unprintable-item-block .kix-lineview-text-block",
      ".kix-paragraphdecoration-block"
    ];

    for (const sel of selectors) {
      const blocks = document.querySelectorAll(sel);
      if (blocks.length > 0) {
        return Array.from(blocks).map(b => b.textContent).join(" ");
      }
    }

    // Fallback: весь текст из редактора
    const editor = document.querySelector(".docs-texteventtarget-iframe");
    if (editor) {
      try {
        return editor.contentDocument.body.textContent;
      } catch (_) {}
    }

    return document.body.innerText;
  }

  function extractSelectedText() {
    // Выделение пользователя
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) return sel.toString();

    // В Google Docs выделение может быть в iframe
    try {
      const iframe = document.querySelector(".docs-texteventtarget-iframe");
      if (iframe) {
        const iSel = iframe.contentWindow.getSelection();
        if (iSel && iSel.toString().trim()) return iSel.toString();
      }
    } catch (_) {}

    return extractAllText();
  }

  // ─────────────────────────────────────────────
  // Отправить текст на проверку
  // ─────────────────────────────────────────────

  function runCheck(text) {
    if (!text || !text.trim()) {
      showBodyMessage("ტექსტი ვერ მოიძებნა. სცადეთ ტექსტის მონიშვნა.");
      return;
    }

    showBodyMessage("⏳ მოწმდება...");

    chrome.runtime.sendMessage({ type: "CHECK_TEXT", text }, (resp) => {
      if (chrome.runtime.lastError) {
        showBodyMessage("❌ Extension error: " + chrome.runtime.lastError.message);
        return;
      }
      if (!resp || !resp.ok) {
        showBodyMessage("❌ სერვერი მიუწვდომელია.\n" + (resp?.error || ""));
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

    const body = document.getElementById("spellcheckerka-panel-body");

    if (!data.errors || data.errors.length === 0) {
      body.innerHTML = `<div style="padding:12px;color:#090;font-weight:bold">✓ შეცდომები არ არის!</div>`;
      return;
    }

    body.innerHTML = data.errors.map(err => `
      <div class="spellcheckerka-error-item">
        <span class="spellcheckerka-error-word">${esc(err.word)}</span>
        <span class="spellcheckerka-error-count">×${err.count}</span>
        ${err.suggestions.length ? `
        <div class="spellcheckerka-suggestions">
          ${err.suggestions.map(s => `<span class="spellcheckerka-suggestion" data-word="${esc(err.word)}" data-sug="${esc(s)}">${esc(s)}</span>`).join("")}
        </div>` : ""}
      </div>
    `).join("");

    // Клик по предложению — заменить в Google Docs
    body.querySelectorAll(".spellcheckerka-suggestion").forEach(btn => {
      btn.addEventListener("click", () => replaceInDoc(btn.dataset.word, btn.dataset.sug));
    });
  }

  // ─────────────────────────────────────────────
  // Замена слова в Google Docs (через Find & Replace API не доступен,
  // используем document.execCommand как fallback)
  // ─────────────────────────────────────────────

  function replaceInDoc(original, replacement) {
    // Google Docs Ctrl+H = Find & Replace
    // Programmatic replacement works only with execCommand in contenteditable context
    // Best we can do: copy to clipboard and notify user
    navigator.clipboard.writeText(replacement).then(() => {
      showBodyMessage(`📋 "${replacement}" კოპირდა. ჩასვი ხელით.`);
    }).catch(() => {
      showBodyMessage(`შეცვალეთ: "${original}" → "${replacement}"`);
    });
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  function showBodyMessage(msg) {
    document.getElementById("spellcheckerka-panel-body").innerHTML =
      `<div style="padding:10px;color:#333">${msg}</div>`;
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
