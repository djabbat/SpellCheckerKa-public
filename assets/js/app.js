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

// ─── Translations ────────────────────────────────────────────────────────
const T = {
  ka: {
    placeholder:    "შეიყვანეთ ტექსტი მართლწერის შესამოწმებლად...",
    auto:           "ავტო",
    open:           "გახსენი",
    save:           "დაიმახსოვრე",
    addDict:        "+ ლექსიკონი",
    clear:          "გასუფთავება",
    check:          "შემოწმება",
    ready:          "მზადაა",
    labelWords:     "სიტყვები",
    labelErrors:    "შეცდომები",
    labelAccuracy:  "სიზუსტე",
    labelForeign:   "უცხო სიტყვები",
    brandSubtitle:  "მართლწერის შემოწმება",
    fix:            "გასწორება",
    emptyTitle:     "შეიყვანეთ შესამოწმებელი ტექსტი",
    successMsg:     "ყველა სიტყვა სწორია!",
    noSuggestion:   "შემოთავაზება არ არის",
    addToDict:      "+ დაამატე ლექსიკონში",
    sectionErrors:  "შეცდომები",
    sectionTypo:    "ტიპოგრაფია",
    sectionStop:    "სტოპ-სიტყვები",
    checking:       (n) => `შემოწმება... ${n} სიმბ.`,
    done:           (n) => `შემოწმება დასრულდა — ${n} სიტყვა`,
    connError:      "სერვერთან კავშირის შეცდომა",
    fileOpen:       (name) => `გახსნილია: ${name}`,
    fileSaved:      "ფაილი გადმოწერილია: document.docx",
    noText:         "გასაიმახსოვრებელი ტექსტი არ არის",
    addedToDict:    (w) => `✓ "${w}" დაემატა ლექსიკონს`,
    addedLocal:     (w) => `✓ "${w}" — ლექსიკონში დამატებულია`,
    removedFromDict:(w) => `"${w}" ამოღებულია ლექსიკონიდან`,
    ctxAddDict:     "ლექსიკონში დამატება",
    ctxRemoveDict:  "ლექსიკონიდან ამოღება",
    hintRightClick: "მარჯვენა კლიკი სიაზე — ლექსიკონის მართვა",
    replaced:       (o, n) => `"${o}" → "${n}"`,
  },
  en: {
    placeholder:    "Enter text to check spelling...",
    auto:           "Auto",
    open:           "Open",
    save:           "Save",
    addDict:        "+ Dictionary",
    clear:          "Clear",
    check:          "Check",
    ready:          "Ready",
    labelWords:     "Words",
    labelErrors:    "Errors",
    labelAccuracy:  "Accuracy",
    labelForeign:   "Foreign words",
    brandSubtitle:  "Spell checker",
    fix:            "Fix",
    emptyTitle:     "Enter text to check",
    successMsg:     "All words are correct!",
    noSuggestion:   "No suggestions",
    addToDict:      "+ Add to dictionary",
    sectionErrors:  "Errors",
    sectionTypo:    "Typography",
    sectionStop:    "Stop words",
    checking:       (n) => `Checking... ${n} chars`,
    done:           (n) => `Done — ${n} words`,
    connError:      "Server connection error",
    fileOpen:       (name) => `Opened: ${name}`,
    fileSaved:      "File saved: document.docx",
    noText:         "No text to save",
    addedToDict:    (w) => `✓ "${w}" added to dictionary`,
    addedLocal:     (w) => `✓ "${w}" added locally`,
    removedFromDict:(w) => `"${w}" removed from dictionary`,
    ctxAddDict:     "Add to dictionary",
    ctxRemoveDict:  "Remove from dictionary",
    hintRightClick: "Right-click an error to manage dictionary",
    replaced:       (o, n) => `"${o}" → "${n}"`,
  },
  fr: {
    placeholder:    "Saisissez un texte pour vérifier l'orthographe...",
    auto:           "Auto",
    open:           "Ouvrir",
    save:           "Enregistrer",
    addDict:        "+ Dictionnaire",
    clear:          "Effacer",
    check:          "Vérifier",
    ready:          "Prêt",
    labelWords:     "Mots",
    labelErrors:    "Erreurs",
    labelAccuracy:  "Précision",
    labelForeign:   "Mots étrangers",
    brandSubtitle:  "Vérificateur orthographique",
    fix:            "Corriger",
    emptyTitle:     "Saisissez le texte à vérifier",
    successMsg:     "Tous les mots sont corrects !",
    noSuggestion:   "Aucune suggestion",
    addToDict:      "+ Ajouter au dictionnaire",
    sectionErrors:  "Erreurs",
    sectionTypo:    "Typographie",
    sectionStop:    "Mots vides",
    checking:       (n) => `Vérification... ${n} car.`,
    done:           (n) => `Terminé — ${n} mots`,
    connError:      "Erreur de connexion au serveur",
    fileOpen:       (name) => `Ouvert : ${name}`,
    fileSaved:      "Fichier enregistré : document.docx",
    noText:         "Aucun texte à enregistrer",
    addedToDict:    (w) => `✓ "${w}" ajouté au dictionnaire`,
    addedLocal:     (w) => `✓ "${w}" ajouté localement`,
    removedFromDict:(w) => `"${w}" supprimé du dictionnaire`,
    ctxAddDict:     "Ajouter au dictionnaire",
    ctxRemoveDict:  "Supprimer du dictionnaire",
    hintRightClick: "Clic droit sur une erreur pour gérer le dictionnaire",
    replaced:       (o, n) => `"${o}" → "${n}"`,
  },
  es: {
    placeholder:    "Introduzca texto para verificar la ortografía...",
    auto:           "Auto",
    open:           "Abrir",
    save:           "Guardar",
    addDict:        "+ Diccionario",
    clear:          "Limpiar",
    check:          "Verificar",
    ready:          "Listo",
    labelWords:     "Palabras",
    labelErrors:    "Errores",
    labelAccuracy:  "Precisión",
    labelForeign:   "Palabras extranjeras",
    brandSubtitle:  "Corrector ortográfico",
    fix:            "Corregir",
    emptyTitle:     "Introduzca el texto a verificar",
    successMsg:     "¡Todas las palabras son correctas!",
    noSuggestion:   "Sin sugerencias",
    addToDict:      "+ Agregar al diccionario",
    sectionErrors:  "Errores",
    sectionTypo:    "Tipografía",
    sectionStop:    "Palabras vacías",
    checking:       (n) => `Verificando... ${n} car.`,
    done:           (n) => `Listo — ${n} palabras`,
    connError:      "Error de conexión con el servidor",
    fileOpen:       (name) => `Abierto: ${name}`,
    fileSaved:      "Archivo guardado: document.docx",
    noText:         "Sin texto para guardar",
    addedToDict:    (w) => `✓ "${w}" agregado al diccionario`,
    addedLocal:     (w) => `✓ "${w}" agregado localmente`,
    removedFromDict:(w) => `"${w}" eliminado del diccionario`,
    ctxAddDict:     "Agregar al diccionario",
    ctxRemoveDict:  "Eliminar del diccionario",
    hintRightClick: "Clic derecho en un error para gestionar el diccionario",
    replaced:       (o, n) => `"${o}" → "${n}"`,
  },
  ru: {
    placeholder:    "Введите текст для проверки орфографии...",
    auto:           "Авто",
    open:           "Открыть",
    save:           "Сохранить",
    addDict:        "+ Словарь",
    clear:          "Очистить",
    check:          "Проверить",
    ready:          "Готово",
    labelWords:     "Слова",
    labelErrors:    "Ошибки",
    labelAccuracy:  "Точность",
    labelForeign:   "Иностранные слова",
    brandSubtitle:  "Проверка орфографии",
    fix:            "Исправить",
    emptyTitle:     "Введите текст для проверки",
    successMsg:     "Все слова написаны верно!",
    noSuggestion:   "Нет предложений",
    addToDict:      "+ Добавить в словарь",
    sectionErrors:  "Ошибки",
    sectionTypo:    "Типографика",
    sectionStop:    "Стоп-слова",
    checking:       (n) => `Проверка... ${n} симв.`,
    done:           (n) => `Готово — ${n} слов`,
    connError:      "Ошибка подключения к серверу",
    fileOpen:       (name) => `Открыт: ${name}`,
    fileSaved:      "Файл сохранён: document.docx",
    noText:         "Нет текста для сохранения",
    addedToDict:    (w) => `✓ "${w}" добавлено в словарь`,
    addedLocal:     (w) => `✓ "${w}" добавлено локально`,
    removedFromDict:(w) => `"${w}" удалено из словаря`,
    ctxAddDict:     "Добавить в словарь",
    ctxRemoveDict:  "Удалить из словаря",
    hintRightClick: "Правый клик по ошибке — управление словарём",
    replaced:       (o, n) => `"${o}" → "${n}"`,
  },
  ar: {
    placeholder:    "أدخل النص للتحقق من الإملاء...",
    auto:           "تلقائي",
    open:           "فتح",
    save:           "حفظ",
    addDict:        "+ قاموس",
    clear:          "مسح",
    check:          "تحقق",
    ready:          "جاهز",
    labelWords:     "كلمات",
    labelErrors:    "أخطاء",
    labelAccuracy:  "دقة",
    labelForeign:   "كلمات أجنبية",
    brandSubtitle:  "مدقق إملائي",
    fix:            "إصلاح",
    emptyTitle:     "أدخل النص للتحقق منه",
    successMsg:     "جميع الكلمات صحيحة!",
    noSuggestion:   "لا توجد اقتراحات",
    addToDict:      "+ أضف إلى القاموس",
    sectionErrors:  "أخطاء",
    sectionTypo:    "الطباعة",
    sectionStop:    "كلمات التوقف",
    checking:       (n) => `جارٍ التحقق... ${n} حرف`,
    done:           (n) => `تمّ — ${n} كلمة`,
    connError:      "خطأ في الاتصال بالخادم",
    fileOpen:       (name) => `تم الفتح: ${name}`,
    fileSaved:      "تم حفظ الملف: document.docx",
    noText:         "لا يوجد نص للحفظ",
    addedToDict:    (w) => `✓ تمت إضافة "${w}" إلى القاموس`,
    addedLocal:     (w) => `✓ تمت إضافة "${w}" محلياً`,
    removedFromDict:(w) => `تمت إزالة "${w}" من القاموس`,
    ctxAddDict:     "أضف إلى القاموس",
    ctxRemoveDict:  "أزل من القاموس",
    hintRightClick: "انقر بزر الماوس الأيمن على خطأ لإدارة القاموس",
    replaced:       (o, n) => `"${o}" → "${n}"`,
  },
  zh: {
    placeholder:    "输入文本进行拼写检查...",
    auto:           "自动",
    open:           "打开",
    save:           "保存",
    addDict:        "+ 词典",
    clear:          "清除",
    check:          "检查",
    ready:          "就绪",
    labelWords:     "字数",
    labelErrors:    "错误",
    labelAccuracy:  "准确率",
    labelForeign:   "外来词",
    brandSubtitle:  "拼写检查",
    fix:            "修正",
    emptyTitle:     "输入要检查的文本",
    successMsg:     "所有单词均正确！",
    noSuggestion:   "无建议",
    addToDict:      "+ 添加到词典",
    sectionErrors:  "错误",
    sectionTypo:    "排版",
    sectionStop:    "停用词",
    checking:       (n) => `检查中… ${n} 字`,
    done:           (n) => `完成 — ${n} 个词`,
    connError:      "服务器连接错误",
    fileOpen:       (name) => `已打开：${name}`,
    fileSaved:      "文件已保存：document.docx",
    noText:         "没有可保存的文本",
    addedToDict:    (w) => `✓ "${w}" 已添加到词典`,
    addedLocal:     (w) => `✓ "${w}" 已在本地添加`,
    removedFromDict:(w) => `"${w}" 已从词典中删除`,
    ctxAddDict:     "添加到词典",
    ctxRemoveDict:  "从词典中删除",
    hintRightClick: "右键点击错误以管理词典",
    replaced:       (o, n) => `"${o}" → "${n}"`,
  },
}

