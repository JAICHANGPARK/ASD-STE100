# Changelog

All notable changes to this project are listed in this file.
Versions use the release date (`YYYY.M.D`).

## [2026.10.3] - 2026-10-02

### Added
- **STE sheet:** after each turn, the mod shows the score, sentence lengths and findings of the last answer above the prompt. Use `/ste sheet [on|off]` to control it.

## [2026.10.2] - 2026-10-02

### Added
- **Install from GitHub:** `.claude-plugin/marketplace.json`. Install with
  `claude plugin marketplace add JAICHANGPARK/ASD-STE100` and
  `claude plugin install asd-ste100@asd-ste100`.
- **ASD-STE100 Issue 9 (January 2025) coverage in the skill:** the rules now follow the 9 official sections, with these additions:
  - the passive-voice exception for descriptive text when the agent is unknown (STE 3.6)
  - verb rules: no "-ing" forms, no complex verb structures, no nominalizations (STE 3.4, 3.5, 3.7)
  - clarity rules: do not omit words, no contractions, use articles, use connecting words (STE 4.2, 4.4, 4.5)
  - procedures: write the condition first with a comma, and use notes for information only (STE 5.4, 5.5)
  - descriptive writing: one topic and maximum 6 sentences per paragraph
  - safety instructions with **WARNING** and **CAUTION** (Section 7)
  - punctuation: no semicolons, and word-count rules (Section 8)
  - no phrasal verbs (STE 9.3) and no Latin abbreviations
- **New linter checks:**
  - semicolons, phrasal verbs, and paragraph length
  - contractions and Latin abbreviations (strict mode)
  - progressive and perfect tenses (strict mode)
- Linter reports now use the official rule labels (for example `STE 3.6: Active Voice`).
- 9 new unit tests (15 in total).

### Changed
- Strict mode follows ASD-STE100 Issue 9 instead of Issue 8.
- The passive voice in a descriptive sentence without a named agent is reported as permitted and does not lower the score.
- The 80% Pragmatic Mode has a hard cap of 25 words for all sentences. Before, descriptive sentences could have up to 30 words.
- `/ste rewrite` and the `rewrite_ste` tool return only the rewritten text, with no commentary.
- The strict-mode prompt directive uses the correct limits: 20 words for procedures and 25 words for descriptions.
- `/ste` messages, the status line, and the spinner use the same mode labels (`PRAGMATIC 80%`, `STRICT 100%`). The spinner redraws when the mode changes.
- `asd-ste100 check` checks all words when the text has no quotes. Before, it checked only the first word.
- The skill description has trigger phrases, so Claude uses the skill more reliably.
- README:
  - correct install steps
  - the Claude Code v2.1.287 requirement for the mod
  - the machine-wide `/ste` state
  - the limits of the linter

### Fixed
- `and/or` was not detected.
- Noun-cluster false positives on prepositions, adverbs, and past-tense verbs (for example "Run the database migration script now").
- Sentences were split at decimals ("2.5") and abbreviations ("Mr.", "e.g.").
- Adjectival participles ("The users are tired") were reported as passive voice.
- `/ste check` lost line breaks in the input text.

## [1.0.0] - 2026-10-02

### Added
- First release: the Claude Code mod (`/ste` command, `validate_ste` and `rewrite_ste` tools, prompt directive, spinner indicator), the `asd-ste100` agent skill, the rule engine and linter, the CLI, and examples.

[2026.10.3]: https://github.com/JAICHANGPARK/ASD-STE100/releases/tag/asd-ste100--v2026.10.3
[2026.10.2]: https://github.com/JAICHANGPARK/ASD-STE100/releases/tag/asd-ste100--v2026.10.2
[1.0.0]: https://github.com/JAICHANGPARK/ASD-STE100/commit/064d192
