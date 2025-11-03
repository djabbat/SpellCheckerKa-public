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
// გლობალური ცვლადები და ფუნქციები
// ==========================

// ძირითადი ლექსიკონი
let georgianDictionary = new Set();
let currentErrors = [];
let isSpellCheckEnabled = true;
let suggestionsMenu = null;
let isProgrammaticChange = false;
let isUserTyping = false;
let lastCaretPosition = 0;
let suggestionsMenuClickListener = null;
let skipNextCursorRestore = false;

// რეგექსში სპეციალური სიმბოლოების ესკეიპინგის ფუნქცია
window.escapeRegExp = function(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// კურსორის დასაწყისში გადატანის ფუნქცია
window.moveCursorToStart = function(element) {
  if (!element) return;
  element.focus();
  const range = document.createRange();
  const selection = window.getSelection();
  if (element.firstChild) {
    range.setStart(element.firstChild, 0);
    range.setEnd(element.firstChild, 0);
  } else {
    range.setStart(element, 0);
    range.setEnd(element, 0);
  }
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

// კურსორის დასასრულში გადატანის ფუნქცია
window.moveCursorToEnd = function(element) {
  if (!element) return;
  element.focus();
  const range = document.createRange();
  const selection = window.getSelection();
  if (element.lastChild) {
    range.setStart(element.lastChild, element.lastChild.textContent.length);
    range.setEnd(element.lastChild, element.lastChild.textContent.length);
  } else {
    range.setStart(element, 0);
    range.setEnd(element, 0);
  }
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

// ტექსტში კურსორის პოზიციის გამოთვლა (ინდექსით)
window.getCaretCharacterOffsetWithin = function(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

// კურსორის პოზიციის აღდგენა ტექსტის ინდექსით
window.setCaretPositionByOffset = function(element, offset) {
  if (!element || skipNextCursorRestore) return;
  
  const range = document.createRange();
  const selection = window.getSelection();
  let current = 0;
  let found = false;

  function traverse(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = node.textContent ? node.textContent.length : 0;
      const next = current + textLength;
      if (offset >= current && offset <= next && !found) {
        const position = Math.min(offset - current, textLength);
        range.setStart(node, position);
        range.collapse(true);
        found = true;
        return true;
      }
      current = next;
    } else {
      for (let i = 0; i < node.childNodes.length && !found; i++) {
        traverse(node.childNodes[i]);
      }
    }
    return found;
  }

  traverse(element);
  
  if (found) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

// ლექსიკონის ჩატვირთვა
window.loadExternalDictionary = async function() {
  const fileInput = document.getElementById('dictionaryFile');
  fileInput.click();
}

// ფაილის დამუშავება
window.handleDictionaryFile = function(files) {
  if (files.length === 0) return;
  const file = files[0];
  if (!file.name.endsWith('.txt')) {
    updateStatus('❌ გთხოვთ აირჩიოთ .txt ფაილი');
    return;
  }

  updateStatus('იტვირთება... <span class="loading"></span>');
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const content = e.target.result;
      processDictionaryContent(content);
      updateStatus('✅ ლექსიკონი წარმატებით ჩაიტვირთა');
    } catch (error) {
      console.error('Error loading dictionary:', error);
      updateStatus('❌ ლექსიკონის ჩატვირთვა ვერ მოხერხდა');
    }
  };

  reader.onerror = function() {
    updateStatus('❌ ფაილის წაკითხვა ვერ მოხერხდა');
  };

  reader.readAsText(file, 'UTF-8');
}

// ლექსიკონის კონტენტის დამუშავება
function processDictionaryContent(content) {
  const lines = content.split('\n');
  let loadedWords = 0;

  georgianDictionary.clear();
  lines.forEach(line => {
    const word = line.trim();
    if (word && word.length >= 2 && !word.startsWith('#') && /^[ა-ჰ\-]+$/.test(word)) {
      georgianDictionary.add(word.toLowerCase());
      loadedWords++;
    }
  });

  updateStatus(`ლექსიკონი ჩატვირთულია: ${loadedWords} სიტყვა`);

  setTimeout(() => {
    const editor = document.getElementById('editor');
    if (editor.textContent.trim()) {
      checkSpelling();
    }
  }, 100);
}

// მთავარი შემოწმების ფუნქცია
window.checkSpelling = async function() {
  if (!isSpellCheckEnabled) return;

  const editor = document.getElementById('editor');
  const text = editor.textContent || editor.innerText;

  if (!text.trim()) {
    updateStatistics(0, 0);
    displayResults([]);
    return;
  }

  // შევინახოთ კურსორის ინდექსური პოზიცია ტექსტში
  const savedCaretOffset = getCaretCharacterOffsetWithin(editor);
  lastCaretPosition = savedCaretOffset;

  try {
    const response = await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    currentErrors = data.errors;

    updateStatistics(data.total_words, data.error_count);
    displayResults(currentErrors);
    
    // ჰაილაითინგი
    isProgrammaticChange = true;
    highlightErrorsInText();
    isProgrammaticChange = false;

    // აღვადგინოთ კურსორი იგივე პოზიციაზე, მხოლოდ თუ არ გვინდა რომ გამოვტოვოთ
    if (!skipNextCursorRestore) {
      setTimeout(() => {
        const editor = document.getElementById('editor');
        setCaretPositionByOffset(editor, savedCaretOffset);
      }, 10);
    }

  } catch (error) {
    console.error('Error checking spelling:', error);
    // ლოკალური შემოწმება თუ API ვერ მუშაობს
    performLocalSpellCheck(text, savedCaretOffset);
  }
}

// ლოკალური შემოწმება
function performLocalSpellCheck(text, savedCaretOffset) {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const errors = [];
  
  words.forEach(word => {
    const cleanWord = word.replace(/[.,!?;:()]/g, '').toLowerCase();
    if (cleanWord.length > 1 && !georgianDictionary.has(cleanWord)) {
      errors.push({
        word: word,
        count: 1,
        suggestions: []
      });
    }
  });
  
  currentErrors = errors;
  updateStatistics(words.length, errors.length);
  displayResults(errors);
  
  isProgrammaticChange = true;
  highlightErrorsInText();
  isProgrammaticChange = false;
  
  if (!skipNextCursorRestore) {
    setTimeout(() => {
      const editor = document.getElementById('editor');
      setCaretPositionByOffset(editor, savedCaretOffset);
    }, 10);
  }
}

// ჰაილაითინგი - გამოსწორებული ვერსია
function highlightErrorsInText() {
  const editor = document.getElementById('editor');
  if (!editor) return;

  // გამოვიყენოთ textContent რომ მივიღოთ მხოლოდ ტექსტი HTML-ის გარეშე
  const originalText = editor.textContent || '';
  
  if (!originalText.trim()) {
    removeHighlights();
    return;
  }

  // შევინახოთ მიმდინარე HTML სანამ ცვლილებებს შევიტანთ
  const currentHTML = editor.innerHTML;
  
  // დავიწყოთ სუფთა ტექსტიდან და დავამატოთ ჰაილაითები
  let newHTML = currentHTML;
  
  // წავშალოთ ყველა არსებული misspelled span
  newHTML = newHTML.replace(/<span class="misspelled"[^>]*?>([^<]*)<\/span>/gi, '$1');
  
  // დავამატოთ ახალი ჰაილაითები თითოეული შეცდომისთვის
  currentErrors.forEach(error => {
    const escapedWord = escapeRegExp(error.word);
    // გამოვიყენოთ უფრო ზუსტი regex რომ მხოლოდ სრული სიტყვები მოიძებნოს
    const regex = new RegExp(`(^|\\s|>|\\(|\\[)(${escapedWord})(?=\\s|$|[\\.\\,\\!\\?\\;\\:\\)\\]\\>])`, 'gi');
    
    newHTML = newHTML.replace(regex, (match, before, word) => {
      return before + `<span class="misspelled" data-word="${error.word}" onclick="window.showSuggestionsMenu('${error.word.replace(/'/g, "\\'")}', event)">${word}</span>`;
    });
  });

  // მხოლოდ შეცვლილი კონტენტის ჩასმა
  if (newHTML !== currentHTML) {
    editor.innerHTML = newHTML;
  }
}

// ჰაილაითების წაშლა
function removeHighlights() {
  const editor = document.getElementById('editor');
  if (!editor) return;
  
  const highlighted = editor.querySelectorAll('.misspelled');
  highlighted.forEach(span => {
    const parent = span.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(span.textContent), span);
    }
  });
}

