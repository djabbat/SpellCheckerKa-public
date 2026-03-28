# MAP.md — SpellCheckerKa: Architecture & Component Interaction

## Part 1: System Components

| Component | Type | Location | Responsibility |
|-----------|------|----------|----------------|
| **Dictionary** | Elixir GenServer + ETS | `lib/spellcheckerka/dictionary.ex` | 993,589-word ETS lookup, Levenshtein suggestions, Georgian confusion table, user word persistence |
| **Morphology** | Elixir module | `lib/spellcheckerka/morphology.ex` | 185+ suffix rules, 7 noun cases, 14 verb preverbs, stem restoration |
| **LangDictionary** | Elixir GenServer + ETS | `lib/spellcheckerka/lang_dictionary.ex` | en/fr/es/ru dictionaries, plain Levenshtein |
| **SpellController** | Phoenix Controller | `lib/spellcheckerka_web/controllers/spell_controller.ex` | REST API: /api/check, /api/dictionary/add/remove; chunked processing; multi-language |
| **RateLimiter** | Phoenix Plug + ETS | `lib/spellcheckerka_web/plugs/rate_limiter.ex` | 30 req/min per IP, rolling window, 402 on quota exhaustion |
| **UsageTracker** | Elixir GenServer + ETS | `lib/spellcheckerka/usage_tracker.ex` | 30 min/day free quota per IP |
| **RateLimiterCleaner** | Elixir GenServer | `lib/spellcheckerka/rate_limiter_cleaner.ex` | Sweeps rate-limit ETS every 5 min |
| **Frontend (app.js)** | Vanilla JS | `assets/js/app.js` | Mirror overlay, debounce, .docx I/O, 8-language UI, chunk splitting |
| **Browser Extension** | Chrome Manifest V3 | `extension/` | content scripts, popup, background Service Worker |
| **Deploy** | Bash + Docker | `deploy.sh`, `docker/` | Build → SCP → docker compose on schecker.ge |

---

## Part 2: Request Data Flow

```
USER BROWSER
│
├─ Types text in textarea (web app)
│       │
│       ▼ debounce (500ms–2.5s)
│  [app.js]
│  • If text > 3KB: split into paragraph chunks
│  • Else: single POST /api/check
│       │
│       ▼ POST /api/check {text, lang} or {chunks:[...], lang}
│
PHOENIX SERVER (fclc-server port 4000/4001)
│
├─ [RateLimiter Plug]
│  • Check ETS: requests < 30/min per IP?
│  • Check UsageTracker: daily quota remaining?
│  • → 429 if rate exceeded, 402 if quota exhausted
│       │
│       ▼
├─ [SpellController.check/2]
│  • Validate text size (≤ 2MB, ≤ 100k words)
│  • Tokenize (split on whitespace + punctuation)
│  • For each token:
│       ├─ Georgian (ka): Dictionary.member?(word) || Morphology.valid?(word)
│       │   → if error: Dictionary.suggestions(word) → top 5 candidates
│       └─ Other langs: LangDictionary.member?(lang, word)
│  • Typography check (double spaces, quotes, hyphens, georgian semicolon)
│  • Stopword detection (25 Georgian filler words)
│  • Return: {total_words, error_count, accuracy, errors[], typography[], stopwords[]}
│       │
│       ▼
│  [app.js receives JSON]
│  • Render mirror overlay with <span class="error"> marks
│  • Render error cards (paginated, 50/page)
│  • Hover on error → suggestion menu → click to fix → re-check
│  • Typography section, Stopwords section
│
├─ POST /api/dictionary/add {word}
│  → Dictionary.add_word(word) → ETS insert + append user_words.txt
│
└─ POST /api/dictionary/remove {word}
   → Dictionary.remove_word(word) → ETS delete + rewrite user_words.txt
```

---

## Part 3: Browser Extension Data Flow

```
BROWSER EXTENSION
│
├─ User visits any website
│       │
│       ▼ (content_generic.js injected)
│  [content_generic.js]
│  • MutationObserver watches DOM for text changes
│  • On Ctrl+Shift+K OR toolbar click:
│       │
│       ▼ message to background.js
│  [background.js Service Worker]
│  • Debounce 800ms
│  • Check cache (in-memory, 30s TTL)
│  • POST to https://schecker.ge/api/check
│       │
│       ▼ JSON response
│  [content_generic.js]
│  • Inject <span class="spellcheck-error"> wrapping around errors
│  • Hover tooltip with suggestions
│  • Click suggestion → replace in DOM
│
├─ User visits Google Docs
│       ▼ (content_gdocs.js injected instead)
│  [content_gdocs.js]
│  • Uses Google Docs internal textarea
│  • Special DOM traversal for Docs content model
```

