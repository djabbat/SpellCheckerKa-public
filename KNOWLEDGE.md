# KNOWLEDGE.md — SpellCheckerKa: Domain Knowledge

## Georgian Language & Script

### Georgian Script (Mkhedruli)
- **Name:** მხედრული (Mkhedruli) — the modern Georgian script, in use since the 11th century
- **Characters:** 33 letters in modern use; unicameral (no upper/lower case distinction)
- **Unicode range:** U+10D0–U+10FF (Georgian block)
- **Direction:** Left-to-right
- **Other historical scripts:** Asomtavruli (ecclesiastical), Nuskhuri (ecclesiastical); not used in modern text
- **Phonetic characteristic:** Near-perfect phoneme-grapheme correspondence — one sound, one letter (with exceptions: aspirated vs. ejective pairs)

### Georgian Morphology Challenges
Georgian is a **polysynthetic, agglutinative** language with complex morphology:

**Noun Cases (7):**
| Case | Georgian | Suffix example |
|------|----------|----------------|
| Nominative | სახელობითი | -ი |
| Ergative | მოთხრობითი | -მა |
| Dative | მიცემითი | -ს |
| Genitive | მიმართებითი | -ის |
| Instrumental | მოქმედებითი | -ით |
| Adverbial | ვითარებითი | -ად |
| Vocative | წოდებითი | -ო |

**Verb Structure:**
- Verbs carry subject, object, tense, aspect, and mood via prefixes + suffixes + root
- **14 verb preverbs** (directional/aspectual prefixes): გამო, შემო, გადა, ჩა, ამო, ჩამო, გა, ჩადა, ჩაუ, შე, მი, და, ა, წა
- A single verb root can generate hundreds of valid word forms

**Implication for spell-checking:** Checking raw word-list membership alone has high false-positive error rate. Morphological analysis (stripping suffixes/preverbs to reveal stem) is mandatory for Georgian.

### Common Spelling Confusion Pairs
Georgian has several phonetically similar letter pairs that cause frequent spelling errors:

