// ScheckerGe — Content Script v3
// Inline red-underline highlights + tooltip popup + no cursor-loss corrections.

(function () {
  "use strict";

  // ══════════════════════════════════════════════════════════════════
  //  Constants
  // ══════════════════════════════════════════════════════════════════

  const PANEL_ID   = "scheckerge-panel";
  const TIP_ID     = "sg-tip";
  const MARK       = "sg-err-mark";
  const CHUNK_MAX  = 30_000;
  const DEBOUNCE   = 1_400;

  // ══════════════════════════════════════════════════════════════════
  //  State
  // ══════════════════════════════════════════════════════════════════

  let target        = null;   // currently focused editable element
  let lastText      = "";
  let lastData      = null;
  let debTimer      = null;
  let _marking      = false;  // guard: suppress input events while we inject spans

  // ══════════════════════════════════════════════════════════════════
  //  Focus / input listeners
  // ══════════════════════════════════════════════════════════════════

  document.addEventListener("focusin", e => {
    if (isEditable(e.target)) { target = e.target; ensurePanel(); }
  });

  document.addEventListener("input", e => {
    if (_marking || !isEditable(e.target)) return;
    target = e.target;
    ensurePanel();
    clearTimeout(debTimer);
    debTimer = setTimeout(autoCheck, DEBOUNCE);
  });

  // Click on an error mark → show tooltip; click elsewhere → close it
  document.addEventListener("click", e => {
    const mark = e.target.closest("." + MARK);
    if (mark) { e.stopPropagation(); openTooltip(mark); return; }
    closeTooltip();
  }, true);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeTooltip();
  });

  // ══════════════════════════════════════════════════════════════════
  //  Messages from background
  // ══════════════════════════════════════════════════════════════════

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "TRIGGER_CHECK") runCheck(currentText());
    if (msg.type === "SHOW_RESULT")   { ensurePanel(); renderResult(msg.data); }
  });

  // ══════════════════════════════════════════════════════════════════
  //  Panel HTML
  // ══════════════════════════════════════════════════════════════════

  function ensurePanel() {
    if (document.getElementById(PANEL_ID)) return;

    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.classList.add("sg-hidden");
    panel.innerHTML = `
      <div id="sg-hdr">
        <div id="sg-brand">
          <span id="sg-brand-mark">S</span>
          <div>
            <div id="sg-brand-name">ScheckerGe</div>
            <div id="sg-brand-sub">ქართული მართლწერა</div>
          </div>
        </div>
        <div id="sg-hdr-btns">
          <button class="sg-hbtn" id="sg-min-btn" title="Collapse">─</button>
          <button class="sg-hbtn" id="sg-close-btn" title="Close">✕</button>
        </div>
      </div>

      <div id="sg-toolbar">
        <button class="sg-action-btn sg-action-primary" id="sg-run-btn">
          ✓ შემოწმება
        </button>
        <button class="sg-action-btn" id="sg-fixall-btn" title="Apply first suggestion to every error">
          ⚡ ყველა
        </button>
        <button class="sg-action-btn" id="sg-clear-btn" title="Remove highlights">
          ✕ ჰაილ.
        </button>
      </div>

      <div id="sg-chars">
        <button class="sg-ch" data-ins="„" title="Georgian open quote">„</button>
        <button class="sg-ch" data-ins="\u201C" title="Georgian close quote">\u201C</button>
        <button class="sg-ch" data-ins="\u2014" title="Em dash">\u2014</button>
        <span class="sg-ch-sep"></span>
        <button class="sg-ch" data-ins="\u00AB" title="«">\u00AB</button>
        <button class="sg-ch" data-ins="\u00BB" title="»">\u00BB</button>
        <span class="sg-ch-sep"></span>
        <button class="sg-ch sg-ch-sm" data-ins="\u2026" title="Ellipsis">\u2026</button>
      </div>

      <div id="sg-stats">
        <div class="sg-stat">
          <span class="sg-snum" id="sg-n-words">—</span>
          <span class="sg-slbl">სიტყვა</span>
        </div>
        <div class="sg-stat">
          <span class="sg-snum sg-snum-err" id="sg-n-errs">—</span>
          <span class="sg-slbl">შეცდომა</span>
        </div>
        <div class="sg-stat">
          <span class="sg-snum sg-snum-ok" id="sg-n-acc">—%</span>
          <span class="sg-slbl">სიზუსტე</span>
        </div>
      </div>

      <div id="sg-acc-bar"><div id="sg-acc-fill"></div></div>

      <div id="sg-tabs">
        <button class="sg-tab sg-tab-active" data-tab="errors">
          შეცდომები <span class="sg-badge" id="sg-b-err"></span>
        </button>
        <button class="sg-tab" data-tab="typo">
          ტიპოგ. <span class="sg-badge sg-badge-w" id="sg-b-typo"></span>
        </button>
        <button class="sg-tab" data-tab="stop">
          სიტ.-პარ. <span class="sg-badge sg-badge-i" id="sg-b-sw"></span>
        </button>
      </div>

      <div id="sg-body">
        <div id="sg-load" class="sg-hidden">
          <div class="sg-spin"></div>
          <span id="sg-load-msg">მოწმდება...</span>
        </div>
        <div id="sg-list"></div>
      </div>
    `;

    document.body.appendChild(panel);
    makeDraggable(panel, panel.querySelector("#sg-hdr"));
    wirePanel(panel);
  }

  function wirePanel(panel) {
    panel.querySelector("#sg-close-btn").onclick = () => {
      panel.classList.add("sg-hidden");
      clearMarks(target);
    };

    panel.querySelector("#sg-min-btn").onclick = () =>
      panel.classList.toggle("sg-collapsed");

    panel.querySelector("#sg-run-btn").onclick = () => {
      panel.classList.remove("sg-hidden", "sg-collapsed");
      runCheck(currentText());
    };

    panel.querySelector("#sg-fixall-btn").onclick = fixAll;

    panel.querySelector("#sg-clear-btn").onclick = () => {
      clearMarks(target);
      clearPanel();
    };

    // Georgian char inserts (mousedown to avoid stealing focus from editable)
    panel.querySelectorAll(".sg-ch").forEach(btn =>
      btn.addEventListener("mousedown", e => {
        e.preventDefault();
        insertChar(btn.dataset.ins);
      })
    );

    // Tabs
    panel.querySelectorAll(".sg-tab").forEach(tab =>
      tab.addEventListener("click", () => activateTab(tab.dataset.tab))
    );
  }

  function showPanel() {
    const p = document.getElementById(PANEL_ID);
    if (p) p.classList.remove("sg-hidden", "sg-collapsed");
  }

  function clearPanel() {
    const list = document.getElementById("sg-list");
    if (list) list.innerHTML = "";
    lastData = null;
    setText("sg-n-words", "—");
    setText("sg-n-errs",  "—");
    setText("sg-n-acc",   "—%");
    const fill = document.getElementById("sg-acc-fill");
    if (fill) fill.style.width = "0%";
  }

  // ══════════════════════════════════════════════════════════════════
  //  Caret preservation — char-offset from root element
  // ══════════════════════════════════════════════════════════════════

  function saveCaret(el) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    const pre   = document.createRange();
    pre.setStart(el, 0);
    try { pre.setEnd(range.startContainer, range.startOffset); }
    catch { return null; }
    return pre.toString().length;
  }

  function restoreCaret(el, offset) {
    if (offset === null || offset === undefined) return;
    const sel = window.getSelection();
    if (!sel) return;
    let chars = 0;
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const node = walk.currentNode;
      const len  = node.textContent.length;
      if (chars + len >= offset) {
        try {
          const r = document.createRange();
          r.setStart(node, offset - chars);
          r.collapse(true);
          sel.removeAllRanges();
          sel.addRange(r);
        } catch { /* ignore */ }
        return;
      }
      chars += len;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  Inline mark injection (contenteditable)
  // ══════════════════════════════════════════════════════════════════

  function applyMarks(el, errors) {
    if (!el || !el.isContentEditable || !errors.length) return;

    _marking = true;
    const caret = saveCaret(el);
    clearMarks(el);

    // Build lookup: word → suggestions[]
    const sugMap = new Map(errors.map(e => [e.word, e.suggestions || []]));
    const words  = Array.from(sugMap.keys());

    // Walk text nodes, split around error words
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes  = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      const text = node.nodeValue;
      if (!text) continue;

      // Collect matches across all error words in this text node
      const hits = [];
      for (const word of words) {
        const re = buildWordRe(word);
        let m;
        while ((m = re.exec(text)) !== null) {
          hits.push({ start: m.index, end: m.index + m[0].length, word });
        }
      }
      if (!hits.length) continue;

      // Sort by position; drop overlapping hits (keep first)
      hits.sort((a, b) => a.start - b.start);
      const clean = [];
      let last = -1;
      for (const h of hits) {
        if (h.start >= last) { clean.push(h); last = h.end; }
      }

      // Build fragment with mark spans
      const frag = document.createDocumentFragment();
      let pos = 0;
      for (const h of clean) {
        if (h.start > pos) frag.appendChild(tn(text.slice(pos, h.start)));
        const span = document.createElement("span");
        span.className    = MARK;
        span.textContent  = text.slice(h.start, h.end);
        span.dataset.word = h.word;
        span.dataset.sugs = sugMap.get(h.word).join("\n");
        frag.appendChild(span);
        pos = h.end;
      }
      if (pos < text.length) frag.appendChild(tn(text.slice(pos)));

      node.parentNode.replaceChild(frag, node);
    }

    restoreCaret(el, caret);
    _marking = false;
  }

  function clearMarks(el) {
    if (!el) return;
    el.querySelectorAll("." + MARK).forEach(s => s.replaceWith(s.textContent));
    el.normalize();
  }

  function tn(str) { return document.createTextNode(str); }

  // ══════════════════════════════════════════════════════════════════
  //  Tooltip popup on error-mark click
  // ══════════════════════════════════════════════════════════════════

  function openTooltip(span) {
    closeTooltip();

    const word = span.dataset.word;
    const sugs = (span.dataset.sugs || "").split("\n").filter(Boolean);

    const tip = document.createElement("div");
    tip.id = TIP_ID;

    // Suggestions buttons
    sugs.forEach(s => {
      const b = document.createElement("button");
      b.className   = "sg-tip-sug";
      b.textContent = s;
      b.onclick = () => { applySpanFix(span, word, s); closeTooltip(); };
      tip.appendChild(b);
    });

    if (!sugs.length) {
      const lbl = document.createElement("span");
      lbl.className   = "sg-tip-none";
      lbl.textContent = "—";
      tip.appendChild(lbl);
    }

    // Separator + Ignore button
    const sep = document.createElement("span");
    sep.className = "sg-tip-sep";
    tip.appendChild(sep);

    const ign = document.createElement("button");
    ign.className   = "sg-tip-ign";
    ign.title       = "Ignore";
    ign.textContent = "✕";
    ign.onclick = () => {
      span.classList.remove(MARK);
      span.removeAttribute("data-word");
      span.removeAttribute("data-sugs");
      closeTooltip();
    };
    tip.appendChild(ign);

    document.body.appendChild(tip);

    // Position below the mark span
    const rect = span.getBoundingClientRect();
    const tw   = tip.offsetWidth;
    const th   = tip.offsetHeight;
    let left   = rect.left + window.scrollX;
    let top    = rect.bottom + window.scrollY + 5;
    if (left + tw > window.innerWidth - 8)               left = window.innerWidth - tw - 8;
    if (top + th  > window.scrollY + window.innerHeight) top  = rect.top + window.scrollY - th - 5;
    tip.style.left = left + "px";
    tip.style.top  = top  + "px";
  }

  function closeTooltip() {
    const t = document.getElementById(TIP_ID);
    if (t) t.remove();
  }

  // Replace a specific span element (no cursor jump — caret goes right after word)
  function applySpanFix(span, word, replacement) {
    const sel  = window.getSelection();
    const text = tn(replacement);
    span.replaceWith(text);

    try {
      const r = document.createRange();
      r.setStartAfter(text);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    } catch { /* ignore */ }

    // Remove word from panel data without re-checking
    if (lastData) {
      lastData.errors = (lastData.errors || []).filter(e => e.word !== word);
      lastData.error_count = lastData.errors.length;
      // Recalculate accuracy
      const total = lastData.total_words || 0;
      const ec    = lastData.error_count;
      lastData.accuracy = total > 0 ? Math.round((total - ec) / total * 100) : 100;
      updateStats();
      renderActiveTab();
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  Text extraction
  // ══════════════════════════════════════════════════════════════════

  function currentText() {
    if (!target) return window.getSelection()?.toString() || "";
    if (target.tagName === "TEXTAREA" || target.tagName === "INPUT")
      return target.value;
    return extractText(target);
  }

  // Extracts plain text from contenteditable, inserting newlines at block breaks.
  // Text nodes inside .sg-err-mark spans are included as normal (they hold the word).
  function extractText(el) {
    let out = "";
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_ALL);
    while (walk.nextNode()) {
      const n = walk.currentNode;
      if (n.nodeType === Node.TEXT_NODE) {
        out += n.nodeValue;
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        const tag = n.tagName;
        if (["P","DIV","BR","LI","H1","H2","H3","H4","H5","H6","TR","BLOCKQUOTE"].includes(tag)) {
          if (out && !out.endsWith("\n")) out += "\n";
        }
      }
    }
    return out;
  }

  // ══════════════════════════════════════════════════════════════════
  //  Auto-check + main run
  // ══════════════════════════════════════════════════════════════════

  function autoCheck() {
    const text = currentText();
    if (!text || text === lastText || !hasGeo(text)) return;
    lastText = text;
    runCheck(text);
  }

  function runCheck(text) {
    if (!text || !text.trim() || !hasGeo(text)) return;
    ensurePanel();
    showPanel();

    const loading = document.getElementById("sg-load");
    const list    = document.getElementById("sg-list");
    if (loading) loading.classList.remove("sg-hidden");
    if (list)    list.innerHTML = "";

    const chunks = splitChunks(text, CHUNK_MAX);
    let done = 0;

    if (chunks.length > 1) setLoadMsg(`მოწმდება... (0/${chunks.length})`);

    if (chunks.length === 1) {
      chrome.runtime.sendMessage({ type: "CHECK_TEXT", text: chunks[0] }, resp => {
        if (loading) loading.classList.add("sg-hidden");
        if (chrome.runtime.lastError || !resp?.ok) { showNetError(); return; }
        renderResult(resp.data);
      });
    } else {
      const all = [];
      function next(i) {
        if (i >= chunks.length) {
          if (loading) loading.classList.add("sg-hidden");
          renderResult(mergeResults(all, true));
          return;
        }
        chrome.runtime.sendMessage({ type: "CHECK_TEXT", text: chunks[i] }, resp => {
          if (chrome.runtime.lastError || !resp?.ok) {
            if (loading) loading.classList.add("sg-hidden");
            showNetError(); return;
          }
          all.push(resp.data);
          setLoadMsg(`მოწმდება... (${++done}/${chunks.length})`);
          next(i + 1);
        });
      }
      next(0);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  Render results
  // ══════════════════════════════════════════════════════════════════

  function renderResult(data) {
    lastData = data;
    updateStats();
    renderActiveTab();

    // Apply inline highlights (contenteditable only)
    if (target?.isContentEditable && data.errors?.length) {
      applyMarks(target, data.errors);
    }

    if (data.chunked) {
      const n = document.createElement("div");
      n.className = "sg-notice";
      n.textContent = "⚡ დიდი ტექსტი — ნაწილ-ნაწილ შემოწმდა";
      document.getElementById("sg-list")?.prepend(n);
    }
  }

  function updateStats() {
    if (!lastData) return;
    const total = lastData.total_words ?? 0;
    const errs  = lastData.error_count ?? 0;
    const acc   = lastData.accuracy    ?? 100;

    setText("sg-n-words", total);
    setText("sg-n-errs",  errs);
    setText("sg-n-acc",   acc + "%");

    const fill = document.getElementById("sg-acc-fill");
    if (fill) {
      fill.style.width      = acc + "%";
      fill.style.background = acc >= 90 ? "#059669" : acc >= 70 ? "#D97706" : "#DC2626";
    }

    badge("sg-b-err",  errs,                           errs  > 0);
    badge("sg-b-typo", (lastData.typography||[]).length, (lastData.typography||[]).length > 0);
    badge("sg-b-sw",   (lastData.stopwords||[]).length,  (lastData.stopwords||[]).length  > 0);
  }

  function renderActiveTab() {
    const t = document.querySelector(`#${PANEL_ID} .sg-tab-active`);
    if (t) renderTab(t.dataset.tab);
  }

  function renderTab(tab) {
    if (!lastData) return;
    const list = document.getElementById("sg-list");
    if (!list) return;
    list.innerHTML = "";

    if (tab === "errors") renderErrors(list, lastData.errors || []);
    if (tab === "typo")   renderTypo(list, lastData.typography || []);
    if (tab === "stop")   renderStop(list, lastData.stopwords || []);

    // Wire suggestion chips in panel → replace all occurrences
    list.querySelectorAll(".sg-chip").forEach(chip =>
      chip.addEventListener("click", () => panelApplyFix(chip.dataset.word, chip.dataset.sug))
    );
  }

  // Panel chip click: replace all occurrences of word in the editable
  function panelApplyFix(word, replacement) {
    replaceWord(word, replacement);

    // Remove marks for this word
    if (target?.isContentEditable) {
      target.querySelectorAll(`.${MARK}`).forEach(s => {
        if (s.dataset.word === word) s.replaceWith(tn(replacement));
      });
    }

    if (lastData) {
      lastData.errors = (lastData.errors || []).filter(e => e.word !== word);
      lastData.error_count = lastData.errors.length;
      const total = lastData.total_words || 0;
      const ec    = lastData.error_count;
      lastData.accuracy = total > 0 ? Math.round((total - ec) / total * 100) : 100;
      updateStats();
      renderActiveTab();
    }
  }

  function renderErrors(el, errors) {
    if (!errors.length) { el.innerHTML = ok("შეცდომები არ არის"); return; }
    el.innerHTML = errors.map(e => `
      <div class="sg-card">
        <div class="sg-card-top">
          <span class="sg-word">${x(e.word)}</span>
          <span class="sg-cnt">×${e.count}</span>
          ${e.base_form ? `<span class="sg-base">→ ${x(e.base_form)}</span>` : ""}
        </div>
        <div class="sg-chips">
          ${e.suggestions?.length
            ? e.suggestions.map(s =>
                `<button class="sg-chip" data-word="${x(e.word)}" data-sug="${x(s)}">${x(s)}</button>`
              ).join("")
            : `<span class="sg-nosug">შემოთავაზება არ არის</span>`}
        </div>
      </div>
    `).join("");
  }

  function renderTypo(el, items) {
    if (!items.length) { el.innerHTML = ok("ტიპოგრაფიული შეცდომები არ არის"); return; }
    el.innerHTML = items.map(t => `
      <div class="sg-typo-card">
        <span class="sg-typo-ico">⚠</span>
        <span>${x(t.message)}</span>
      </div>
    `).join("");
  }

  function renderStop(el, items) {
    if (!items.length) { el.innerHTML = ok("სიტყვა-პარაზიტები არ მოიძებნა"); return; }
    el.innerHTML = items.map(s => `
      <div class="sg-card sg-card-stop">
        <div class="sg-card-top">
          <span class="sg-word">${x(s.word)}</span>
          <span class="sg-cnt">×${s.count}</span>
        </div>
        <span class="sg-stopmsg">${x(s.message)}</span>
      </div>
    `).join("");
  }

  function ok(msg) {
    return `<div class="sg-ok"><span class="sg-ok-ico">✓</span>${msg}</div>`;
  }

  // ══════════════════════════════════════════════════════════════════
  //  Tab switching
  // ══════════════════════════════════════════════════════════════════

  function activateTab(name) {
    document.querySelectorAll(`#${PANEL_ID} .sg-tab`).forEach(t =>
      t.classList.toggle("sg-tab-active", t.dataset.tab === name)
    );
    renderTab(name);
  }

  // ══════════════════════════════════════════════════════════════════
  //  Fix all
  // ══════════════════════════════════════════════════════════════════

  function fixAll() {
    if (!lastData?.errors) return;
    for (const e of lastData.errors) {
      if (e.suggestions?.length) replaceWord(e.word, e.suggestions[0]);
    }
    clearMarks(target);
    setTimeout(() => runCheck(currentText()), 200);
  }

  // ══════════════════════════════════════════════════════════════════
  //  Word replacement (format-preserving)
  // ══════════════════════════════════════════════════════════════════

  function replaceWord(original, replacement) {
    if (!target) return;

    if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
      target.value = target.value.replace(buildWordRe(original), replacement);
      target.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    if (target.isContentEditable) {
      const re   = buildWordRe(original);
      const walk = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      const ns   = [];
      while (walk.nextNode()) ns.push(walk.currentNode);
      for (const node of ns) {
        if (!re.test(node.nodeValue)) continue;
        re.lastIndex = 0;
        node.nodeValue = node.nodeValue.replace(re, replacement);
        re.lastIndex = 0;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  Georgian char insert
  // ══════════════════════════════════════════════════════════════════

  function insertChar(ch) {
    if (!target) return;
    if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
      const s = target.selectionStart, e = target.selectionEnd;
      target.value = target.value.slice(0, s) + ch + target.value.slice(e);
      target.selectionStart = target.selectionEnd = s + ch.length;
      target.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (target.isContentEditable) {
      target.focus();
      document.execCommand("insertText", false, ch);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  Chunking + result merging
  // ══════════════════════════════════════════════════════════════════

  function splitChunks(text, max) {
    if (text.length <= max) return [text];
    const out = [];
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + max, text.length);
      if (end < text.length) {
        const n2 = text.lastIndexOf("\n\n", end);
        const n1 = text.lastIndexOf("\n",  end);
        const br = n2 > start + max * 0.6 ? n2 + 2
                 : n1 > start + max * 0.7 ? n1 + 1
                 : end;
        end = br;
      }
      out.push(text.slice(start, end));
      start = end;
    }
    return out;
  }

  function mergeResults(results, chunked) {
    const em = new Map(), sm = new Map();
    let total = 0;
    const typoSeen = new Set(), typos = [];

    for (const r of results) {
      total += r.total_words || 0;
      for (const e of (r.errors || [])) {
        em.has(e.word) ? (em.get(e.word).count += e.count) : em.set(e.word, { ...e });
      }
      for (const t of (r.typography || [])) {
        if (!typoSeen.has(t.type)) { typoSeen.add(t.type); typos.push(t); }
      }
      for (const s of (r.stopwords || [])) {
        sm.has(s.word) ? (sm.get(s.word).count += s.count) : sm.set(s.word, { ...s });
      }
    }

    const errors = Array.from(em.values());
    const ec     = errors.length;
    return {
      errors, total_words: total, error_count: ec,
      accuracy:   total > 0 ? Math.round((total - ec) / total * 100) : 100,
      typography: typos,
      stopwords:  Array.from(sm.values()),
      chunked,
    };
  }

  // ══════════════════════════════════════════════════════════════════
  //  Utilities
  // ══════════════════════════════════════════════════════════════════

  function isEditable(el) {
    if (!el) return false;
    return el.tagName === "TEXTAREA" ||
           (el.tagName === "INPUT" && ["text","search","email"].includes(el.type)) ||
           el.isContentEditable;
  }

  function hasGeo(text) { return /[ა-ჰ]/.test(text); }

  // Georgian-aware word boundary regex (negative lookaround for Georgian chars)
  function buildWordRe(word) {
    return new RegExp(`(?<![ა-ჰ])${reEsc(word)}(?![ა-ჰ])`, "g");
  }

  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  // HTML-escape for innerHTML insertion
  function x(s) {
    return String(s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function badge(id, count, show) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = count;
    el.classList.toggle("sg-badge-on", show);
  }

  function setLoadMsg(msg) {
    const el = document.getElementById("sg-load-msg");
    if (el) el.textContent = msg;
  }

  function showNetError() {
    const el = document.getElementById("sg-list");
    if (el) el.innerHTML = `<div class="sg-net-err">❌ სერვერი მიუწვდომელია</div>`;
  }

  function makeDraggable(el, handle) {
    let ox, oy, sx, sy;
    handle.onmousedown = e => {
      if (e.target.closest("button")) return;
      e.preventDefault();
      sx = e.clientX; sy = e.clientY;
      document.onmouseup   = () => { document.onmouseup = null; document.onmousemove = null; };
      document.onmousemove = e2 => {
        ox = sx - e2.clientX; oy = sy - e2.clientY;
        sx = e2.clientX;      sy = e2.clientY;
        el.style.top   = (el.offsetTop  - oy) + "px";
        el.style.left  = (el.offsetLeft - ox) + "px";
        el.style.right = "auto";
      };
    };
  }

})();