// შემოთავაზებების მენიუს ჩვენება
window.showSuggestionsMenu = function(word, event) {
  hideSuggestionsMenu();
  const error = currentErrors.find(e => e.word === word);
  if (!error) return;

  suggestionsMenu = document.createElement('div');
  suggestionsMenu.className = 'suggestions-menu';

  const rect = event.target.getBoundingClientRect();
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  
  const x = rect.left + scrollX;
  const y = rect.bottom + scrollY;

  suggestionsMenu.style.left = x + 'px';
  suggestionsMenu.style.top = y + 'px';

  suggestionsMenu.innerHTML = `
    <div class="suggestions-header">
      <span>შემოთავაზებები: "${word}"</span>
      <button class="close-btn" onclick="window.hideSuggestionsMenu()">×</button>
    </div>
    <div class="suggestions-list">
      ${error.suggestions.length > 0 ?
        error.suggestions.map(suggestion => `
          <div class="suggestion-item" onclick="window.replaceWord('${word.replace(/'/g, "\\'")}', '${suggestion.replace(/'/g, "\\'")}')">
            ${suggestion}
          </div>
        `).join('') :
        '<div class="no-suggestions">შემოთავაზებები არ არის</div>'
      }
    </div>
  `;

  document.body.appendChild(suggestionsMenu);

  // Event listener-ის დამატება მენიუს დასახურად
  setTimeout(() => {
    suggestionsMenuClickListener = function(e) {
      if (!suggestionsMenu) {
        document.removeEventListener('click', suggestionsMenuClickListener);
        return;
      }
      if (!suggestionsMenu.contains(e.target) && !e.target.classList.contains('misspelled')) {
        hideSuggestionsMenu();
      }
    };
    document.addEventListener('click', suggestionsMenuClickListener);
  }, 10);
}

