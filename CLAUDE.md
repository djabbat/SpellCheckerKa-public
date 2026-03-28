# CLAUDE.md — SpellCheckerKa

## Project Identity

**SpellCheckerKa** — Georgian Language Spell Checker (ქართული მართლწერის შემოწმება)
**Version:** 1.0.0 | **Domain:** schecker.ge (→ spellcheckerka.drjaba.com)
**Stack:** Elixir/Phoenix + Vanilla JS + ETS dictionary
**Location:** `~/Desktop/SpellCheckerKa/`

---

## Source of Truth

**CONCEPT.md is the authoritative document.**
All code must match CONCEPT.md intent. Phase 1 (Web MVP) and Phase 3 (Browser Extension) are complete. Phase 2 (Mobile) is pending.

---

## Architecture Overview

```
Backend (Elixir/Phoenix):
  SpellCheckerKa.Dictionary     — ETS: 993,589 Georgian words, Levenshtein + confusion table
  SpellCheckerKa.Morphology     — 185+ suffix rules, verb preverbs, 7 noun cases
  SpellCheckerKa.LangDictionary — en/fr/es/ru dictionaries (ETS)
  SpellCheckerKa.RateLimiterCleaner — GenServer, sweeps ETS every 5min
  SpellCheckerKa.UsageTracker   — 30min/day free quota per IP
  SpellCheckerKaWeb.SpellController — /api/check, /api/dictionary/add/remove
  SpellCheckerKaWeb.Plugs.RateLimiter — 30 req/min per IP (ETS rolling window)

Frontend (Vanilla JS):
  assets/js/app.js              — Mirror overlay, debounce, .docx import/export (fflate)
  assets/css/app.css            — Tailwind, Georgian red accent, responsive

Browser Extension (Manifest V3):
  extension/content_generic.js  — All websites: MutationObserver, DOM injection
  extension/content_gdocs.js    — Google Docs integration
  extension/background.js       — Service Worker: API client, caching, debounce
  extension/popup.html + popup.js — Extension UI

Deploy:
  docker/Dockerfile             — 2-stage build (Elixir 1.16, Debian bookworm)
  docker/docker-compose.yml     — Port 127.0.0.1:4001→4000, health check
  docker/nginx.conf             — Reverse proxy
  deploy.sh                     — Build image → SCP → deploy@schecker.ge
```

---

## Key Technical Constraints (must not change)

| Feature | Implementation | Notes |
|---------|---------------|-------|
| Dictionary lookup | ETS (O(1)) | Never move to DB — ETS is the design choice |
| Suggestions | Levenshtein ≤ 4 edits + Georgian confusion table | Table: ს↔შ, კ↔ქ, რ↔ლ, etc. |
| Morphology | 185+ suffix rules, longest-first | 14 verb preverbs (გამო, შემო, etc.) |
| Rate limit | 30 req/min per IP | ETS rolling window via Plug |
| Daily quota | 30 min/day free per IP | UsageTracker GenServer |
| Text max | 2MB / 100k words per request | Enforced in SpellController |
| Mirror overlay | textarea + invisible div | Never switch to contenteditable |
| .docx | fflate (ZIP) + DOMParser (XML) | Client-side only |
| Chunk threshold | 3KB → parallel chunks | Sent as `{chunks: [...], lang: "ka"}` |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/check` | Spell check: `{text, lang}` or `{chunks: [...], lang}` |
| POST | `/api/dictionary/add` | Add word to user dict: `{word}` |
| POST | `/api/dictionary/remove` | Remove word: `{word}` |
| GET | `/` | Landing page |
| GET | `/upgrade` | Premium upgrade page |

---

## Languages

- Georgian (ka) — primary, full morphology + confusion table
- English (en), French (fr), Spanish (es), Russian (ru) — plain Levenshtein
- Frontend UI: 8 languages (+ Arabic, Chinese)

---

## Build & Run

```bash
# Local development
bash run.sh dev

# Run tests
bash run.sh test

# Build Docker image
bash run.sh docker-build

# Deploy to schecker.ge
bash deploy.sh
```

---

## Files that MUST stay in root (Phoenix project structure)
- `mix.exs` — project manifest (REQUIRED)
- `mix.lock` — dependency lock (REQUIRED)
- `.formatter.exs` — code formatter (convention)
- `.gitignore`

---

## DeepSeek Rule
Route all non-code tasks through DeepSeek API (`~/.aim_env → DEEPSEEK_API_KEY`).

---

## Git Push Rule
- Private: `djabbat/SpellCheckerKa` — full content
- Public: `djabbat/SpellCheckerKa-public` — excludes CLAUDE.md, TODO.md, PARAMETERS.md, MAP.md