function t(key, ...args) {
  const lang = T[currentLang] || T.ka
  const val  = lang[key] || T.ka[key]
  return typeof val === "function" ? val(...args) : (val || key)
}

// ─── State ──────────────────────────────────────────────────────────────
let currentErrors = []
let userDictionary  = new Set()   // foreign words accepted this session
let userAddedWords  = new Set()   // words user added to server dictionary (this session)
let checkTimer = null
let activeRequest = null   // AbortController for in-flight fetch
let currentLang = localStorage.getItem("spellLang") || "ka"
let allErrors = []         // full error list for pagination
const ERRORS_PAGE = 50    // errors shown per page

// ─── Utilities ──────────────────────────────────────────────────────────

// ─── Editor text extraction ──────────────────────────────────────────────
function getEditorText() {
  const editor = document.getElementById("editor")
  if (!editor) return ""
  const clone = editor.cloneNode(true)
  // Remove spell marks (unwrap spans) so we get clean text
  clone.querySelectorAll("span.err-mark, span.foreign-mark").forEach(span => {
    span.replaceWith(...span.childNodes)
  })
  // Block elements → newline (always, so words don't merge across paragraphs)
  clone.querySelectorAll("p, div, li, h1, h2, h3, h4, h5, h6, blockquote, pre").forEach(el => {
    el.after(document.createTextNode("\n"))
  })
  clone.querySelectorAll("br").forEach(br => br.replaceWith("\n"))
  return clone.textContent.replace(/\n{3,}/g, "\n\n")
}