// მენიუს დამალვა
window.hideSuggestionsMenu = function() {
  if (suggestionsMenu) {
    suggestionsMenu.remove();
    suggestionsMenu = null;
  }
  if (suggestionsMenuClickListener) {
    document.removeEventListener('click', suggestionsMenuClickListener);
    suggestionsMenuClickListener = null;
  }
}

// სიტყვის ჩანაცვლება
window.replaceWord = function(oldWord, newWord) {
  const editor = document.getElementById('editor');
  const savedCaretOffset = getCaretCharacterOffsetWithin(editor);

  isProgrammaticChange = true;
  
  const currentHTML = editor.innerHTML;
  const regex = new RegExp(`<span class="misspelled"[^>]*?data-word="${escapeRegExp(oldWord)}"[^>]*?>${escapeRegExp(oldWord)}</span>`, 'gi');
  const newHTML = currentHTML.replace(regex, newWord);
  
  editor.innerHTML = newHTML;

  setTimeout(() => {
    isProgrammaticChange = false;
    hideSuggestionsMenu();
    updateStatus(`სიტყვა "${oldWord}" შეიცვალა "${newWord}"-ით`);
    
    // კურსორის აღდგენა ახალ პოზიციაზე
    const newOffset = savedCaretOffset - oldWord.length + newWord.length;
    setCaretPositionByOffset(editor, Math.max(0, newOffset));
    
    setTimeout(() => checkSpelling(), 100);
  }, 10);
}

// მართლწერის ჩართვა/გამორთვა
window.toggleSpellCheck = function() {
  isSpellCheckEnabled = !isSpellCheckEnabled;
  const toggleBtn = document.getElementById('spellCheckToggle');

  if (isSpellCheckEnabled) {
    toggleBtn.innerHTML = '<span class="btn-icon">✓</span> მართლწერა: ჩართული';
    checkSpelling();
    updateStatus('მართლწერის შემოწმება ჩართულია');
  } else {
    toggleBtn.innerHTML = '<span class="btn-icon">○</span> მართლწერა: გამორთული';
    removeHighlights();
    updateStatus('მართლწერის შემოწმება გამორთულია');
  }
}

// სტატისტიკის განახლება
function updateStatistics(totalWords, errorCount) {
  const totalWordsEl = document.getElementById('totalWords');
  const errorCountEl = document.getElementById('errorCount');
  const accuracyEl = document.getElementById('accuracy');
  
  if (totalWordsEl) totalWordsEl.textContent = totalWords;
  if (errorCountEl) errorCountEl.textContent = errorCount;
  
  const accuracy = totalWords > 0 ?
    Math.round(((totalWords - errorCount) / totalWords) * 100) : 100;
  
  if (accuracyEl) accuracyEl.textContent = accuracy + '%';
}

