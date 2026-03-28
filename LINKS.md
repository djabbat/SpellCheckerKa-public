# LINKS.md — SpellCheckerKa: Ecosystem Connections

## Internal Ecosystem Links

### SpellCheckerKa ↔ AIM
- **Direction:** SpellCheckerKa serves AIM; AIM uses SpellCheckerKa for Georgian text input quality
- **Use case:** When AIM generates Georgian-language patient notes, medication instructions, or reports, SpellCheckerKa API (`/api/check`) validates Georgian spelling before output
- **Integration point:** AIM can call `/api/check` with `X-Admin-Token` header to bypass free-tier quota
- **Benefit for AIM:** Georgian text quality assurance for patient-facing content (IM practice serves Georgian-speaking patients)
- **Benefit for SpellCheckerKa:** AIM is a guaranteed internal power user; validates production reliability

### SpellCheckerKa ↔ kSystem
- **Direction:** Bidirectional cross-reference
- **Use case:** kSystem maintains Georgian lexicon entries across 8 languages; SpellCheckerKa dictionary (`ge.txt`, 993,589 words) is a potential validation source for kSystem entries
- **Planned:** kSystem article generation in Georgian can be spell-checked via SpellCheckerKa API before publishing
- **Potential:** kSystem's Georgian vocabulary data could supplement SpellCheckerKa's dictionary (new technical/specialized terms)

### SpellCheckerKa ↔ DrJaba (domain infrastructure)
- **Direction:** SpellCheckerKa hosted under DrJaba domain infrastructure
- **Domain:** `spellcheckerka.drjaba.com` — subdomain of `drjaba.com`
- **DNS/nginx:** Managed alongside other DrJaba subdomains (`aim.drjaba.com`, `ksystem.drjaba.com`, etc.)
- **Deploy target:** Production server shared with other DrJaba ecosystem services

### SpellCheckerKa ↔ OJS (Longevity Horizon journal)
- **Direction:** SpellCheckerKa is a quality tool for OJS academic text
- **Use case:** Academic papers submitted to Longevity Horizon / Annals of Rejuvenation Science in Georgian should pass SpellCheckerKa before submission
- **Freeze connection:** Project frozen until 27.09.2026 (OJS Scholar submission date) — after this, academic Georgian users become primary growth channel
- **Planned:** After unfreeze, add OJS integration note and promote to Georgian medical/academic community through the journal

---

## External Links

### Production
- **Web app:** https://spellcheckerka.drjaba.com
- **Legacy domain (may redirect):** https://schecker.ge

### GitHub Repositories
- **Private:** https://github.com/djabbat/SpellCheckerKa — full codebase including CLAUDE.md, TODO.md, PARAMETERS.md, MAP.md
- **Public:** https://github.com/djabbat/SpellCheckerKa-public — excludes CLAUDE.md, TODO.md, PARAMETERS.md, MAP.md

### Chrome Web Store (planned)
- Extension submission pending (Task #2 in TODO.md)

### Dictionary Source
- Base dictionary derived from Hunspell `ka_GE` — extended to 993,589 words

---

## API as Integration Point

Any ecosystem project can use SpellCheckerKa as a microservice:

```
POST https://spellcheckerka.drjaba.com/api/check
Content-Type: application/json
X-Admin-Token: <token from PARAMETERS.md>

{"text": "...", "lang": "ka"}
```

Response: `{total_words, error_count, accuracy, errors[], typography[], stopwords[]}`