// ─── Cursor preservation (char-offset based) ─────────────────────────────
function getTextOffset(editor) {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return null
  const range = sel.getRangeAt(0)
  function count(container, offsetInNode) {
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
    let chars = 0, node
    while ((node = walker.nextNode())) {
      if (node === container) return chars + offsetInNode
      chars += node.nodeValue.length
    }
    return chars
  }
  return { start: count(range.startContainer, range.startOffset),
           end:   count(range.endContainer,   range.endOffset) }
}

function restoreTextOffset(editor, saved) {
  if (!saved) return
  const sel = window.getSelection()
  if (!sel) return
  function find(target) {
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
    let chars = 0, node
    while ((node = walker.nextNode())) {
      if (chars + node.nodeValue.length >= target) return { node, offset: target - chars }
      chars += node.nodeValue.length
    }
    return node ? { node, offset: node.nodeValue.length } : null
  }
  const s = find(saved.start), e = find(saved.end)
  if (!s || !e) return
  try {
    const range = document.createRange()
    range.setStart(s.node, s.offset)
    range.setEnd(e.node, e.offset)
    sel.removeAllRanges()
    sel.addRange(range)
  } catch(_) {}
}

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

function countForeignMarks() {
  return document.getElementById("editor")?.querySelectorAll("span.foreign-mark").length || 0
}

function updateStats(total, errors, foreign) {
  const wordsEl   = document.getElementById("stat-words")
  const errorsEl  = document.getElementById("stat-errors")
  const accEl     = document.getElementById("stat-accuracy")
  const foreignEl = document.getElementById("stat-foreign")

  if (wordsEl)  wordsEl.textContent = total
  if (errorsEl) {
    errorsEl.textContent = errors
    errorsEl.className = errors > 0 ? "c-red" : "c-green"
  }
  const pct = total > 0 ? Math.round(((total - errors) / total) * 100) : 100
  if (accEl) {
    accEl.textContent = pct + "%"
    accEl.className = pct >= 95 ? "c-green" : pct >= 75 ? "c-warn" : "c-red"
  }
  if (foreignEl) {
    const f = foreign !== undefined ? foreign : countForeignMarks()
    foreignEl.textContent = f
    foreignEl.className = f > 0 ? "c-blue" : ""
  }
}

// ─── Spell check ────────────────────────────────────────────────────────

// Split text into paragraphs and group into chunks of ~CHUNK_WORDS words each
const CHUNK_WORDS = 2000

function buildChunks(text) {
  const paragraphs = text.split(/\n+/)
  const chunks = []
  let buf = [], bufWords = 0
  for (const para of paragraphs) {
    const wc = para.trim() ? para.trim().split(/\s+/).length : 0
    if (bufWords + wc > CHUNK_WORDS && buf.length) {
      chunks.push(buf.join("\n"))
      buf = [para]; bufWords = wc
    } else {
      buf.push(para); bufWords += wc
    }
  }
  if (buf.length) chunks.push(buf.join("\n"))
  return chunks
}

async function checkSpelling () {
  const text = getEditorText()

  if (!text.trim()) { resetUI(); return }

  // Cancel any pending request
  if (activeRequest) { activeRequest.abort(); activeRequest = null }

  const controller = new AbortController()
  activeRequest = controller

  setStatus(t("checking", text.length.toLocaleString()) + ` <span class="spinner"></span>`)

  try {
    // For large texts send as chunks (processed in parallel on server)
    const wordCount = text.trim().split(/\s+/).length
    const body = wordCount > CHUNK_WORDS
      ? JSON.stringify({ chunks: buildChunks(text), lang: currentLang })
      : JSON.stringify({ text, lang: currentLang })

    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal
    })
    activeRequest = null

    if (!res.ok) throw new Error("HTTP " + res.status)
    const data = await res.json()

    currentErrors = data.errors || []
    renderResults(currentErrors, data.typography || [], data.stopwords || [])
    applySpellMarks(currentErrors)
    updateStats(data.total_words, data.error_count, countForeignMarks())
    setStatus(t("done", data.total_words))

  } catch (err) {
    if (err.name === "AbortError") return  // intentionally cancelled — ignore
    activeRequest = null
    setStatus("❌ " + t("connError"))
    console.error("Spell check error:", err)
  }
}

// ─── Results rendering ──────────────────────────────────────────────────

const TYPO_FIXABLE = new Set([
  "double_space", "hyphen_instead_of_dash", "straight_quotes",
  "trailing_spaces", "missing_space_after_punct", "multiple_punctuation",
  "semicolon_as_question"
])

function errorCardHtml(e) {
  const fixes = (e.suggestions && e.suggestions.length)
    ? `<div class="fixes">${e.suggestions.map(s =>
        `<button class="fix-btn" data-old="${esc(e.word)}" data-new="${esc(s)}">${esc(s)}</button>`
      ).join("")}</div>`
    : `<div class="no-fix">${t("noSuggestion")}</div>`
  return `<div class="error-card">
    <div class="error-top"><span class="error-word">${esc(e.word)}</span><span class="error-times">${e.count}×</span></div>
    ${fixes}</div>`
}