| Letter A | Letter B | Phonetic distinction |
|----------|----------|---------------------|
| ს (s) | შ (sh) | sibilant vs. palato-alveolar |
| კ (k) | ქ (k') | plain velar vs. aspirated velar |
| ბ (b) | პ (p) | voiced vs. unasked bilabial stop |
| გ (g) | ყ (q) | voiced velar vs. uvular ejective |
| ზ (z) | ჟ (zh) | alveolar vs. palato-alveolar fricative |
| დ (d) | ტ (t) | voiced vs. ejective dental |
| ვ (v) | ბ (b) | labiodental vs. bilabial |
| რ (r) | ლ (l) | trill vs. lateral |
| ნ (n) | მ (m) | alveolar vs. bilabial nasal |

SpellCheckerKa's confusion table assigns edit-distance cost 0.5 (instead of 1.0) for these pairs in Levenshtein suggestion ranking.

---

## Spell-Checking Algorithms

### Dictionary Lookup
- **Method:** Exact match in ETS hash table: O(1) average
- **Table:** 993,589 Georgian words loaded from `priv/static/dictionaris/ge.txt`
- **User dictionary:** Custom words stored in `user_words.txt`, loaded into separate ETS set `:user_dict`

### Levenshtein Edit Distance
- **Definition:** Minimum single-character edits (insertions, deletions, substitutions) to transform one word into another
- **SpellCheckerKa max distance:** 4 edits
- **Confusion table adjustment:** Phonetically similar substitutions cost 0.5 (see pairs above)
- **Suggestion ranking:** candidates sorted by adjusted_distance + word_frequency heuristic; top 5 returned

### Morphological Analysis Pipeline
```
input word
    │
    ├─ Dictionary.member?(word) → true → valid, no error
    │
    └─ false → Morphology.valid?(word)
                │
                ├─ Strip longest matching suffix (from 185+ rules)
                ├─ Strip preverb if verb
                ├─ Try stem + ["", "ი", "ა", "ე"]
                └─ Dictionary.member?(stem + ending)?
                        → true → morphologically valid
                        → false → error, compute suggestions
```

### Typography Rules (beyond spelling)
- Double spaces
- Incorrect quotation marks (Georgian uses „..." not "...")
- Incorrect hyphen vs. dash usage
- Georgian semicolon (Georgian text uses specific punctuation norms)
- **25 Georgian stopwords/filler words** flagged for style review

---

## Freemium Patterns

### The 30-Minute Free Tier
- **Rationale:** Generous enough to handle casual daily use (student checking an essay), restrictive enough that a journalist or translator pays
- **IP-based:** No account required for free tier; reduces friction for first-time users
- **HTTP 402 (Payment Required):** Semantically correct HTTP status for quota exhaustion; prompts upgrade CTA
- **HTTP 429 (Too Many Requests):** Separate signal for burst rate limit (30 req/min); temporary, retry after 1 minute

### Freemium Conversion Patterns (industry context)
- Typical SaaS freemium conversion: 2–5% of free users upgrade
- SpellCheckerKa target: 50,000 MAU → ~1,000–2,500 paying users → ~$5,000–12,500 MRR at $4.99/month
- Key conversion trigger: daily quota exhaustion mid-document (high frustration = high conversion intent)

---

## Phoenix/Elixir Performance Characteristics

### Why Elixir/Phoenix for a Spell Checker
- **Concurrent by design:** BEAM VM handles thousands of simultaneous spell-check requests without thread overhead
- **ETS (Erlang Term Storage):** In-process hash table; O(1) reads; read_concurrency: true allows parallel reads with no locking
- **GenServer:** OTP behavior for stateful processes (UsageTracker, RateLimiterCleaner); supervised and fault-tolerant
- **Bandit HTTP server:** Replaces Cowboy in Phoenix 1.7+; lower memory footprint

### Performance Profile
- Dictionary load on startup: ~2 seconds (993,589 words into ETS)
- Per-request lookup: < 1ms for dictionary check; Levenshtein suggestions: O(N × L²) where N = dict size, L = word length — acceptable at ≤ 4 edits with early termination
- Rate-limit check: O(1) ETS read per request
- Memory: ETS tables use ~150–200 MB RAM for full Georgian dictionary

### Deployment
- 2-stage Docker build (Elixir 1.16 builder + Debian bookworm-slim runtime)
- OTP release: self-contained, no Elixir/Erlang on production server
- Reverse proxy: nginx → 127.0.0.1:4001 → Phoenix (port 4000 inside container)
- No database: fully stateless (ETS only); `user_words.txt` is the only persistent state file

---

## Browser Extension Architecture (Manifest V3)

### Key Constraints of MV3
- Background scripts must be **Service Workers** (not persistent pages); they can be terminated and restarted by the browser
- `chrome.storage` replaces `localStorage` for persistent extension state
- Content Security Policy is stricter (no inline scripts)
- Remote code execution is forbidden (no eval, no remote JS loading)

### SpellCheckerKa Extension Design
- `background.js` (Service Worker): handles API calls, in-memory cache (30s TTL), debounce
- `content_generic.js`: MutationObserver on all pages; injects `<span class="spellcheck-error">` wrapping
- `content_gdocs.js`: special handling for Google Docs internal content model (different from standard textarea)
- Keyboard shortcut: Ctrl+Shift+K (Cmd+Shift+K on macOS)

---

## Georgian Language Technology Landscape

- **Hunspell ka_GE:** Existing open-source Georgian dictionary; SpellCheckerKa's base dictionary derived from it but extended to 993,589 words
- **No major commercial competitors** support Georgian morphology at this depth
- **Academic resources:** Tbilisi State University (TSU) Georgian NLP group; CLARIN-related Georgian resources
- **Potential future integration:** BERT-based Georgian language model (GeoBERT) for context-aware suggestions (Phase 5+)
