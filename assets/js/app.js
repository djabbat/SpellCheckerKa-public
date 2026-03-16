// --- fflate: tiny zip library for .docx read/write ---
import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate"

// --- Phoenix LiveView boilerplate ---
import "phoenix_html"
import { Socket } from "phoenix"
import { LiveSocket } from "phoenix_live_view"
import topbar from "../vendor/topbar"

const csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")
const liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: { _csrf_token: csrfToken }
})

topbar.config({ barColors: { 0: "#dc2626" }, shadowColor: "rgba(0,0,0,.3)" })
window.addEventListener("phx:page-loading-start", () => topbar.show(300))
window.addEventListener("phx:page-loading-stop", () => topbar.hide())
liveSocket.connect()
window.liveSocket = liveSocket

// ─── State ──────────────────────────────────────────────────────────────
let currentErrors = []
let userDictionary = new Set()
let checkTimer = null
let activeRequest = null   // AbortController for in-flight fetch

// ─── Utilities ──────────────────────────────────────────────────────────

function esc(str) {
  const el = document.createElement("div")
  el.textContent = String(str)
  return el.innerHTML
}

function setStatus(msg) {
  const el = document.getElementById("status")
  if (el) el.innerHTML = msg
}

// Adaptive debounce: longer delay for larger texts so we don't spam the server
function debounceDelay(len) {
  if (len <  2_000) return  500
  if (len < 10_000) return  900
  if (len < 50_000) return 1500
  return 2500
}

// ─── Stats ──────────────────────────────────────────────────────────────

function updateStats(total, errors) {
  const wordsEl  = document.getElementById("stat-words")
  const errorsEl = document.getElementById("stat-errors")
  const accEl    = document.getElementById("stat-accuracy")

  if (wordsEl)  wordsEl.textContent = total
  if (errorsEl) {
    errorsEl.textContent = errors
    errorsEl.className = errors > 0 ? "c-red" : "c-green"
  }
  const pct = total > 0 ? Math.round(((total - errors) / total) * 100) : 100
  if (accEl) {
    accEl.textContent  = pct + "%"
    accEl.className = pct >= 95 ? "c-green" : pct >= 75 ? "c-warn" : "c-red"
  }
}

// ─── Spell check ────────────────────────────────────────────────────────

async function checkSpelling () {
  const input = document.getElementById("input")
  const text  = input ? input.value : ""

  if (!text.trim()) { resetUI(); return }

  // Cancel any pending request
  if (activeRequest) { activeRequest.abort(); activeRequest = null }

  const controller = new AbortController()
  activeRequest = controller

  const chars = text.length
  setStatus(`შემოწმება... ${chars.toLocaleString()} სიმბ. <span class="spinner"></span>`)

  try {
    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal
    })
    activeRequest = null

    if (!res.ok) throw new Error("HTTP " + res.status)
    const data = await res.json()

    currentErrors = data.errors || []
    updateStats(data.total_words, data.error_count)
    renderResults(currentErrors, data.typography || [], data.stopwords || [])
    updateMirror(text, currentErrors)
    setStatus(`შემოწმება დასრულდა — ${data.total_words} სიტყვა`)

  } catch (err) {
    if (err.name === "AbortError") return  // intentionally cancelled — ignore
    activeRequest = null
    setStatus("❌ სერვერთან კავშირის შეცდომა")
    console.error("Spell check error:", err)
  }
}

// ─── Results rendering ──────────────────────────────────────────────────

function renderResults(errors, typography, stopwords) {
  const container = document.getElementById("results")
  if (!container) return

  if (!errors.length && !typography.length && !stopwords.length) {
    container.innerHTML = `
      <div class="success-state">
        <div class="check-icon">✓</div>
        <p>ყველა სიტყვა სწორია!</p>
      </div>`
    return
  }

  let html = ""

  if (errors.length) {
    html += `<div class="section-label">შეცდომები — ${errors.length}</div>`
    errors.forEach(e => {
      html += `<div class="error-card">
        <div class="error-top">
          <span class="error-word">${esc(e.word)}</span>
          <span class="error-times">${e.count}×</span>
        </div>`
      if (e.suggestions && e.suggestions.length) {
        html += `<div class="fixes">`
        e.suggestions.forEach(s => {
          html += `<button class="fix-btn" data-old="${esc(e.word)}" data-new="${esc(s)}">${esc(s)}</button>`
        })
        html += `</div>`
      } else {
        html += `<div class="no-fix">შემოთავაზება არ არის</div>`
      }
      html += `</div>`
    })
  }

  if (typography.length) {
    html += `<div class="section-label typo-label">ტიპოგრაფია — ${typography.length}</div>`
    typography.forEach(t => {
      const msg = typeof t === "string" ? t : (t.message || t.type || t.description || JSON.stringify(t))
      html += `<div class="typo-card">${esc(msg)}</div>`
    })
  }

  if (stopwords.length) {
    html += `<div class="section-label stop-label">სტოპ-სიტყვები — ${stopwords.length}</div>`
    stopwords.forEach(s => {
      const word = typeof s === "string" ? s : (s.word || JSON.stringify(s))
      html += `<div class="stop-card">${esc(word)}</div>`
    })
  }

  container.innerHTML = html
}