function renderErrorPage(container, errors, offset) {
  const page = errors.slice(offset, offset + ERRORS_PAGE)
  const frag = document.createDocumentFragment()
  page.forEach(e => {
    const div = document.createElement("div")
    div.innerHTML = errorCardHtml(e)
    frag.appendChild(div.firstElementChild)
  })
  const next = offset + ERRORS_PAGE
  if (next < errors.length) {
    const btn = document.createElement("button")
    btn.className = "load-more-btn"
    btn.textContent = `↓ ${t("sectionErrors")}: ${errors.length - next}`
    btn.addEventListener("click", () => {
      btn.remove()
      renderErrorPage(container, errors, next)
    })
    frag.appendChild(btn)
  }
  container.appendChild(frag)
}

function renderResults(errors, typography, stopwords) {
  const container = document.getElementById("results")
  if (!container) return

  allErrors = errors

  const hint = document.getElementById("results-hint")
  if (hint) {
    hint.textContent = errors.length ? t("hintRightClick") : ""
    hint.style.display = errors.length ? "block" : "none"
  }

  if (!errors.length && !typography.length && !stopwords.length) {
    container.innerHTML = `<div class="success-state"><div class="check-icon">✓</div><p>${t("successMsg")}</p></div>`
    return
  }

  container.innerHTML = ""

  // ── Errors (paginated) ───────────────────────────────────────────────
  if (errors.length) {
    const label = document.createElement("div")
    label.className = "section-label"
    label.textContent = `${t("sectionErrors")} — ${errors.length}`
    container.appendChild(label)
    renderErrorPage(container, errors, 0)
  }

  // ── Typography ───────────────────────────────────────────────────────
  if (typography.length) {
    const parts = [`<div class="section-label typo-label">${t("sectionTypo")} — ${typography.length}</div>`]
    typography.forEach(item => {
      const msg = typeof item === "string" ? item : (item.message || item.type || "")
      const type = item.type || ""
      const fixBtn = TYPO_FIXABLE.has(type)
        ? `<button class="typo-fix-btn" data-type="${esc(type)}">✓ ${t("fix")}</button>`
        : ""
      parts.push(`<div class="typo-card"><span>${esc(msg)}</span>${fixBtn}</div>`)
    })
    container.insertAdjacentHTML("beforeend", parts.join(""))
  }

  // ── Stopwords ────────────────────────────────────────────────────────
  if (stopwords.length) {
    const parts = [`<div class="section-label stop-label">${t("sectionStop")} — ${stopwords.length}</div>`]
    stopwords.forEach(s => {
      const word = typeof s === "string" ? s : (s.word || "")
      parts.push(`<div class="stop-card">${esc(word)}</div>`)
    })
    container.insertAdjacentHTML("beforeend", parts.join(""))
  }
}

// ─── Spell mark rendering (contenteditable) ──────────────────────────────
// Character-set patterns per language — "native" vs "foreign"
const LANG_NATIVE = {
  ka: /^[\u10D0-\u10FF]+$/u,
  en: /^[A-Za-z\u00C0-\u024F]+$/u,
  fr: /^[A-Za-z\u00C0-\u024F]+$/u,
  es: /^[A-Za-z\u00C0-\u024F]+$/u,
  ru: /^[\u0410-\u044F\u0401\u0451]+$/u,
  ar: /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+$/u,
  zh: /^[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]+$/u,
}
const LANG_SPLIT = {
  ka: /([\u10D0-\u10FF]+)/u,
  en: /([A-Za-z\u00C0-\u024F]+)/u,
  fr: /([A-Za-z\u00C0-\u024F]+)/u,
  es: /([A-Za-z\u00C0-\u024F]+)/u,
  ru: /([\u0410-\u044F\u0401\u0451]+)/u,
  ar: /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+)/u,
  zh: /([\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]+)/u,
}

function applySpellMarks(errors) {
  const editor = document.getElementById("editor")
  if (!editor) return

  const hasFocus = document.activeElement === editor
  const saved = hasFocus ? getTextOffset(editor) : null

  // Unwrap all existing marks
  editor.querySelectorAll("span.err-mark, span.foreign-mark").forEach(span => {
    const parent = span.parentNode
    while (span.firstChild) parent.insertBefore(span.firstChild, span)
    parent.removeChild(span)
  })
  editor.normalize()

  const lang    = currentLang
  const native  = LANG_NATIVE[lang] || LANG_NATIVE.ka
  const splitRe = LANG_SPLIT[lang]  || LANG_SPLIT.ka
  const errSet  = new Set(errors.map(e => e.word.toLowerCase()))

  // Collect all text nodes (snapshot before mutation)
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
  const textNodes = []
  let node
  while ((node = walker.nextNode())) textNodes.push(node)

  textNodes.forEach(textNode => {
    const text = textNode.nodeValue
    const tokens = text.split(splitRe)

    const frag = document.createDocumentFragment()
    let changed = false

    tokens.forEach(tok => {
      if (tok === "") return
      if (native.test(tok)) {
        // Native-script word: spell-error or plain
        if (errSet.has(tok.toLowerCase())) {
          const span = document.createElement("span")
          span.className = "err-mark"
          span.dataset.word = tok.toLowerCase()
          span.textContent = tok
          frag.appendChild(span)
          changed = true
        } else {
          frag.appendChild(document.createTextNode(tok))
        }
      } else if (/\p{L}/u.test(tok)) {
        // Non-native chunk — split into individual words so each gets its own span
        let lastIdx = 0
        const wRe = /\S+/gu
        let wm
        while ((wm = wRe.exec(tok)) !== null) {
          if (wm.index > lastIdx) frag.appendChild(document.createTextNode(tok.slice(lastIdx, wm.index)))
          const w = wm[0]
          if (/\p{L}/u.test(w) && !userDictionary.has(w.toLowerCase())) {
            const span = document.createElement("span")
            span.className = "foreign-mark"
            span.dataset.word = w
            span.textContent = w
            frag.appendChild(span)
            changed = true
          } else {
            frag.appendChild(document.createTextNode(w))
          }
          lastIdx = wm.index + w.length
        }
        if (lastIdx < tok.length) frag.appendChild(document.createTextNode(tok.slice(lastIdx)))
      } else {
        frag.appendChild(document.createTextNode(tok))
      }
    })

    if (changed) textNode.parentNode.replaceChild(frag, textNode)
  })

  if (hasFocus && saved) restoreTextOffset(editor, saved)
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
      document.getElementById("editor")?.focus()
      return
    }
    const addForeign = e.target.closest(".tooltip-add-foreign")
    if (addForeign) { addForeignToDict(addForeign.dataset.add); return }

    const add = e.target.closest(".tooltip-add-dict")
    if (add) addToDictionary(add.dataset.add)

    const rem = e.target.closest(".tooltip-remove-dict")
    if (rem) { removeFromDictionary(rem.dataset.remove); hideTooltipNow() }
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
    html += `<div class="tooltip-empty">${t("noSuggestion")}</div>`
  }
  const wl = word.toLowerCase()
  const inDict = userAddedWords.has(wl) || userDictionary.has(wl)
  html += `<div class="tooltip-footer">`
  if (!inDict) html += `<button class="tooltip-add-dict" data-add="${esc(word)}">${t("addToDict")}</button>`
  if (inDict)  html += `<button class="tooltip-remove-dict" data-remove="${esc(word)}">${t("ctxRemoveDict")}</button>`
  html += `</div>`

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

