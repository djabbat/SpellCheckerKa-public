# PARAMETERS.md — SpellCheckerKa: System Parameters Reference

## Part 1: Dictionary & Morphology

| Parameter | Value | Location | Notes |
|-----------|-------|----------|-------|
| `georgian_dict_size` | 993,589 words | `priv/static/dictionaris/ge.txt` | Hunspell ka_GE origin |
| `user_dict_file` | `user_words.txt` | `priv/static/dictionaris/` | Auto-created; persists across restarts |
| `max_levenshtein_edit_distance` | 4 | `Dictionary.suggestions/2` | Max edits for suggestion candidates |
| `max_suggestions` | 5 | `Dictionary.suggestions/2` | Top N candidates returned per error |
| `morphology_suffix_rules` | 185+ | `Morphology` module | Longest-match, ordered by length desc |
| `verb_preverb_count` | 14 | `Morphology` | გამო, შემო, გადა, ჩა, ამო, ჩამო, გა, ჩადა, ჩაუ, შე, მი, და, ა, წა |
| `stem_try_endings` | ["", "ი", "ა", "ე"] | `Morphology.valid?/1` | Appended after suffix strip |
| `ets_table_name_georgian` | `:georgian_dict` | `Dictionary` | ETS set, public, read_concurrency: true |
| `ets_table_name_user` | `:user_dict` | `Dictionary` | Persistent to file on add/remove |

### Georgian Letter Confusion Table

| Correct | Confused with | Phonetic pair |
|---------|--------------|---------------|
| ს | შ | s / sh |
| კ | ქ | k / k' (aspirated) |
| ბ | პ | b / p |
| გ | ყ | g / q (uvular) |
| ზ | ჟ | z / zh |
| დ | ტ | d / t |
| ვ | ბ | v / b |
| რ | ლ | r / l |
| ნ | მ | n / m |

---

## Part 2: Rate Limiting & Quotas

| Parameter | Value | Location | Notes |
|-----------|-------|----------|-------|
| `rate_limit_requests_per_minute` | 30 | `RateLimiter` plug | Per IP (free tier) |
| `rate_limit_window_ms` | 60,000 ms | `RateLimiter` | Rolling 1-minute window |
| `rate_limit_authenticated` | 60 req/min | (planned) | Auth tier |
| `rate_limit_premium` | 300 req/min | (planned) | Premium tier |
| `daily_free_quota_seconds` | 1,800 s (30 min) | `UsageTracker` | Per IP per day |
| `rate_limiter_cleanup_interval_ms` | 300,000 ms (5 min) | `RateLimiterCleaner` | GenServer interval |
| `admin_bypass_header` | `X-Admin-Token` | `UsageTracker` | Bypasses daily quota |

---

## Part 3: Text Processing Limits

| Parameter | Value | Location | Notes |
|-----------|-------|----------|-------|
| `max_text_bytes` | 2,000,000 B (2 MB) | `SpellController` | Per request |
| `max_word_count` | 100,000 words | `SpellController` | Per request |
| `chunk_threshold_bytes` | 3,072 B (3 KB) | `app.js` | Above this → split into chunks |
| `chunk_split_strategy` | paragraph (newline) | `app.js` | Each paragraph is one chunk |
| `debounce_min_ms` | 500 ms | `app.js` | Min debounce delay |
| `debounce_max_ms` | 2,500 ms | `app.js` | Max debounce (large texts) |
| `debounce_scale_threshold` | 500 words | `app.js` | Increases debounce above this |
| `error_pagination_size` | 50 | `app.js` | Errors shown per page |

---

## Part 4: Browser Extension

| Parameter | Value | Location | Notes |
|-----------|-------|----------|-------|
| `manifest_version` | 3 | `extension/manifest.json` | Chrome Manifest V3 |
| `keyboard_shortcut` | Ctrl+Shift+K (Cmd+Shift+K Mac) | `manifest.json` | Triggers spell check |
| `host_permissions` | `<all_urls>` | `manifest.json` | All websites |
| `gdocs_content_script` | `content_gdocs.js` | `manifest.json` | Only on docs.google.com/* |
| `generic_content_script` | `content_generic.js` | `manifest.json` | All other URLs |
| `background_worker` | `background.js` | `manifest.json` | Service Worker |

---

## Part 5: API Response Format

### Success (`POST /api/check`)
```json
{
  "total_words": 120,
  "error_count": 3,
  "accuracy": 97.5,
  "errors": [
    {
      "word": "სახლი",
      "count": 2,
      "suggestions": ["სახლი", "სახლები"],
      "base_form": "სახლ"
    }
  ],
  "typography": [...],
  "stopwords": [...]
}
```

### Error Codes
| HTTP Code | Meaning |
|-----------|---------|
| 200 | Success |
| 400 | Bad request (missing text/lang, text too large) |
| 429 | Rate limit exceeded (`Retry-After` header included) |
| 402 | Daily quota exhausted (upgrade required) |

---

## Part 6: Monetization Parameters (Planned)

| Tier | Price | Rate Limit | Daily Quota |
|------|-------|------------|-------------|
| Free | $0 | 30 req/min | 30 min/day |
| Premium | $4.99/month | 60 req/min | Unlimited |
| Corporate | $99/month | 300 req/min | Unlimited |

**Success Metrics Target:**
- MAU: 50,000
- Extension installs: 20,000
- Mobile installs: 30,000 (Phase 2)
- MRR: $10,000+

---

## Part 7: Deployment

| Parameter | Value | Notes |
|-----------|-------|-------|
| `production_host` | `schecker.ge` | SSH: deploy@schecker.ge |
| `internal_port` | 4000 | Phoenix inside container |
| `external_port` | 4001 | Exposed to nginx on 127.0.0.1 |
| `health_check_interval` | 30s | docker-compose |
| `docker_image_name` | `spellcheckerka:latest` | Built by deploy.sh |
| `deploy_path` | `/opt/spellcheckerka/` | On server |
| `database` | None | Stateless app (ETS only, no SQL DB) |

---

## Part 8: Supported Languages

| Code | Language | Dictionary | Morphology |
|------|----------|------------|------------|
| `ka` | Georgian | 993,589 words + confusion table | Full (185+ rules) |
| `en` | English | Planned | Plain Levenshtein |
| `fr` | French | Planned | Plain Levenshtein |
| `es` | Spanish | Planned | Plain Levenshtein |
| `ru` | Russian | Planned | Plain Levenshtein |

UI Languages: Georgian, English, French, Spanish, Russian, Arabic, Chinese (8 total)
