# TODO: SpellCheckerKa v1.0 — Roadmap

## Status: 🟢 Web MVP complete · Browser Extension complete · Mobile pending
**Date:** 2026-03-28
**Domain:** schecker.ge → spellcheckerka.drjaba.com
**Stack:** Elixir/Phoenix 1.7 + Vanilla JS + ETS (993,589 words)
**Build:** ✅ mix compile OK · mix test passing

---

## ✅ COMPLETED

### Phase 1: Web MVP
- [x] Georgian dictionary (993,589 words, ETS)
- [x] Levenshtein algorithm + Georgian letter confusion table
- [x] Morphological analysis (185+ suffix rules, 7 noun cases, 14 verb preverbs)
- [x] Mirror overlay (textarea + invisible div, cursor-safe)
- [x] Real-time spell check with adaptive debounce (500ms–2.5s)
- [x] .docx import/export (fflate ZIP + DOMParser XML)
- [x] User dictionary (ETS + user_words.txt persistence)
- [x] Rate limiting (30 req/min per IP, ETS rolling window)
- [x] Daily quota (30 min/day free per IP)
- [x] Typography checker (double spaces, quotes, hyphens, semicolons)
- [x] Stopword detection (25 Georgian filler words)
- [x] Multi-language support (en/fr/es/ru backend; 8 UI languages)
- [x] Chunk processing (texts > 3KB → paragraph chunks)
- [x] Docker containerization (2-stage build)
- [x] deploy.sh → schecker.ge

### Phase 3: Browser Extension (Manifest V3)
- [x] content_generic.js (all websites, MutationObserver)
- [x] content_gdocs.js (Google Docs integration)
- [x] background.js (Service Worker, caching, debounce)
- [x] popup.html + popup.js
- [x] Keyboard shortcut (Ctrl+Shift+K)

### Documentation (added 2026-03-28)
- [x] CLAUDE.md
- [x] PARAMETERS.md
- [x] MAP.md
- [x] run.sh (local dev launcher)
- [x] deploy.sh updated for docker/ subfolder

---

## 🔄 IN PROGRESS

| # | Task | Priority |
|---|------|----------|
| 1 | Deploy to schecker.ge (production launch) | Critical |
| 2 | Chrome Web Store submission (extension) | High |
| 3 | Premium subscription payment integration (Stripe/Paddle) | High |

---

## ⏳ PENDING

### Phase 2: Mobile (React Native)
| # | Task | Priority |
|---|------|----------|
| 4 | React Native project scaffold | High |
| 5 | iOS keyboard extension | High |
| 6 | Android keyboard extension | High |
| 7 | OCR with camera (Tesseract.js) | Medium |
| 8 | Offline sync between devices | Medium |

### Phase 4: Monetization
| # | Task | Priority |
|---|------|----------|
| 9 | User authentication (email + OAuth) | High |
| 10 | Payment processing (Stripe webhook → grant tokens) | High |
| 11 | Premium tier: 60 req/min, unlimited quota | High |
| 12 | Corporate tier: 300 req/min, API key management | Medium |

### Phase 5: Grammar (Future)
| # | Task | Priority |
|---|------|----------|
| 13 | Grammar checker (beyond spell + typography) | Low |
| 14 | Auto-correct (pending false-positive analysis) | Low |
| 15 | Analytics endpoints (usage stats) | Low |

---

## Target Metrics
| Metric | Target |
|--------|--------|
| MAU | 50,000 |
| Extension installs | 20,000 |
| Mobile installs | 30,000 |
| MRR | $10,000+ |
| Dictionary (Georgian) | 993,589 words ✅ |

---

## Pending Tech Debt
- [ ] `en/fr/es/ru` dictionary .txt files need to be populated (code exists, files missing)
- [ ] `aging_engine` integration: N/A (not applicable to SpellCheckerKa)
- [ ] Tests: expand coverage beyond current test files