function showForeignTooltip(word, anchorEl) {
  ensureTooltip()
  clearTimeout(tooltipHideTimer)

  const html = `<div class="tooltip-word tooltip-word-foreign">${esc(word)}</div>
    <div class="tooltip-footer">
      <button class="tooltip-add-foreign" data-add="${esc(word)}">${t("addToDict")}</button>
    </div>`

  tooltipEl.innerHTML = html
  tooltipEl.style.display = "block"

  const rect = anchorEl.getBoundingClientRect()
  let top  = rect.bottom + window.scrollY + 6
  let left = rect.left   + window.scrollX
  tooltipEl.style.top  = top + "px"
  tooltipEl.style.left = left + "px"

  requestAnimationFrame(() => {
    const tw = tooltipEl.offsetWidth
    if (left + tw > window.innerWidth - 8)
      tooltipEl.style.left = Math.max(8, window.innerWidth - tw - 8) + "px"
  })
}

async function addForeignToDict(word) {
  // Optimistically hide mark immediately
  hideTooltipNow()
  userDictionary.add(word.toLowerCase())
  const editor = document.getElementById("editor")
  if (editor) applySpellMarks(currentErrors)
  setStatus(`"${word}"… <span class="spinner"></span>`)

  try {
    const res = await fetch("/api/dictionary/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, lang: currentLang })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "HTTP " + res.status)
    }
    userAddedWords.add(word.toLowerCase())
    setStatus(t("addedToDict", word))
  } catch (err) {
    setStatus(`❌ ${err.message}`)
  }
  document.getElementById("editor")?.focus()
}

// ─── Right-click context menu ────────────────────────────────────────────

let ctxMenuEl = null

function ensureContextMenu() {
  if (ctxMenuEl) return
  ctxMenuEl = document.createElement("div")
  ctxMenuEl.className = "ctx-menu"
  ctxMenuEl.addEventListener("click", e => {
    const item = e.target.closest(".ctx-item")
    if (!item) return
    if (item.dataset.action === "add")    addToDictionary(item.dataset.word)
    if (item.dataset.action === "remove") removeFromDictionary(item.dataset.word)
  })
  document.body.appendChild(ctxMenuEl)
  document.addEventListener("mousedown", e => {
    if (ctxMenuEl && !ctxMenuEl.contains(e.target)) hideContextMenu()
  })
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") hideContextMenu()
  })
}

function showContextMenu(word, x, y) {
  ensureContextMenu()

  const html =
    `<div class="ctx-item" data-action="add" data-word="${esc(word)}">${t("ctxAddDict")} <span class="ctx-word">${esc(word)}</span></div>` +
    `<div class="ctx-item ctx-item-danger" data-action="remove" data-word="${esc(word)}">${t("ctxRemoveDict")} <span class="ctx-word">${esc(word)}</span></div>`

  ctxMenuEl.innerHTML = html
  ctxMenuEl.style.display = "block"
  ctxMenuEl.style.left = x + "px"
  ctxMenuEl.style.top  = y + "px"

  // Clamp to viewport
  requestAnimationFrame(() => {
    const r = ctxMenuEl.getBoundingClientRect()
    if (r.right  > window.innerWidth  - 8) ctxMenuEl.style.left = (window.innerWidth  - r.width  - 8) + "px"
    if (r.bottom > window.innerHeight - 8) ctxMenuEl.style.top  = (window.innerHeight - r.height - 8) + "px"
  })
}

function hideContextMenu() {
  if (ctxMenuEl) ctxMenuEl.style.display = "none"
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
  setStatus(`"${word}"… <span class="spinner"></span>`)

  try {
    const res = await fetch("/api/dictionary/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, lang: currentLang })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "HTTP " + res.status)
    }

    // Remove from current error list — word is now valid
    currentErrors = currentErrors.filter(e => e.word !== word)

    const editor = document.getElementById("editor")
    if (editor) applySpellMarks(currentErrors)

    // Recount stats (total_words stays the same, only error count drops)
    const statWords = document.getElementById("stat-words")
    const total = statWords ? (parseInt(statWords.textContent) || 0) : 0
    updateStats(total, currentErrors.length, countForeignMarks())

    userAddedWords.add(word.toLowerCase())
    renderResults(currentErrors, [], [])
    setStatus(t("addedToDict", word))
    document.getElementById("editor")?.focus()

  } catch (err) {
    setStatus(`❌ ${err.message}`)
    console.error("addToDictionary:", err)
  }
}

// ─── Typography auto-fix ─────────────────────────────────────────────────

function fixTypography(type) {
  const editor = document.getElementById("editor")
  if (!editor) return

  const saved = getTextOffset(editor)

  const nodes = []
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
  let n
  while ((n = walker.nextNode())) nodes.push(n)

  let quoteOpen = true  // for straight_quotes alternation

  nodes.forEach(node => {
    let v = node.nodeValue
    switch (type) {
      case "double_space":
        v = v.replace(/ {2,}/g, " ")
        break
      case "hyphen_instead_of_dash":
        v = v.replace(/ - /g, " \u2014 ")
        break
      case "trailing_spaces":
        v = v.replace(/[ \t]+(\n|$)/gm, "$1")
        break
      case "straight_quotes":
        v = v.replace(/"/g, () => { const q = quoteOpen ? "\u201e" : "\u201c"; quoteOpen = !quoteOpen; return q })
        break
      case "missing_space_after_punct":
        v = v.replace(/([.,;:!?])([\u10D0-\u10FFA-Za-z\u00C0-\u024F\u0410-\u044F])/gu, "$1 $2")
        break
      case "multiple_punctuation":
        v = v.replace(/([!?])\1+/g, "$1")
        break
      case "semicolon_as_question":
        v = v.replace(/([\u10D0-\u10FF]);(\s|$)/gu, "$1?$2")
        break
    }
    node.nodeValue = v
  })

  restoreTextOffset(editor, saved)
  const auto = document.getElementById("autoCheck")
  if (auto?.checked) checkSpelling()
}

// ─── Remove from dictionary ──────────────────────────────────────────────

async function removeFromDictionary(word) {
  hideContextMenu()
  const w = word.toLowerCase()
  setStatus(`"${word}"… <span class="spinner"></span>`)

  try {
    await fetch("/api/dictionary/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: w, lang: currentLang })
    })
  } catch (err) {
    console.warn("removeFromDictionary:", err)
  }

  userAddedWords.delete(w)
  userDictionary.delete(w)
  setStatus(t("removedFromDict", word))
  checkSpelling()
}

