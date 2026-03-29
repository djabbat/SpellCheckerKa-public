# UPGRADE.md — SpellCheckerKa (Georgian Spell-Checker Ecosystem)

Suggestions for project development from external analysis, literature, and cross-project review.

**Format:**
```
## [YYYY-MM-DD] Title
**Source:** [what triggered this]
**Status:** [ ] proposed | [✓ approved YYYY-MM-DD] | [✓✓ implemented YYYY-MM-DD]
```

---

## [2026-03-29] Machine Learning-Based Spell Correction (Beyond Dictionary Lookup)
**Source:** NLP literature: Georgian morphology complexity; state-of-the-art spell correction approaches (2023-2025)
**Status:** [ ] proposed

Georgian's agglutinative morphology means that a purely dictionary-based approach generates high false-positive rates for valid inflected forms not in the lexicon. Training a character-level sequence-to-sequence model (or fine-tuning a small transformer like ByT5) on Georgian text corpora with synthetic noise injection would enable context-sensitive correction that handles unseen inflected forms correctly. The kSystem digital trivium lexicon is a natural source of high-quality Georgian training data for this task.

---

## [2026-03-29] Grammar Checker Module (Morphosyntactic Analysis)
**Source:** User feedback patterns; competitive analysis of spell-checker ecosystems (Grammarly, LanguageTool)
**Status:** [ ] proposed

Spell checking addresses surface-level errors but misses grammatical mistakes (wrong case ending, incorrect verb agreement, misplaced postposition). Extending SpellCheckerKa with a grammar checker layer using rule-based morphosyntactic analysis (leveraging existing Georgian NLP resources, e.g., Georgian Morphological Analyzer by Tbilisi State University) would substantially increase utility for professional and academic users. LanguageTool's open-source Java framework supports custom rule grammars and could accelerate development.

---

## [2026-03-29] Google Docs Add-On Integration
**Source:** Market analysis: Georgian professional users primarily work in Google Workspace
**Status:** [ ] proposed

A Google Docs add-on (Google Apps Script + REST API call to spellcheckerka.drjaba.com backend) would bring SpellCheckerKa directly into the workflow of Georgian professionals, journalists, and academics who write in Google Docs. The add-on would highlight misspelled words and offer correction suggestions via a sidebar panel, mirroring the browser extension UX. Google Workspace Marketplace listing would significantly increase organic discovery and user acquisition.

---

## [2026-03-29] Offline Mobile Dictionary with Full Morphological Coverage
**Source:** Accessibility requirements; unreliable connectivity in rural Georgia and diaspora use cases
**Status:** [ ] proposed

The current mobile implementation requires network access for spell-checking. Bundling a compressed offline dictionary with morphological expansion (covering common inflection paradigms) directly in the mobile app would enable full spell-checking functionality without internet. Modern compression techniques (DAWG/GADDAG data structures) can represent a comprehensive Georgian lexicon in under 10 MB. The Space project's Expo stack provides a ready-made React Native foundation that could be adapted for the SpellCheckerKa mobile app to reduce duplication.