// შედეგების ჩვენება
function displayResults(errors) {
  const resultsDiv = document.getElementById('results');
  if (!resultsDiv) return;
  
  if (errors.length === 0) {
    resultsDiv.innerHTML = `
      <div class="success-state">
        <h3>✅ ყველა სიტყვა სწორია!</h3>
        <p>გილოცავთ! ტექსტი შეცდომების გარეშეა დაწერილი.</p>
      </div>
    `;
    return;
  }

  let html = `
    <h3 class="errors-title">📋 ნაპოვნი შეცდომები: ${errors.length}</h3>
    <div class="errors-list">
  `;

  errors.forEach(error => {
    html += `
      <div class="error-item">
        <div class="error-word">${error.word}</div>
        <div class="error-count">გვხვდება: ${error.count} ჯერ</div>
        ${error.suggestions.length > 0 ? `
          <div class="suggestions">
            ${error.suggestions.map(suggestion => `
              <button class="suggestion-btn" onclick="window.replaceWord('${error.word.replace(/'/g, "\\'")}', '${suggestion.replace(/'/g, "\\'")}')">
                ${suggestion}
              </button>
            `).join('')}
          </div>
        ` : '<div class="no-suggestions-text">შემოთავაზებები არ არის</div>'}
      </div>
    `;
  });

  html += `</div>`;
  resultsDiv.innerHTML = html;
}

// სტატუსის განახლება
function updateStatus(message) {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.innerHTML = message;
  }
}

// საწყისი ტექსტის ჩასმა
function insertSampleText() {
  const sampleText = `ჩაწერე ტექსტი.`;
  const editor = document.getElementById('editor');
  isProgrammaticChange = true;
  editor.textContent = sampleText;

  setTimeout(() => {
    isProgrammaticChange = false;
    moveCursorToEnd(editor);
    checkSpelling();
  }, 100);
}

// ==========================
// მთავარი ინიციალიზაცია
// ==========================
document.addEventListener('DOMContentLoaded', function() {
  // ძირითადი ლექსიკონის ინიციალიზაცია
  const basicWords = ["ჩაწერე", "ტექსტი", "და", "არის", "ეს", "რომ"];
  basicWords.forEach(word => georgianDictionary.add(word.toLowerCase()));

  const editor = document.getElementById('editor');
  if (!editor) return;

  let checkTimeout;
  let isComposing = false;

  // ედიტორის ცვლილებების დამუშავება
  editor.addEventListener('input', function(e) {
    if (isProgrammaticChange || isComposing) return;
    
    isUserTyping = true;
    const caretPos = getCaretCharacterOffsetWithin(editor);
    
    clearTimeout(checkTimeout);
    
    if (isSpellCheckEnabled) {
      checkTimeout = setTimeout(() => {
        checkSpelling();
        isUserTyping = false;
      }, 500);
    }
    
    // კურსორის აღდგენა მხოლოდ თუ მომხმარებელი წერს
    setTimeout(() => {
      setCaretPositionByOffset(editor, caretPos);
    }, 0);
  });

  // IME კომპოზიციის მონიტორინგი
  editor.addEventListener('compositionstart', function() {
    isComposing = true;
  });

  editor.addEventListener('compositionend', function() {
    isComposing = false;
  });

  // Enter-ის დაჭერის დამუშავება - გამარტივებული
  editor.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      // აღვნიშნოთ, რომ Enter-ს ვაჭერთ
      skipNextCursorRestore = true;
      
      // მოვიცადოთ ბრაუზერის დეფოლტური ქმედების დასრულებას
      setTimeout(() => {
        // spell checking
        if (isSpellCheckEnabled) {
          clearTimeout(checkTimeout);
          checkTimeout = setTimeout(() => {
            checkSpelling();
            // spell checking-ის დასრულების შემდეგ ჩავრთოთ კურსორის აღდგენა ისევ
            setTimeout(() => {
              skipNextCursorRestore = false;
            }, 50);
          }, 300);
        } else {
          skipNextCursorRestore = false;
        }
      }, 0);
    }
  });

  // ფოკუსის მენეჯმენტი
  editor.addEventListener('blur', () => {
    lastCaretPosition = getCaretCharacterOffsetWithin(editor);
    isUserTyping = false;
  });
  
  editor.addEventListener('focus', () => {
    setTimeout(() => {
      setCaretPositionByOffset(editor, lastCaretPosition);
    }, 10);
  });

  // ინიციალიზაცია
  updateStatus('მზადაა მუშაობისთვის');
  if (!editor.textContent.trim()) {
    insertSampleText();
  }
});