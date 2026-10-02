# ASD-STE100: Simplified Technical English & 80% Karpathy Mode

> **Claude Code Plugin · Mod · Agent Skill · Linter & CLI**  
> Controlled technical English specification to minimize cognitive load, eliminate ambiguity, and optimize LLM reasoning and human oversight.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Plugin%20%26%20Mod-orange.svg)](https://code.claude.com)
[![Specification](https://img.shields.io/badge/Standard-ASD--STE100%20Issue%209-green.svg)](https://www.asd-ste100.org/)

---

## 📌 Background & Motivation

As AI coding and autonomous agents perform more legwork, human engineers spend significantly more time **reviewing, understanding, and validating LLM outputs**.

Former OpenAI Chief Scientist and Tesla AI Director **Andrej Karpathy** highlighted this paradigm shift:

> *"Writing. Something I've had success with: **Ask your LLM to explain something in ASD-STE100**, it's a controlled language specification originally developed for aerospace maintenance documentation. LLMs well-versed in this language and it comes with heavy constraints on clean writing style that I often find a lot more readable. Sometimes I've tried to soften it a bit e.g. ask for **'80% of the way to ASD-STE100'** because the spec is quite stringent...*
>
> *In summary:*
> - *As LLMs get better, they will do more and more of the legwork autonomously, and a lot more of our work will rise up the abstractions into oversight and understanding.*
> - *Luckily, LLMs can help here too because as intelligence and code are increasingly abundant, you can ask for large, custom, discardable software artifacts (e.g. web apps, video explainers) that would have never made sense to create before."*
> — [Andrej Karpathy on X](https://x.com/karpathy/status/2105819303471976479)

This repository packages **ASD-STE100** into a complete ecosystem:
1. **Claude Code Mod (`hooks/register.js`)**: An internal Claude Code extension that adds `/asd` commands, UI status indicators, the STE pane, and STE rules in the system prompt.
2. **Claude Code Plugin (`.claude-plugin/plugin.json`)**: Installable plugin compliant with the new Claude Code plugin architecture.
3. **Agent Skill (`skills/asd-ste100/SKILL.md`)**: A rich skill loaded by Claude Code, Google Antigravity, and other coding assistants.
4. **Core Rule Engine & Linter (`lib/ste-engine.js`)**: Checks sentence and paragraph length, passive voice (with the Issue 9 descriptive-text exception), verb forms, multi-word nouns, unapproved words, phrasal verbs, semicolons, contractions, and Latin abbreviations. It uses lightweight heuristics (no part-of-speech tagging) and a curated word list, not the official ~900-word dictionary.
5. **Standalone CLI (`bin/ste.js`)**: Lint text files or format system prompts directly from your terminal.

---

## 🚀 Quick Start

### 1. Install as a Claude Code Plugin

**Requirements:** Claude Code **v2.1.287 or later** for the mod (`/asd` command, tools, STE pane, system prompt rules, spinner indicator). Run `claude --version` to check. The skill works on any version that supports plugins.

This repository is its own plugin marketplace. Install it from GitHub:

```bash
claude plugin marketplace add JAICHANGPARK/ASD-STE100
claude plugin install asd-ste100@asd-ste100
```

Or, inside a Claude Code session:

```text
/plugin marketplace add JAICHANGPARK/ASD-STE100
/plugin install asd-ste100@asd-ste100
/reload-plugins
```

To try it for one session without installing (for example, from a local clone):

```bash
claude --plugin-dir /path/to/ASD-STE100
```

To update later, run `claude plugin update asd-ste100@asd-ste100`.

> **Older Claude Code (v2.1.286 and earlier):** mods were early access. The skill loads, but the mod prints `hooks module not loaded` and `/asd` does not exist. Update Claude Code, or start it with `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`. Remove that variable after you update.

To see what the mod hooks and calls before you install it, run `claude plugin validate .` in a clone.

### 2. Use the `/asd` Command (Mod)

Type `/` to see the `/asd` command:

```text
/asd on             # Activate automatic STE prompt enhancement
/asd 80             # Set to Karpathy's 80% Pragmatic Mode (recommended)
/asd strict         # Set to 100% Strict ASD-STE100 Mode
/asd pane           # Show the last answer as an STE document in a side pane
/asd auto [on|off]  # Rewrite each answer as an STE document in the pane (default on)
/asd check <text>   # Lint and score a sentence or paragraph
/asd rewrite <text> # Rewrite any text into clean STE format
/asd status         # Display active mode and status
/asd off            # Deactivate STE mode
```

STE mode is on by default: every answer is written as an 80% ASD-STE100 document (a title, headings, short paragraphs, one idea in each sentence, numbered steps), even when the prompt asks for one long paragraph, and the STE pane opens after each answer. You do not need `/asd on`. Use `/asd off` to turn STE mode off.

`/asd on`, `/asd 80`, `/asd strict`, and `/asd off` save the state machine-wide. The saved state applies to every project and overrides the `defaultMode` and `autoInject` plugin options.

### STE pane

After each answer, the STE pane opens beside the transcript. A small model (haiku) rewrites the answer as an ASD-STE100 document, and the pane shows that STE version:

- A title, and one heading for each topic. A maximum of 6 sentences in each paragraph.
- One idea in each sentence. A sentence over the word limit shows its word count in red.
- Procedures as numbered steps, with one command in each step.
- **WARNING**, **CAUTION**, and **NOTE** as signal blocks.
- Unapproved words in red, with the approved word after them (`utilize →USE`).

The header shows the STE check score of the text in view. Pane keys: `v` STE version, `o` original answer, `c` check (score and findings), `r` rewrite again, `x` close.

The rewrite costs one small model call for each answer. Use `/asd auto off` to stop it, and press `r` when you want a rewrite. The pane docks beside the transcript in the fullscreen layout. Use `/asd pane` to open it, and `/asd pane off` to stop it from opening by itself.

The mod also gives Claude two tools: `mcp__asd-ste100__validate_ste` and `mcp__asd-ste100__rewrite_ste`.

When active, Claude Code displays a live indicator beside the spinner:
```text
Thinking · STE [PRAGMATIC 80%]…
```

The indicator appears in the terminal and in the Desktop app. In `claude -p` and the VS Code chat panel, the hooks run, but nothing is drawn.

---

### 3. Run as a Standalone Terminal CLI

```bash
# Lint a piece of text:
./bin/ste.js check "You should utilize this script prior to commencing the process."

# Output:
# ========================================
#  ASD-STE100 Compliance Report (PRAGMATIC MODE)
# ========================================
# Score: 68 / 100
# Issues:
#  - [UNAPPROVED_WORD] "prior to" is unapproved in ASD-STE100. Use "before" instead.
#  - [UNAPPROVED_WORD] "should" is unapproved in ASD-STE100. Use "must (or explain optional choice)" instead.
#  - [UNAPPROVED_WORD] "utilize" is unapproved in ASD-STE100. Use "use" instead.
#  - [UNAPPROVED_WORD] "commencing" is unapproved in ASD-STE100. Use "starting" instead.

# Generate system prompt instructions for any LLM:
./bin/ste.js prompt --diagram
```

---

### 4. Use as an Agent Skill in Antigravity or Claude

The skill file is located at:
`skills/asd-ste100/SKILL.md`

After you install the plugin, Claude Code loads the skill as `asd-ste100:asd-ste100`. Claude uses it automatically when a request matches, or you can call it with `/asd-ste100:asd-ste100`.

Whenever you want an agent to explain or rewrite technical logic, simply ask:
> *"Explain the architecture of our authentication service in 80% ASD-STE100 with a Mermaid diagram."*

---

## ⚖️ Strict 100% vs. Karpathy 80% Pragmatic Mode

Strict mode follows **ASD-STE100 Issue 9** (January 2025): 53 writing rules in 9 sections and a dictionary of about 900 approved words. The official standard is free on request at [asd-ste100.org](https://www.asd-ste100.org/). This repository summarizes the rules and does not include the dictionary.

| Rule Dimension | Strict Mode (100% ASD-STE100) | 80% Pragmatic Mode (Karpathy) [Default] |
| :--- | :--- | :--- |
| **Primary Use Case** | Aerospace, defense, ISO hardware manuals | Software engineering, AI systems, architecture review |
| **Sentence Length** | Instructions: ≤ 20 words<br>Descriptions: ≤ 25 words | Target 15–22 words (hard cap at 25 words) |
| **Voice** | Active voice. Passive only in descriptive text when the agent is unknown. Imperative for steps. | Active voice with direct subject-verb-object clarity |
| **Vocabulary** | Approved ASD-STE100 dictionary words, plus technical nouns and technical verbs | Replaces bureaucratic jargon with simple verbs (*use*, *start*, *stop*, *before*), but allows modern tech nouns (*API*, *cache*, *Docker*) |
| **Noun Clusters** | Max 3 consecutive nouns | Max 3 consecutive nouns (separated by prepositions) |
| **Modal Verbs** | Replace *shall*, *should*, *could*, *might* with *must*, *can*, or an exact condition | Direct directives (*must*, *can*, or specific conditional rules) |
| **Punctuation** | No semicolons, contractions, or Latin abbreviations (*e.g.*, *i.e.*, *etc.*) | Avoid semicolons |
| **Paragraphs** | One topic, max 6 sentences | One topic, max 6 sentences |
| **Safety** | **WARNING** / **CAUTION**, a command first, then the risk | Same, for data loss, security risks, and outages |
| **Cognitive Modality** | Standard technical text and tables | Pairs text with **Mermaid diagrams** or **Interactive HTML** |

---

## 🎨 The 4 Cognitive Modalities (Karpathy Framework)

Andrej Karpathy emphasized expanding beyond plain text into high-abstraction artifacts:

1. **Writing (ASD-STE100)**: Clean, high-speed procedural and descriptive English.
2. **Diagrams (Mermaid)**: Structural flowcharts and sequence diagrams embedded directly in markdown.
3. **Web Pages (Interactive HTML)**: Self-contained, responsive HTML/JS widgets for interactive inspection. (See [`examples/interactive_explainer.html`](examples/interactive_explainer.html))
4. **Explainer Videos (3b1b / Manim)**: Programmatic 3Blue1Brown-style vector animations with narration cues for Text-to-Speech engines like ElevenLabs. (See [`examples/manim_3b1b_explainer.py`](examples/manim_3b1b_explainer.py))

---

## 📁 Repository Structure

```text
ASD-STE100/
├── .claude-plugin/
│   ├── plugin.json            # Claude Code Plugin Manifest
│   └── marketplace.json       # Marketplace entry (install from GitHub)
├── hooks/
│   ├── hooks.json             # Mod Hook configuration
│   └── register.js            # Claude Code Mod implementation (/asd command, UI, tools)
├── skills/
│   └── asd-ste100/
│       └── SKILL.md           # Authoritative Agent Skill documentation
├── lib/
│   └── ste-engine.js          # Core ASD-STE100 rule engine & validator
├── bin/
│   └── ste.js                 # Terminal CLI utility
├── test/
│   └── ste.test.js            # Automated unit test suite
├── examples/
│   ├── before_and_after.md    # Real-world before/after technical transformations
│   ├── interactive_explainer.html # Interactive browser-based STE explainer
│   └── manim_3b1b_explainer.py   # 3b1b / Manim video explainer script
├── package.json
└── README.md
```

---

## 🧪 Testing

Run the automated test suite:

```bash
npm test
```

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md).

---

## 📄 License

MIT License. Open source and free for personal and commercial use.