// ─── Mirror rendering ────────────────────────────────────────────────────
// Mirror div (z-index 2, pointer-events none except marks) overlays the
// transparent textarea. Georgian text: color transparent — only <mark>
// highlights visible. Newlines/spaces preserved via white-space:pre-wrap.

function buildMirrorHtml(text, errors) {
  if (!errors.length) return esc(text)

  const errSet = new Set(errors.map(e => e.word.toLowerCase()))

  // Split on Georgian Mkhedruli word boundaries (U+10D0–U+10FF)
  const tokens = text.split(/([\u10D0-\u10FF]+)/u)
  let html = ""
  tokens.forEach(tok => {
    if (/^[\u10D0-\u10FF]+$/u.test(tok) && errSet.has(tok.toLowerCase())) {
      // data-word for tooltip lookup
      html += `<mark class="err-mark" data-word="${esc(tok.toLowerCase())}">${esc(tok)}</mark>`
    } else {
      html += esc(tok)   // newlines & spaces preserved by white-space:pre-wrap
    }
  })
  return html
}

function updateMirror(text, errors) {
  const mirror = document.getElementById("mirror")
  if (!mirror) return
  mirror.innerHTML = buildMirrorHtml(text, errors)
}

function syncMirrorScroll() {
  const input  = document.getElementById("input")
  const mirror = document.getElementById("mirror")
  if (input && mirror) mirror.scrollTop = input.scrollTop
}

// ─── Hover tooltip ───────────────────────────────────────────────────────
// Marks have pointer-events:auto and z-index above textarea.
// Tooltip appears on mouseenter, stays when mouse moves into it.

let tooltipEl = null
let tooltipHideTimer = null

function ensureTooltip() {
  if (tooltipEl) return
  tooltipEl = document.createElement("div")
  tooltipEl.className = "spell-tooltip"
  tooltipEl.addEventListener("mouseenter", () => clearTimeout(tooltipHideTimer))
  tooltipEl.addEventListener("mouseleave", scheduleHideTooltip)
  tooltipEl.addEventListener("click", e => {
    const fix = e.target.closest(".tooltip-fix")
    if (fix) {
      replaceWord(fix.dataset.old, fix.dataset.new)
      hideTooltipNow()
      document.getElementById("input")?.focus()
      return
    }
    const add = e.target.closest(".tooltip-add-dict")
    if (add) addToDictionary(add.dataset.add)
  })
  document.body.appendChild(tooltipEl)
}

function showTooltip(word, suggestions, anchorEl) {
  ensureTooltip()
  clearTimeout(tooltipHideTimer)

  let html = `<div class="tooltip-word">${esc(word)}</div>`
  if (suggestions && suggestions.length) {
    html += `<div class="tooltip-list">`
    suggestions.forEach(s => {
      html += `<button class="tooltip-fix" data-old="${esc(word)}" data-new="${esc(s)}">${esc(s)}</button>`
    })
    html += `</div>`
  } else {
    html += `<div class="tooltip-empty">შემოთავაზება არ არის</div>`
  }
  html += `<div class="tooltip-footer">
    <button class="tooltip-add-dict" data-add="${esc(word)}">+ დაამატე ლექსიკონში</button>
  </div>`

  tooltipEl.innerHTML = html
  tooltipEl.style.display = "block"

  // Position below the mark
  const rect = anchorEl.getBoundingClientRect()
  let top  = rect.bottom + window.scrollY + 6
  let left = rect.left  + window.scrollX

  tooltipEl.style.top  = top + "px"
  tooltipEl.style.left = left + "px"

  // Clamp to viewport right edge
  requestAnimationFrame(() => {
    const tw = tooltipEl.offsetWidth
    if (left + tw > window.innerWidth - 8) {
      tooltipEl.style.left = Math.max(8, window.innerWidth - tw - 8) + "px"
    }
  })
}