// ─── Word replacement ────────────────────────────────────────────────────

function replaceWord(oldWord, newWord) {
  const editor = document.getElementById("editor")
  if (!editor) return
  editor.querySelectorAll(`span.err-mark`).forEach(span => {
    if (span.dataset.word === oldWord.toLowerCase()) {
      span.parentNode.replaceChild(document.createTextNode(newWord), span)
    }
  })
  editor.normalize()
  setStatus(t("replaced", oldWord, newWord))
  checkSpelling()
}

// ─── .docx Save ─────────────────────────────────────────────────────────
// Build a minimal valid .docx (ZIP containing Word XML), download it.

function escXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;").replace(/'/g, "&apos;")
}

function saveDocx () {
  const text = getEditorText()
  if (!text.trim()) { setStatus(t("noText")); return }

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
  setStatus(t("fileSaved"))
}

// ─── .docx Open ──────────────────────────────────────────────────────────
// Full-structure extractor: paragraphs, lists, tables, line-breaks, tabs,
// headings (blank line before), hyperlinks, SDT content blocks.

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

// ─── .docx → rich HTML extraction ────────────────────────────────────────

// Get direct child element by local name (avoids recursive getElementsByTagNameNS)
function wChild(parent, localName) {
  for (const ch of parent.childNodes) {
    if (ch.nodeType === 1 && ch.localName === localName) return ch
  }
  return null
}

// Read w:val attribute; returns "" when absent
function wVal(el) {
  return el ? (el.getAttributeNS(W, "val") || el.getAttribute("w:val") || "") : ""
}

// Boolean toggle property: absent = false, val="0"/"false" = false, otherwise true
function isToggleOn(rPr, localName) {
  const el = wChild(rPr, localName)
  if (!el) return false
  const v = wVal(el)
  return v !== "0" && v !== "false"
}

// Parse a single <w:r> run → HTML with bold/italic/underline/strike/color/size
function parseRunHtml(r) {
  const rPr = wChild(r, "rPr")
  let bold = false, italic = false, underline = false, strike = false
  let color = null, fontSize = null

  if (rPr) {
    bold   = isToggleOn(rPr, "b")
    italic = isToggleOn(rPr, "i")
    strike = isToggleOn(rPr, "strike")
    // underline: present + val != "none" means underlined
    const uEl = wChild(rPr, "u")
    if (uEl) { const v = wVal(uEl); underline = v !== "" && v !== "none" }
    const cEl = wChild(rPr, "color")
    if (cEl) {
      const v = wVal(cEl)
      if (v && v.toLowerCase() !== "auto" && v !== "000000") color = "#" + v
    }
    const szEl = wChild(rPr, "sz")
    if (szEl) {
      const v = parseInt(wVal(szEl) || "0")
      if (v > 0) fontSize = Math.round(v / 2) // half-points → points
    }
  }

  let text = ""
  for (const ch of r.childNodes) {
    if (ch.nodeType !== 1) continue
    switch (ch.localName) {
      case "t":   text += esc(ch.textContent); break
      case "br":  text += "<br>"; break
      case "tab": text += "&nbsp;&nbsp;&nbsp;&nbsp;"; break
    }
  }
  if (!text) return ""

  let style = ""
  if (color)    style += `color:${color};`
  if (fontSize) style += `font-size:${fontSize}pt;`

  let html = text
  if (bold)      html = `<strong>${html}</strong>`
  if (italic)    html = `<em>${html}</em>`
  if (underline) html = `<u>${html}</u>`
  if (strike)    html = `<s>${html}</s>`
  if (style)     html = `<span style="${style}">${html}</span>`
  return html
}

// Collect run HTML from an element (handles nested hyperlink/ins/sdtContent)
function runsHtml(el) {
  let out = ""
  for (const ch of el.childNodes) {
    if (ch.nodeType !== 1) continue
    if (ch.localName === "r") out += parseRunHtml(ch)
    else if (["hyperlink", "ins", "del", "sdtContent"].includes(ch.localName)) out += runsHtml(ch)
  }
  return out
}

// Parse <w:p> → HTML block element
function parseParagraphHtml(p) {
  const pPr = wChild(p, "pPr")
  const pStyleEl = pPr ? wChild(pPr, "pStyle") : null
  const styleVal = pStyleEl ? (wVal(pStyleEl)).toLowerCase() : ""

  const isListItem = pPr ? !!wChild(pPr, "numPr") : false

  let tag = "p"
  const hm = styleVal.match(/heading(\d)/)
  if (hm) tag = "h" + Math.min(parseInt(hm[1]), 6)
  else if (styleVal === "title")    tag = "h1"
  else if (styleVal === "subtitle") tag = "h2"

  const innerHtml = runsHtml(p)
  const content = isListItem ? "• " + innerHtml : innerHtml
  return content.trim() ? `<${tag}>${content}</${tag}>` : `<p><br></p>`
}

// Parse <w:tbl> → simple HTML table
function parseTableHtml(tbl) {
  const rows = Array.from(tbl.getElementsByTagNameNS(W, "tr"))
  const rowHtml = rows.map(row => {
    const cells = Array.from(row.getElementsByTagNameNS(W, "tc"))
    return "<tr>" + cells.map(cell => {
      const inner = Array.from(cell.childNodes)
        .filter(n => n.nodeType === 1 && n.localName === "p")
        .map(parseParagraphHtml).join("")
      return `<td style="border:1px solid #ccc;padding:4px 8px">${inner}</td>`
    }).join("") + "</tr>"
  }).join("")
  return `<table style="border-collapse:collapse;width:100%">${rowHtml}</table>`
}

