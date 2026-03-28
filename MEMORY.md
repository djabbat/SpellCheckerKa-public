# MEMORY.md — SpellCheckerKa: Project Memory

## Key Decisions & Architecture Choices

### 2026-03-26 — Rename: ScheckerGe → SpellCheckerKa
- **Decision:** Rename project and domain from `schecker.ge` / `ScheckerGe` to `SpellCheckerKa`
- **Rationale:** "Ka" = ISO 639-1 code for Georgian language; name is self-explanatory internationally
- **Domain change:** `schecker.ge` → `spellcheckerka.drjaba.com` (subdomain under drjaba.com umbrella)
- **Repos:** `djabbat/ScheckerGe` → `djabbat/SpellCheckerKa` (private) + `djabbat/SpellCheckerKa-public`

### Storage: ETS over Database
- **Decision:** All dictionary data stored in ETS (Erlang Term Storage), no SQL DB
- **Rationale:** O(1) lookup, in-process, no serialization overhead; 993,589 words load in ~2s on startup
- **Consequence:** Stateless architecture; restarts reload from `ge.txt` + `user_words.txt`
- **Never change:** ETS is the architectural core — moving to PostgreSQL or similar is off-limits

### Freemium Model: 30 min/day free → HTTP 402
- **Decision:** Free tier = 30 minutes of active checking per IP per day; exceeding triggers HTTP 402
- **Rationale:** Low enough to serve occasional users, meaningful enough that power users upgrade
- **Implementation:** `UsageTracker` GenServer tracks elapsed time per IP in ETS; resets at midnight
- **Admin bypass:** `X-Admin-Token` header in request bypasses daily quota entirely (for internal tools, AIM integration, kSystem cross-reference)

### Rate Limiting: 30 req/min per IP (HTTP 429)
- **Decision:** Separate from daily quota; burst protection
- **Implementation:** `RateLimiter` Plug + ETS rolling window; `RateLimiterCleaner` GenServer sweeps every 5 min

### Mirror Overlay (not contenteditable)
- **Decision:** Spell-check highlighting via invisible mirror `<div>` overlaying `<textarea>`
- **Rationale:** contenteditable causes cursor/caret sync issues; mirror approach is cursor-safe
- **Never change:** Do not switch to contenteditable

### Client-side .docx Processing
- **Decision:** `.docx` import/export handled entirely in-browser via `fflate` (ZIP) + `DOMParser` (XML)
- **Rationale:** No server-side file storage; privacy-preserving; fast
- **Dependency:** `fflate` bundled in `assets/js/app.js`

### Browser Extension: Manifest V3
- **Decision:** Chrome Manifest V3 (not V2)
- **Rationale:** V2 deprecated by Google; MV3 required for Chrome Web Store since 2023
- **Consequence:** Background script is a Service Worker, not persistent page

### Morphology: Suffix-first, Longest-match
- **Decision:** 185+ suffix rules applied longest-first; fallback to Levenshtein on stem
- **Rationale:** Georgian is agglutinative — morphological analysis drastically reduces false positives
- **14 verb preverbs recognized:** გამო, შემო, გადა, ჩა, ამო, ჩამო, გა, ჩადა, ჩაუ, შე, მი, და, ა, წა

---

## Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 0.1.0 | ~2025 | Internal | Initial prototype (ScheckerGe) |
| 1.0.0 | 2026-03-28 | ✅ Release candidate | Web MVP + Browser Extension complete; renamed SpellCheckerKa |

---

## Project Freeze

- **Frozen until:** 27.09.2026 (date of OJS Scholar submission)
- **Reason:** OJS journal (Longevity Horizon / Annals of Rejuvenation Science) must be submitted to Google Scholar index before expanding SpellCheckerKa's academic user base
- **During freeze:** No new phases (Mobile, Grammar). Only critical bug fixes and admin tooling allowed.
- **Resume:** After 27.09.2026 — start Phase 2 (Mobile, React Native)

---

## Lessons Learned

- **Levenshtein alone is insufficient for Georgian:** phonetically similar letters (ს/შ, კ/ქ, ბ/პ) produce false negatives without the confusion table; confusion table weights reduce these to cost 0.5
- **Chunk threshold matters:** texts > 3KB sent as paragraph chunks avoid timeout and improve perceived responsiveness; threshold tuned empirically
- **ETS cleanup is mandatory:** without `RateLimiterCleaner`, ETS grows unbounded on long-running servers
- **Docker 2-stage build:** Elixir/OTP release builds require a 2-stage Dockerfile (builder + runtime); this keeps image size manageable

---

## Pending Tech Debt

- `en/fr/es/ru` dictionary `.txt` files: code paths exist in `LangDictionary` but actual word lists not yet populated
- Test coverage: unit tests present but coverage is thin; expand before Phase 2
- User authentication: rate-limiting is IP-based; switching to account-based will require auth layer