function scheduleHideTooltip() {
  tooltipHideTimer = setTimeout(hideTooltipNow, 180)
}

function hideTooltipNow() {
  clearTimeout(tooltipHideTimer)
  if (tooltipEl) tooltipEl.style.display = "none"
}

// ─── Add to dictionary ───────────────────────────────────────────────────

async function addToDictionary(word) {
  hideTooltipNow()
  setStatus(`"${word}" ემატება ლექსიკონს... <span class="spinner"></span>`)

  try {
    const res = await fetch("/api/dictionary/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "HTTP " + res.status)
    }

    // Remove from current error list — word is now valid
    currentErrors = currentErrors.filter(e => e.word !== word)

    const input = document.getElementById("input")
    if (input) updateMirror(input.value, currentErrors)

    // Recount stats (total_words stays the same, only error count drops)
    const statWords = document.getElementById("stat-words")
    const total = statWords ? (parseInt(statWords.textContent) || 0) : 0
    updateStats(total, currentErrors.length)

    renderResults(currentErrors, [], [])
    setStatus(`✓ "${word}" დაემატა ლექსიკონს`)
    document.getElementById("input")?.focus()

  } catch (err) {
    setStatus(`❌ ${err.message}`)
    console.error("addToDictionary:", err)
  }
}

// ─── Word replacement ────────────────────────────────────────────────────

function replaceWord(oldWord, newWord) {
  const input = document.getElementById("input")
  if (!input) return

  const tokens = input.value.split(/([\u10D0-\u10FF]+)/u)
  input.value = tokens.map(tok =>
    /^[\u10D0-\u10FF]+$/u.test(tok) && tok.toLowerCase() === oldWord.toLowerCase()
      ? newWord
      : tok
  ).join("")

  updateMirror(input.value, currentErrors)
  setStatus(`"${oldWord}" → "${newWord}"`)
  checkSpelling()
}

// ─── .docx Save ─────────────────────────────────────────────────────────
// Build a minimal valid .docx (ZIP containing Word XML), download it.

function escXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;").replace(/'/g, "&apos;")
}

function saveDocx () {
  const text = document.getElementById("input")?.value || ""
  if (!text.trim()) { setStatus("გასაიმახსოვრებელი ტექსტი არ არის"); return }

  // Convert plain text paragraphs → Word XML <w:p> elements
  const paragraphs = text.split("\n").map(line => {
    if (!line) return `<w:p/>`
    return `<w:p><w:r><w:t xml:space="preserve">${escXml(line)}</w:t></w:r></w:p>`
  }).join("")

  const files = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml"  ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `</Types>`
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `</Relationships>`
    ),
    "word/_rels/document.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`
    ),
    "word/document.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
      `<w:body>${paragraphs}<w:sectPr/></w:body></w:document>`
    )
  }

  const zipData = zipSync(files, { level: 6 })
  const blob = new Blob([zipData], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })

  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = "document.docx"
  a.click()
  URL.revokeObjectURL(a.href)
  setStatus("ფაილი გადმოწერილია: document.docx")
}

// ─── .docx Open ──────────────────────────────────────────────────────────
// Unzip the .docx, parse word/document.xml, extract plain text.

function openDocx () {
  document.getElementById("docxFile").click()
}

function handleDocxOpen (files) {
  if (!files || !files.length) return
  const file = files[0]
  setStatus(`იხსნება: ${file.name}… <span class="spinner"></span>`)

  const reader = new FileReader()
  reader.onload = e => {
    try {
      const zipData = new Uint8Array(e.target.result)
      const unzipped = unzipSync(zipData)

      // Find word/document.xml (key may vary in case)
      const docKey = Object.keys(unzipped).find(k => k.match(/word\/document\.xml$/i))
      if (!docKey) throw new Error("word/document.xml not found in archive")

      const xmlStr = strFromU8(unzipped[docKey])

      // Parse XML and extract text from <w:t> elements, preserving paragraphs
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlStr, "application/xml")

      // Each <w:p> = paragraph; collect <w:t> text within it
      const paras = Array.from(xmlDoc.getElementsByTagNameNS(
        "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "p"
      ))

      const text = paras.map(p => {
        const runs = Array.from(p.getElementsByTagNameNS(
          "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "t"
        ))
        return runs.map(t => t.textContent).join("")
      }).join("\n")

      const input = document.getElementById("input")
      if (input) {
        input.value = text
        input.focus()
      }

      setStatus(`გახსნილია: ${file.name}`)

      // Reset file input so same file can be re-opened
      document.getElementById("docxFile").value = ""

      // Trigger spell check
      const auto = document.getElementById("autoCheck")
      if (auto?.checked) checkSpelling()

    } catch (err) {
      setStatus(`❌ ფაილის გახსნა ვერ მოხერხდა: ${err.message}`)
      console.error("openDocx:", err)
    }
  }
  reader.readAsArrayBuffer(file)
}

