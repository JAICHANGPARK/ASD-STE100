# ASD-STE100: Simplified Technical English & 80% Karpathy Mode

> **Claude Code Plugin · Mod · Agent Skill · Linter & CLI**  
> Controlled technical English specification to minimize cognitive load, eliminate ambiguity, and optimize LLM reasoning and human oversight.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Plugin%20%26%20Mod-orange.svg)](https://code.claude.com)
[![Specification](https://img.shields.io/badge/Spec-ASD--STE100%20Issue%208-green.svg)](http://www.asd-ste100.org/)

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
1. **Claude Code Mod (`hooks/register.js`)**: An internal Claude Code extension that adds `/ste` commands, UI status indicators, and automatic prompt rewriting.
2. **Claude Code Plugin (`.claude-plugin/plugin.json`)**: Installable plugin compliant with the new Claude Code plugin architecture.
3. **Agent Skill (`skills/asd-ste100/SKILL.md`)**: A rich skill loaded by Claude Code, Google Antigravity, and other coding assistants.
4. **Core Rule Engine & Linter (`lib/ste-engine.js`)**: Evaluates sentence length, passive voice, noun clusters, and unapproved vocabulary with precision.
5. **Standalone CLI (`bin/ste.js`)**: Lint text files or format system prompts directly from your terminal.

---

## 🚀 Quick Start

### 1. Run as a Claude Code Mod / Plugin

To load this mod in your Claude Code session:

```bash
# Load for a single session:
claude --plugin-dir /path/to/ASD-STE100

# Or install as a local plugin:
claude plugin install /path/to/ASD-STE100
```

Once loaded in Claude Code, type `/` to see the new `/ste` command:

```text
/ste on             # Activate automatic STE prompt enhancement
/ste 80             # Set to Karpathy's 80% Pragmatic Mode (recommended)
/ste strict         # Set to 100% Strict ASD-STE100 Mode
/ste check <text>   # Lint and score a sentence or paragraph
/ste rewrite <text> # Rewrite any text into clean STE format
/ste status         # Display active mode and status
/ste off            # Deactivate STE mode
```

When active, Claude Code displays a live indicator beside the spinner:
```text
Thinking · STE [PRAGMATIC 80%]…
```

---

### 2. Run as a Standalone Terminal CLI

```bash
# Lint a piece of text:
./bin/ste.js check "You should utilize this script prior to commencing the process."

# Output:
# ========================================
#  ASD-STE100 Compliance Report (PRAGMATIC MODE)
# ========================================
# Score: 68 / 100
# Issues:
#  - [UNAPPROVED_WORD] "prior to" -> use "before"
#  - [UNAPPROVED_WORD] "should" -> use "must"
#  - [UNAPPROVED_WORD] "utilize" -> use "use"
#  - [UNAPPROVED_WORD] "commencing" -> use "starting"

# Generate system prompt instructions for any LLM:
./bin/ste.js prompt --diagram
```

---

### 3. Use as an Agent Skill in Antigravity or Claude

The skill file is located at:
`skills/asd-ste100/SKILL.md`

Whenever you want an agent to explain or rewrite technical logic, simply ask:
> *"Explain the architecture of our authentication service in 80% ASD-STE100 with a Mermaid diagram."*

---

## ⚖️ Strict 100% vs. Karpathy 80% Pragmatic Mode

| Rule Dimension | Strict Mode (100% ASD-STE100) | 80% Pragmatic Mode (Karpathy) [Default] |
| :--- | :--- | :--- |
| **Primary Use Case** | Aerospace, defense, ISO hardware manuals | Software engineering, AI systems, architecture review |
| **Sentence Length** | Instructions: ≤ 20 words<br>Descriptions: ≤ 25 words | Target 15–22 words (hard cap at 25 words) |
| **Voice** | Strict active voice only. Imperative for steps. | Active voice with direct subject-verb-object clarity |
| **Vocabulary** | Strictly approved ASD-STE100 dictionary words only | Replaces bureaucratic jargon with simple verbs (*use*, *start*, *stop*, *before*), but allows modern tech nouns (*API*, *cache*, *Docker*) |
| **Noun Clusters** | Max 3 consecutive nouns | Max 3 consecutive nouns (separated by prepositions) |
| **Modal Verbs** | Banned: *shall*, *should*, *could*, *might* | Direct directives (*must*, *can*, or specific conditional rules) |
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
│   └── plugin.json            # Claude Code Plugin Manifest
├── hooks/
│   ├── hooks.json             # Mod Hook configuration
│   └── register.js            # Claude Code Mod implementation (/ste command, UI, tools)
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

## 📤 Push to GitHub

To push this repository to your GitHub account:

```bash
cd /path/to/ASD-STE100
git add .
git commit -m "feat: initial release of ASD-STE100 Claude mod and skill"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/ASD-STE100.git
git push -u origin main
```

---

## 📄 License

MIT License. Open source and free for personal and commercial use.