function extractDocxHtml(xmlDoc) {
  const body = xmlDoc.getElementsByTagNameNS(W, "body")[0]
  if (!body) return ""
  const blocks = []
  for (const node of body.childNodes) {
    if (node.nodeType !== 1) continue
    switch (node.localName) {
      case "p":   blocks.push(parseParagraphHtml(node)); break
      case "tbl": blocks.push(parseTableHtml(node)); break
      case "sdt": {
        const content = node.getElementsByTagNameNS(W, "sdtContent")[0]
        if (content) for (const ch of content.childNodes) {
          if (ch.nodeType !== 1) continue
          if (ch.localName === "p")   blocks.push(parseParagraphHtml(ch))
          if (ch.localName === "tbl") blocks.push(parseTableHtml(ch))
        }
        break
      }
    }
  }
  return blocks.join("")
}

function openDocx () {
  document.getElementById("docxFile").click()
}

function handleDocxOpen (files) {
  if (!files || !files.length) return
  const file = files[0]
  setStatus(`${file.name}… <span class="spinner"></span>`)

  const reader = new FileReader()
  reader.onload = e => {
    try {
      const zipData = new Uint8Array(e.target.result)
      const unzipped = unzipSync(zipData)

      const docKey = Object.keys(unzipped).find(k => k.match(/word\/document\.xml$/i))
      if (!docKey) throw new Error("word/document.xml not found in archive")

      const xmlStr = strFromU8(unzipped[docKey])
      const xmlDoc = new DOMParser().parseFromString(xmlStr, "application/xml")

      const parseErr = xmlDoc.querySelector("parsererror")
      if (parseErr) throw new Error("XML parse error: " + parseErr.textContent.slice(0, 80))

      const html = extractDocxHtml(xmlDoc)

      const editor = document.getElementById("editor")
      if (editor) {
        editor.innerHTML = html
        editor.focus()
      }

      // Word count from plain text of the generated HTML
      const tmp = document.createElement("div")
      tmp.innerHTML = html
      const wordCount = (tmp.textContent || "").trim().split(/\s+/).filter(Boolean).length
      setStatus(`${t("fileOpen", file.name)} — ${wordCount.toLocaleString()}`)

      document.getElementById("docxFile").value = ""

      const auto = document.getElementById("autoCheck")
      if (auto?.checked) checkSpelling()

    } catch (err) {
      setStatus(`❌ ${err.message}`)
      console.error("openDocx:", err)
    }
  }
  reader.readAsArrayBuffer(file)
}

// ─── Reset ──────────────────────────────────────────────────────────────

function resetUI() {
  currentErrors = []
  updateStats(0, 0)
  const hint = document.getElementById("results-hint")
  if (hint) { hint.textContent = ""; hint.style.display = "none" }
  const results = document.getElementById("results")
  if (results) results.innerHTML = ""
  applySpellMarks([])
  setStatus(t("ready"))
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
    setStatus(`${userDictionary.size}`)  // word count shown
  }
  reader.readAsText(files[0], "UTF-8")
}

// ─── UI helpers ─────────────────────────────────────────────────────────

function clearInput() {
  if (activeRequest) { activeRequest.abort(); activeRequest = null }
  const editor = document.getElementById("editor")
  if (editor) { editor.innerHTML = ""; editor.focus() }
  resetUI()
}

// ─── Formatting toolbar ──────────────────────────────────────────────────

let isComposing = false

function initFormattingToolbar() {
  const toolbar = document.getElementById("fmt-toolbar")
  const editor  = document.getElementById("editor")
  if (!toolbar || !editor) return

  // Save last selection so toolbar actions can restore it before execCommand
  let savedRange = null
  editor.addEventListener("blur", () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount) savedRange = sel.getRangeAt(0).cloneRange()
  })

  function restoreSelection() {
    if (!savedRange) return
    editor.focus()
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(savedRange)
  }

  // Direct DOM block replacement — reliable alternative to formatBlock
  function replaceBlock(tag, className) {
    restoreSelection()
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return

    // Find the direct child of editor that contains the selection start
    let node = sel.getRangeAt(0).startContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
    let block = node
    while (block && block.parentElement !== editor) block = block.parentElement
    if (!block || block === editor) return

    const newEl = document.createElement(tag)
    if (className) newEl.className = className
    while (block.firstChild) newEl.appendChild(block.firstChild)
    block.parentNode.replaceChild(newEl, block)

    // Move cursor to end of new element
    const range = document.createRange()
    range.selectNodeContents(newEl)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
    savedRange = range.cloneRange()
  }

  // Prevent toolbar BUTTON clicks from stealing editor focus
  toolbar.addEventListener("mousedown", e => {
    if (e.target.closest("select, input")) return  // let select/input work normally
    e.preventDefault()
  })

  toolbar.addEventListener("click", e => {
    const btn = e.target.closest(".fmt-btn[data-cmd]")
    if (btn) {
      document.execCommand(btn.dataset.cmd, false, null)
      editor.focus()
      updateToolbarState()
    }
    const clr = e.target.closest("#fmt-clear-fmt")
    if (clr) {
      document.execCommand("removeFormat", false, null)
      document.execCommand("unlink", false, null)
      editor.focus()
      updateToolbarState()
    }
  })

  document.getElementById("fmt-style")?.addEventListener("change", e => {
    const val = e.target.value
    if (val === "title") {
      replaceBlock("h1", "doc-title")
    } else if (val === "subtitle") {
      replaceBlock("h2", "doc-subtitle")
    } else {
      restoreSelection()
      document.execCommand("formatBlock", false, val)
      // Strip title/subtitle class from the resulting block
      const sel = window.getSelection()
      if (sel && sel.rangeCount) {
        let node = sel.getRangeAt(0).startContainer
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
        const block = node.closest("h1,h2,h3,h4,h5,h6,p,blockquote,pre")
        if (block) block.classList.remove("doc-title", "doc-subtitle")
      }
      editor.focus()
    }
    updateToolbarState()
  })

  document.getElementById("fmt-size")?.addEventListener("change", e => {
    // execCommand fontSize uses 1-7 scale; use font tag then restyle
    document.execCommand("fontSize", false, "7")
    editor.querySelectorAll("font[size='7']").forEach(f => {
      f.removeAttribute("size")
      f.style.fontSize = e.target.value + "px"
      // convert to span for cleaner HTML
      const span = document.createElement("span")
      span.style.fontSize = f.style.fontSize
      while (f.firstChild) span.appendChild(f.firstChild)
      f.parentNode.replaceChild(span, f)
    })
    editor.focus()
  })

  document.getElementById("fmt-color")?.addEventListener("input", e => {
    document.execCommand("foreColor", false, e.target.value)
    editor.focus()
  })

  document.addEventListener("selectionchange", () => {
    if (document.activeElement === editor) updateToolbarState()
  })
}