// ─── Reset ──────────────────────────────────────────────────────────────

function resetUI() {
  currentErrors = []
  updateStats(0, 0)
  const results = document.getElementById("results")
  if (results) {
    results.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">ᛃ</div>
        <p>შეიყვანეთ შესამოწმებელი ტექსტი</p>
      </div>`
  }
  updateMirror("", [])
  setStatus("მზადაა")
}

// ─── Dictionary ─────────────────────────────────────────────────────────

function loadExternalDictionary () {
  document.getElementById("dictionaryFile").click()
}

function handleDictionaryFile (files) {
  if (!files || !files.length) return
  const reader = new FileReader()
  reader.onload = e => {
    userDictionary.clear()
    e.target.result.split("\n").forEach(w => {
      w = w.trim()
      if (w && /^[\u10D0-\u10FF\-]+$/u.test(w)) userDictionary.add(w.toLowerCase())
    })
    setStatus(`ლექსიკონი: ${userDictionary.size} სიტყვა`)
  }
  reader.readAsText(files[0], "UTF-8")
}

// ─── UI helpers ─────────────────────────────────────────────────────────

function clearInput () {
  if (activeRequest) { activeRequest.abort(); activeRequest = null }
  const input = document.getElementById("input")
  if (input) { input.value = ""; input.focus() }
  resetUI()
}

// ─── Init ────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const input        = document.getElementById("input")
  const mirror       = document.getElementById("mirror")
  const results      = document.getElementById("results")
  const dictFile     = document.getElementById("dictionaryFile")
  const docxFile     = document.getElementById("docxFile")

  // ── Toolbar buttons ─────────────────────────────────────────────────────

  document.getElementById("btn-check")?.addEventListener("click", () => checkSpelling())
  document.getElementById("btn-clear")?.addEventListener("click", () => clearInput())
  document.getElementById("btn-dict") ?.addEventListener("click", () => dictFile?.click())
  document.getElementById("btn-save") ?.addEventListener("click", () => saveDocx())
  document.getElementById("btn-open") ?.addEventListener("click", () => docxFile?.click())

  // ── File inputs ──────────────────────────────────────────────────────────

  dictFile?.addEventListener("change", () => handleDictionaryFile(dictFile.files))
  docxFile?.addEventListener("change", () => {
    handleDocxOpen(docxFile.files)
    docxFile.value = ""   // reset so same file can be re-opened
  })

  // ── Textarea: typing, mirror sync, auto-check ───────────────────────────

  input?.addEventListener("input", () => {
    const text = input.value
    const len  = text.length

    if (len < 8000) updateMirror(text, currentErrors)

    const auto = document.getElementById("autoCheck")
    if (auto?.checked) {
      clearTimeout(checkTimer)
      if (len > 0) setStatus(`${len.toLocaleString()} სიმბოლო…`)
      checkTimer = setTimeout(checkSpelling, debounceDelay(len))
    }
  })

  input?.addEventListener("scroll", syncMirrorScroll)

  // ── Results panel: fix-btn clicks ───────────────────────────────────────

  results?.addEventListener("click", e => {
    const btn = e.target.closest(".fix-btn")
    if (btn) replaceWord(btn.dataset.old, btn.dataset.new)
  })

  // ── Mirror: hover tooltip on error marks ────────────────────────────────
  // pointer-events:none on mirror, auto on marks — mouseover bubbles from marks.

  mirror?.addEventListener("mouseover", e => {
    const mark = e.target.closest("mark.err-mark")
    if (!mark) return
    const word  = mark.dataset.word
    const error = currentErrors.find(err => err.word === word)
    if (error) showTooltip(word, error.suggestions, mark)
  })

  mirror?.addEventListener("mouseout", e => {
    if (e.target.closest("mark.err-mark")) scheduleHideTooltip()
  })

  mirror?.addEventListener("click", e => {
    if (e.target.closest("mark.err-mark")) input?.focus()
  })

  input?.addEventListener("keydown", hideTooltipNow)
  input?.addEventListener("scroll",  hideTooltipNow)

  setStatus("მზადაა")
})
