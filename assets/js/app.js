// --- Phoenix LiveView სტანდარტული ნაწილი ---
import "phoenix_html"
import { Socket } from "phoenix"
import { LiveSocket } from "phoenix_live_view"
import topbar from "../vendor/topbar"

let csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")
let liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: { _csrf_token: csrfToken }
})

topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" })
window.addEventListener("phx:page-loading-start", _info => topbar.show(300))
window.addEventListener("phx:page-loading-stop", _info => topbar.hide())

liveSocket.connect()
window.liveSocket = liveSocket
// --- Phoenix ნაწილი დასრულდა ---

// ==========================
// კურსორის პოზიციის შენარჩუნება contenteditable რედაქტორში
// ==========================

// ტექსტში კურსორის პოზიციის გამოთვლა (ინდექსით)
function getCaretCharacterOffsetWithin(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

// კურსორის პოზიციის აღდგენა ინდექსით
function setCaretPositionByOffset(element, offset) {
  const range = document.createRange();
  const selection = window.getSelection();
  let current = 0;

  function traverse(node) {
    if (!node) return false;

    if (node.nodeType === Node.TEXT_NODE) {
      const textLen = node.textContent ? node.textContent.length : 0;
      const next = current + textLen;
      if (offset >= current && offset <= next) {
        range.setStart(node, offset - current);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      }
      current = next;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        if (traverse(node.childNodes[i])) return true;
      }
    }
    return false;
  }

  traverse(element);
}

// --- მთავარის ინიციალიზაცია ---
document.addEventListener('DOMContentLoaded', function() {
  const editor = document.getElementById('editor');
  if (!editor) return;

  let previousText = editor.innerText;

  // ედიტორის ცვლილების დამუშავება
  const observer = new MutationObserver(() => {
    // ამოცანა: როცა ტექსტი იცვლება პროგრამულად, შევინარჩუნოთ კურსორი
    const caretPos = getCaretCharacterOffsetWithin(editor);
    const newText = editor.innerText;

    if (newText !== previousText) {
      previousText = newText;
      setTimeout(() => {
        try {
          setCaretPositionByOffset(editor, Math.min(caretPos, editor.innerText.length));
        } catch (err) {
          console.warn("Cursor position maintenance error:", err);
        }
      }, 10);
    }
  });

  observer.observe(editor, { childList: true, characterData: true, subtree: true });

  // მომხმარებლის მიერ ჩაწერისას
  editor.addEventListener('input', () => {
    const caretPos = getCaretCharacterOffsetWithin(editor);
    previousText = editor.innerText;
    setTimeout(() => {
      setCaretPositionByOffset(editor, caretPos);
    }, 0);
  });

  // ფოკუსის დაკარგვისას - აღვადგინოთ პოზიცია დაბრუნებისას
  let lastCaret = 0;
  editor.addEventListener('blur', () => {
    lastCaret = getCaretCharacterOffsetWithin(editor);
  });
  editor.addEventListener('focus', () => {
    setTimeout(() => setCaretPositionByOffset(editor, lastCaret), 10);
  });
});