function updateToolbarState() {
  ["bold", "italic", "underline", "strikeThrough"].forEach(cmd => {
    const btn = document.querySelector(`.fmt-btn[data-cmd="${cmd}"]`)
    if (btn) btn.classList.toggle("active", document.queryCommandState(cmd))
  })

  // Reflect current block tag in the style dropdown
  const styleSelect = document.getElementById("fmt-style")
  if (styleSelect) {
    const sel = window.getSelection()
    if (sel && sel.rangeCount) {
      let el = sel.getRangeAt(0).startContainer
      if (el.nodeType === Node.TEXT_NODE) el = el.parentElement
      const block = el.closest("h1,h2,h3,h4,h5,h6,blockquote,pre,p")
      if (block) {
        if (block.classList.contains("doc-title"))    styleSelect.value = "title"
        else if (block.classList.contains("doc-subtitle")) styleSelect.value = "subtitle"
        else {
          const tag = block.tagName.toLowerCase()
          const opt = styleSelect.querySelector(`option[value="${tag}"]`)
          styleSelect.value = opt ? tag : "p"
        }
      } else {
        styleSelect.value = "p"
      }
    }
  }
}

// ─── Init ────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initFormattingToolbar()

  const editor       = document.getElementById("editor")
  const results      = document.getElementById("results")
  const dictFile     = document.getElementById("dictionaryFile")
  const docxFile     = document.getElementById("docxFile")

  // ── Language selector ────────────────────────────────────────────────────

  const langSelect = document.getElementById("langSelect")

  // Restore saved language in the select element
  if (langSelect && T[currentLang]) langSelect.value = currentLang

  function applyLanguageUI() {
    if (editor) editor.dataset.placeholder = t("placeholder")
    const q = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt }
    q("btn-check",      t("check"))
    q("btn-clear",      t("clear"))
    q("btn-save",       t("save"))
    q("btn-open",       t("open"))
    q("btn-dict",       t("addDict"))
    q("brand-subtitle", t("brandSubtitle"))
    // auto-label span
    const autoSpan = document.querySelector(".auto-label span")
    if (autoSpan) autoSpan.textContent = t("auto")
    // stats labels
    document.querySelectorAll(".stat-label").forEach((el, i) => {
      el.textContent = [t("labelWords"), t("labelErrors"), t("labelAccuracy"), t("labelForeign")][i] || el.textContent
    })
    setStatus(t("ready"))
  }

  langSelect?.addEventListener("change", () => {
    currentLang = langSelect.value
    localStorage.setItem("spellLang", currentLang)
    applyLanguageUI()
    // Re-render marks with new foreign-detection logic
    applySpellMarks(currentErrors)
    // Trigger re-check if auto is on
    const auto = document.getElementById("autoCheck")
    if (auto?.checked && getEditorText().trim()) {
      clearTimeout(checkTimer)
      checkTimer = setTimeout(checkSpelling, 400)
    }
  })

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

  // ── Editor: typing, auto-check ───────────────────────────────────────────

  editor?.addEventListener("compositionstart", () => { isComposing = true })
  editor?.addEventListener("compositionend",   () => {
    isComposing = false
    triggerAutoCheck()
  })
  editor?.addEventListener("input", () => { if (!isComposing) triggerAutoCheck() })

  function triggerAutoCheck() {
    const text = getEditorText()
    const len  = text.length
    const auto = document.getElementById("autoCheck")
    if (auto?.checked) {
      clearTimeout(checkTimer)
      if (len > 0) setStatus(`${len.toLocaleString()}…`)
      checkTimer = setTimeout(checkSpelling, debounceDelay(len))
    }
  }

  // ── Results panel: fix-btn clicks + right-click context menu ───────────

  results?.addEventListener("click", e => {
    const btn = e.target.closest(".fix-btn")
    if (btn) { replaceWord(btn.dataset.old, btn.dataset.new); return }
    const typoBtn = e.target.closest(".typo-fix-btn")
    if (typoBtn) fixTypography(typoBtn.dataset.type)
  })

  results?.addEventListener("contextmenu", e => {
    e.preventDefault()
    // Right-click on a suggestion fix-btn → offer to remove that word from dictionary
    const fixBtn = e.target.closest(".fix-btn")
    if (fixBtn) { showContextMenu(fixBtn.dataset.new, e.clientX, e.clientY); return }
    // Right-click on error card → show menu for the error word
    const card = e.target.closest(".error-card")
    if (card) {
      const word = card.querySelector(".error-word")?.textContent?.trim()
      if (word) showContextMenu(word, e.clientX, e.clientY)
    }
  })

  // ── Editor: hover tooltip on spell marks ────────────────────────────────

  editor?.addEventListener("mouseover", e => {
    const errMark = e.target.closest("span.err-mark")
    const fgnMark = e.target.closest("span.foreign-mark")
    if (errMark) {
      const word  = errMark.dataset.word
      const error = currentErrors.find(err => err.word === word)
      if (error) showTooltip(word, error.suggestions, errMark)
    } else if (fgnMark) {
      showForeignTooltip(fgnMark.dataset.word, fgnMark)
    }
  })
  editor?.addEventListener("mouseout", e => {
    if (e.target.closest("span.err-mark") || e.target.closest("span.foreign-mark"))
      scheduleHideTooltip()
  })
  editor?.addEventListener("contextmenu", e => {
    const mark = e.target.closest("span.err-mark, span.foreign-mark")
    if (!mark) return
    e.preventDefault()
    showContextMenu(mark.dataset.word, e.clientX, e.clientY)
  })

  editor?.addEventListener("keydown", hideTooltipNow)

  applyLanguageUI()
  document.getElementById("editor")?.focus()
  setStatus("მზადაა")
})