---

## Part 4: Dictionary Architecture

```
Application Startup
│
└─ SpellCheckerKa.Application (OTP Supervisor)
   │
   ├─ Dictionary.start_link/0
   │  • Creates :georgian_dict ETS table
   │  • Loads ge.txt → 993,589 words into ETS
   │  • Loads user_words.txt → custom words into ETS
   │  Time: ~2s on first load, then O(1) lookups
   │
   ├─ LangDictionary.start_link/0
   │  • Creates :lang_dict_{en,fr,es,ru} ETS tables
   │  • Loads respective .txt files
   │
   ├─ RateLimiterCleaner.start_link/0
   │  • Creates :rate_limits ETS table
   │  • Schedules cleanup every 5min
   │
   └─ UsageTracker.start_link/0
      • Creates :usage_tracker ETS table
      • Resets daily at midnight

Suggestion pipeline for a misspelled word:
  1. get_candidates(word) → all ETS words within Levenshtein ≤ 4
  2. adjust_distance(word, candidate) using confusion table
     (phonetically similar substitutions cost 0.5 instead of 1.0)
  3. sort by adjusted_distance + word_frequency (common words ranked higher)
  4. return top 5
```

---

## Part 5: Module Dependencies

```
spellcheckerka (OTP Application)
├── SpellCheckerKa.Dictionary       (no external deps, pure ETS)
├── SpellCheckerKa.Morphology       (no external deps, pure functions)
├── SpellCheckerKa.LangDictionary   (no external deps, pure ETS)
├── SpellCheckerKa.UsageTracker     (no external deps, GenServer)
├── SpellCheckerKa.RateLimiterCleaner (no external deps, GenServer)
└── SpellCheckerKa.Mailer           (Swoosh)

spellcheckerka_web
├── SpellCheckerKaWeb.Router        (Phoenix)
├── SpellCheckerKaWeb.SpellController (→ Dictionary, Morphology, LangDictionary)
├── SpellCheckerKaWeb.PageController  (→ static HTML)
└── SpellCheckerKaWeb.Plugs.RateLimiter (→ UsageTracker)

Frontend
├── app.js (Vanilla JS)
│   └── fflate (ZIP for .docx)
└── app.css (Tailwind CSS)

Extension (independent, no shared deps with Elixir)
├── background.js (Service Worker)
├── content_generic.js (DOM injection)
├── content_gdocs.js (Google Docs)
└── popup.js + popup.html (UI)
```

---

## Part 6: Deployment Architecture

```
schecker.ge (Linux server)
│
├─ nginx (port 80/443)
│  • TLS termination
│  • Proxy pass → 127.0.0.1:4001
│
└─ Docker container (port 4001 → 4000)
   │
   └─ Phoenix app (Bandit HTTP server, port 4000)
      ├─ ETS tables (in-memory: dictionary, rate limits, usage)
      └─ SQLite: None (stateless architecture)

deploy.sh flow:
  1. docker build -t spellcheckerka:latest .
  2. docker save → gzip → /tmp/spellcheckerka.tar.gz
  3. scp to deploy@schecker.ge:/opt/spellcheckerka/
  4. ssh: docker load + docker compose up -d --remove-orphans
```

---

## Part 7: Roadmap Phases (from CONCEPT.md)

| Phase | Component | Status |
|-------|-----------|--------|
| 1 | Web app MVP | ✅ Complete |
| 2 | Mobile app (React Native) | ⏳ Planned |
| 2 | Keyboard extension (iOS/Android) | ⏳ Planned |
| 2 | OCR with camera (Tesseract.js) | ⏳ Planned |
| 3 | Browser extension (Manifest V3) | ✅ Complete |
| 3 | User authentication | ⏳ Partial |
| 4 | Premium subscription (payment) | ⏳ Planned |
| 5 | Grammar checker (beyond spell) | ⏳ Future |
