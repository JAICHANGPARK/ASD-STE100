# Changelog

All notable changes to this project are listed in this file.
Versions use the release date (`YYYY.M.D`).

## [2026.10.2+10] - 2026-10-02

### Changed
- **Answers follow the ASD-STE100 document structure** while STE mode is on: a title, one heading for each topic, short paragraphs, one idea in each sentence, numbered steps and signal words. The structure applies even when the prompt asks for "one long paragraph". It applies to prose only, not to code or files.

## [2026.10.2+9] - 2026-10-02

### Changed
- **The STE pane shows each answer rewritten as an ASD-STE100 document**, not the same text as the transcript. After each answer, a small model (haiku) rewrites it with a title, headings, short paragraphs, one idea in each sentence, numbered steps and signal words. Use `/asd auto [on|off]`.
- **The pane header shows the STE check score** of the text in view. It no longer says "Answer written in STE" without a check.
- New pane key `o` shows the original answer. `r` rewrites the answer again.
- Code names show without backticks in the pane.

## [2026.10.2+8] - 2026-10-02

### Fixed
- **The STE pane could not draw an answer with the word "constructor".** The linter looked up words in a plain object, so "constructor", "toString" and other built-in property names matched as unapproved words. The linter now checks only its own word list.

## [2026.10.2+7] - 2026-10-02

### Fixed
- **The STE directive no longer shows in your prompt.** STE mode now adds the STE rules to the system prompt. Your prompt stays as you typed it.
- **The STE pane shows an error message** when it cannot draw an answer, not an empty pane.

## [2026.10.2+6] - 2026-10-02

### Changed
- **STE mode is on by default** (`autoInject` default is now `true`). Answers are written in 80% ASD-STE100 without `/asd on`. Use `/asd off` to turn it off.
- **The STE pane opens after each answer**, not only after an answer in STE. For an answer that is not in STE, press `r` to rewrite it. Use `/asd pane off` to open the pane only with `/asd pane`.

## [2026.10.2+5] - 2026-10-02

### Fixed
- **Empty status line:** after `/asd off`, the mod left an empty `asd-ste100:` line under the prompt. It now removes the line.

## [2026.10.2+4] - 2026-10-02

### Changed
- **The mod command is now `/asd`** (was `/ste`). All subcommands are the same: `/asd on`, `/asd 80`, `/asd strict`, `/asd pane`, `/asd check`, `/asd rewrite`, `/asd status`, `/asd off`.

## [2026.10.2+3] - 2026-10-02

Releases now use the date and a build number. This is build 3 of 2026-10-02 (2026.10.3 was build 2).

### Added
- **STE pane:** after an answer in ASD-STE100, a pane beside the transcript shows the answer as an STE document: one sentence on each line, procedure steps, WARNING, CAUTION and NOTE blocks, and unapproved words with the approved word. Keys: `v` view, `c` check, `r` rewrite, `x` close. Use `/ste pane [on|off]`.

### Removed
- **STE sheet** above the prompt and `/ste sheet`. The score and findings are now in the pane's check tab.

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

[2026.10.2+10]: https://github.com/JAICHANGPARK/ASD-STE100/releases/tag/asd-ste100--v2026.10.2%2B10
[2026.10.2+9]: https://github.com/JAICHANGPARK/ASD-STE100/releases/tag/asd-ste100--v2026.10.2%2B9
[2026.10.2+8]: https://github.com/JAICHANGPARK/ASD-STE100/releases/tag/asd-ste100--v2026.10.2%2B8
[2026.10.2+7]: https://github.com/JAICHANGPARK/ASD-STE100/releases/tag/asd-ste100--v2026.10.2%2B7
[2026.10.2+6]: https://github.com/JAICHANGPARK/ASD-STE100/releases/tag/asd-ste100--v2026.10.2%2B6
[2026.10.2+5]: https://github.com/JAICHANGPARK/ASD-STE100/releases/tag/asd-ste100--v2026.10.2%2B5
[2026.10.2+4]: https://github.com/JAICHANGPARK/ASD-STE100/releases/tag/asd-ste100--v2026.10.2%2B4
[2026.10.2+3]: https://github.com/JAICHANGPARK/ASD-STE100/releases/tag/asd-ste100--v2026.10.2%2B3
[2026.10.3]: https://github.com/JAICHANGPARK/ASD-STE100/releases/tag/asd-ste100--v2026.10.3
[2026.10.2]: https://github.com/JAICHANGPARK/ASD-STE100/releases/tag/asd-ste100--v2026.10.2
[1.0.0]: https://github.com/JAICHANGPARK/ASD-STE100/commit/064d192
