/**
 * ASD-STE100 Claude Code Mod
 * 
 * Provides:
 * - /asd command (on, off, 80, strict, check, rewrite, status)
 * - Automatic prompt guidance injection when active
 * - UI status indicator & spinner suffix
 * - STE pane: the last answer as an ASD-STE100 document beside the transcript (/asd pane)
 * - Built-in Claude tools: mcp__asd-ste100__validate_ste & mcp__asd-ste100__rewrite_ste
 */

import { atom, read, update } from 'claude-code';
import { validateText, buildSystemPrompt } from '../lib/ste-engine.js';
import { PANE_ID, drawPane } from './pane.jsx';
import { proseOf } from './sheet.jsx';
import { STE_REQUEST } from './view.jsx';

let steActive = false;
let steMode = 'pragmatic'; // 'pragmatic' (80% Karpathy mode) or 'strict' (100% ASD-STE100)
let paneAuto = true; // Open the STE pane by itself after each answer
let autoRewrite = true; // Rewrite each answer into an ASD-STE100 document for the pane

// STE pane values. $.state keeps them across a reload of the module, and a write redraws the pane.
const view = atom({ plugin: 'asd-ste100', key: 'view' }, null);
const report = atom({ plugin: 'asd-ste100', key: 'report' }, null);
const tab = atom({ plugin: 'asd-ste100', key: 'tab' }, 'view');
const isAsked = atom({ plugin: 'asd-ste100', key: 'isAsked' }, false);
const isRewriting = atom({ plugin: 'asd-ste100', key: 'isRewriting' }, false);
const paneOpen = atom({ plugin: 'asd-ste100', key: 'paneOpen' }, false);

// Word limit for one sentence of a report
const limitOf = (sentence) => (sentence.isProcedural && steMode === 'strict' ? 20 : 25);

const modeLabel = () => (steMode === 'strict' ? 'STRICT 100%' : 'PRAGMATIC 80%');
const modeName = (mode) => (mode === 'strict' ? 'Strict ASD-STE100' : '80% ASD-STE100 (Karpathy Pragmatic Mode)');

// Ask the model for the rewritten text only, without commentary
// Ask the model for the answer as an ASD-STE100 document, for the pane
const documentPrompt = (mode, text) => `Rewrite the text below as an ASD-STE100 document in ${modeName(mode)}.
Follow these rules:
- Start with a short title line: "# <title>".
- Give each topic its own "## <heading>". Write a maximum of 6 sentences in each paragraph.
- Write one idea in each sentence. Do not join two clauses with ", and" or ", so".
- Write a maximum of ${mode === 'strict' ? 20 : 25} words in each sentence. Use the active voice.
- Do not use phrasal verbs ("set up" -> "install", "look up" -> "find", "break down" -> "divide").
- Use simple, literal words. Do not use idioms.
- Write procedures as numbered steps, with one command in each step.
- Write risks as "WARNING:" (injury, data loss) or "CAUTION:" (damage) lines.
- Keep code blocks, code names and technical names unchanged.
Output only the document.

${text}`;

const rewritePrompt = (mode, text) =>
  `Rewrite the following text into ${modeName(mode)}. Output only the rewritten text. Do not add headings, explanations, or notes.\n\n${text}`;

// Lint report of an answer, without its code, tables and links
const reportOf = (text) => {
  const prose = proseOf(text);
  const checked = prose ? validateText(prose, { mode: steMode }) : null;
  return checked && checked.totalSentences > 0 ? checked : null;
};

async function openPane($) {
  await update($, paneOpen, () => true);
  return $.ui.open({ id: PANE_ID, title: 'STE' });
}

// Rewrite the original answer in STE for the pane
// force: rewrite again when the pane already shows an STE version (the r key)
async function rewriteView($, force = false) {
  const current = await read($, view);
  if (!current || (!force && current.source === 'rewrite')) return;
  const original = current.original;
  await update($, isRewriting, () => true);
  const response = await $.model.complete({
    model: 'haiku',
    system: buildSystemPrompt({ mode: steMode }),
    prompt: documentPrompt(steMode, original),
    maxTokens: 3000,
    timeoutMs: 90000
  });
  // Keep the result only if the pane still shows the same answer
  const now = await read($, view);
  if (now && now.original === original) {
    if (response.isAnswered) {
      const text = response.text.trim();
      await update($, view, (v) => ({ ...v, text, source: 'rewrite' }));
      await update($, report, () => reportOf(text));
    } else {
      $.ui.toast(`STE rewrite failed: ${response.reason}`);
    }
    await update($, isRewriting, () => false);
  }
}

// Show the current state in the status line and redraw the spinner suffix
function refreshUi($) {
  $.ui.status(steActive ? `STE [${modeLabel()}]: Active` : undefined);
  $.ui.invalidate('ui.render');
}

export function register(on, options = {}) {
  // userConfig values are defaults. A mode or state saved with /asd (machine-wide $.store) overrides them.
  if (options.defaultMode === 'strict') {
    steMode = 'strict';
  }
  if (options.autoInject) {
    steActive = true;
  }

  // Session start: register command, tools, and restore saved state
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({
        name: 'asd',
        description: 'Control ASD-STE100 writing mode, check text, or rewrite content',
        argumentHint: '[on|off|80|strict|pane [on|off]|auto [on|off]|check <text>|rewrite <text>|status]'
      });

      await $.tool.register({
        name: 'validate_ste',
        description: 'Validate text against ASD-STE100 (Simplified Technical English) rules and return quality metrics and suggestions.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to analyze' },
            mode: { type: 'string', enum: ['pragmatic', 'strict'], description: 'Validation mode (default: pragmatic / 80%)' }
          },
          required: ['text']
        }
      });

      await $.tool.register({
        name: 'rewrite_ste',
        description: 'Rewrite text into ASD-STE100 simplified technical style.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Original text to rewrite' },
            mode: { type: 'string', enum: ['pragmatic', 'strict'] },
            format: { type: 'string', enum: ['text', 'diagram', 'html'] }
          },
          required: ['text']
        }
      });

      // Restore persisted state
      const savedActive = await $.store.get('ste_active');
      if (typeof savedActive === 'boolean') steActive = savedActive;
      const savedMode = await $.store.get('ste_mode');
      if (savedMode === 'strict' || savedMode === 'pragmatic') steMode = savedMode;
      const savedPane = await $.store.get('ste_pane');
      if (typeof savedPane === 'boolean') paneAuto = savedPane;
      const savedRewrite = await $.store.get('ste_autorewrite');
      if (typeof savedRewrite === 'boolean') autoRewrite = savedRewrite;

      if (steActive) refreshUi($);
    } catch (err) {
      // Avoid failing session start if registration encounters issues
      $.ui.log(`ASD-STE100 mod initialization notice: ${err.message}`);
    }

    return next(e);
  });

  // Handle /asd command
  on('command.run', { command: 'asd' }, async ($, e) => {
    const rawArgs = (e.args || '').trim();
    const first = rawArgs.split(/\s+/)[0] || '';
    const sub = first.toLowerCase();
    // Keep the original line breaks of the text after the subcommand
    const rest = rawArgs.slice(first.length).trim();

    if (sub === 'on') {
      steActive = true;
      await $.store.set('ste_active', true);
      refreshUi($);
      return { text: `[ASD-STE100] Activated. Mode: ${modeLabel()}. Claude now answers in ${modeName(steMode)}. Use /asd 80 or /asd strict to change the mode.` };
    }

    if (sub === 'off') {
      steActive = false;
      await $.store.set('ste_active', false);
      refreshUi($);
      return { text: '[ASD-STE100] Deactivated. Standard generation resumed.' };
    }

    if (sub === '80' || sub === 'pragmatic') {
      steMode = 'pragmatic';
      steActive = true;
      await $.store.set('ste_mode', 'pragmatic');
      await $.store.set('ste_active', true);
      refreshUi($);
      return { text: '[ASD-STE100] Switched to 80% Pragmatic Mode (Karpathy style): short punchy sentences (<=25 words), active voice, 1 idea/sentence, clean modern vocabulary.' };
    }

    if (sub === '100' || sub === 'strict') {
      steMode = 'strict';
      steActive = true;
      await $.store.set('ste_mode', 'strict');
      await $.store.set('ste_active', true);
      refreshUi($);
      return { text: '[ASD-STE100] Switched to 100% Strict Mode (ASD-STE100 Issue 9): max 20 words for procedures, max 25 for descriptions, approved vocabulary, active voice, no semicolons or contractions.' };
    }

    if (sub === 'auto') {
      const arg = rest.toLowerCase();
      autoRewrite = arg === 'on' ? true : arg === 'off' ? false : !autoRewrite;
      await $.store.set('ste_autorewrite', autoRewrite);
      return { text: `[ASD-STE100] Auto rewrite ${autoRewrite ? 'ON: the pane shows each answer rewritten as an ASD-STE100 document' : 'OFF: press r in the pane to rewrite an answer'}.` };
    }

    if (sub === 'pane') {
      const arg = rest.toLowerCase();
      if (arg === 'on' || arg === 'off') {
        paneAuto = arg === 'on';
        await $.store.set('ste_pane', paneAuto);
        return { text: `[ASD-STE100] The STE pane ${paneAuto ? 'opens by itself after each answer' : 'opens only with /asd pane'}.` };
      }
      await openPane($);
      return { text: '[ASD-STE100] STE pane opened. v: view · c: check · r: rewrite · x: close' };
    }

    if (sub === 'status') {
      return {
        text: `[ASD-STE100 Status]
- State: ${steActive ? 'ACTIVE (automatically formatting prompts)' : 'INACTIVE'}
- Mode: ${modeLabel()}
- Pane: ${paneAuto ? 'opens by itself after each answer' : 'opens only with /asd pane'}
- Auto rewrite: ${autoRewrite ? 'ON (one small model call for each answer)' : 'OFF'}
- Commands: /asd [on|off|80|strict|pane [on|off]|check <text>|rewrite <text>]`
      };
    }

    if (sub === 'check') {
      if (!rest) {
        return { text: 'Usage: /asd check <text to analyze>' };
      }
      const report = validateText(rest, { mode: steMode });
      let output = `[ASD-STE100 Quality Report - ${modeLabel()}]\nScore: ${report.score}/100 | Sentences: ${report.totalSentences} | Avg Words: ${report.averageWordsPerSentence} | Issues: ${report.totalIssues}\n`;
      report.sentences.forEach(s => {
        const icon = s.issues.length === 0 ? '✔' : '⚠';
        output += `\n${icon} [S${s.index} (${s.wordCount} words)]: "${s.text}"\n`;
        s.issues.forEach(i => {
          output += `   • [${i.type}] ${i.message}\n`;
        });
      });
      return { text: output.trim() };
    }

    if (sub === 'rewrite') {
      if (!rest) {
        return { text: 'Usage: /asd rewrite <text to convert to STE>' };
      }
      // Call model to rewrite
      const systemInstruction = buildSystemPrompt({ mode: steMode });
      const response = await $.model.complete({
        model: 'haiku',
        system: systemInstruction,
        prompt: rewritePrompt(steMode, rest),
        maxTokens: 1000,
        timeoutMs: 30000
      });

      if (response && response.isAnswered) {
        return { text: `[Rewritten in ASD-STE100 (${modeLabel()})]:\n\n${response.text.trim()}` };
      }
      return { text: `Could not rewrite via model. Validation report for original text:\n` + JSON.stringify(validateText(rest, { mode: steMode }), null, 2) };
    }

    // Default help
    return {
      text: `[ASD-STE100 Simplified Technical English Assistant]
Inspired by Andrej Karpathy's controlled language guidance for LLM understanding.

Commands:
  /asd on             - Activate automatic STE prompt enhancement
  /asd off            - Deactivate STE enhancement
  /asd 80             - Set to 80% Pragmatic Mode (Karpathy style, readable & fast)
  /asd strict         - Set to 100% Strict ASD-STE100 standard
  /asd pane           - Show the last answer as an STE document in a side pane
  /asd pane [on|off]  - Open the pane by itself after each answer, or not
  /asd auto [on|off]  - Rewrite each answer as an ASD-STE100 document in the pane, or not
  /asd check <text>   - Lint text and inspect compliance score
  /asd rewrite <text> - Rewrite text into STE format
  /asd status         - Check current mode and settings`
    };
  });

  // Handle validate_ste tool call
  on('tool.call', { tool: 'mcp__asd-ste100__validate_ste' }, async ($, e) => {
    const report = validateText(e.text || '', { mode: e.mode || steMode });
    return { result: JSON.stringify(report, null, 2) };
  });

  // Handle rewrite_ste tool call
  on('tool.call', { tool: 'mcp__asd-ste100__rewrite_ste' }, async ($, e) => {
    const mode = e.mode || steMode;
    const format = e.format || 'text';
    const system = buildSystemPrompt({ mode, targetFormat: format });
    const response = await $.model.complete({
      model: 'haiku',
      system,
      prompt: rewritePrompt(mode, e.text || ''),
      maxTokens: 1500,
      timeoutMs: 30000
    });
    return { result: response && response.isAnswered ? response.text.trim() : 'Rewriting failed or model timed out.' };
  });

  // The answer is in STE when the person asks for it or STE mode is on
  on('prompt.submit', async ($, e, next) => {
    await update($, isAsked, () => steActive || STE_REQUEST.test(e.text));
    return next(e);
  });

  // While STE mode is on, add the STE rules to the system prompt. The person's prompt stays as typed.
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e);
    if (!steActive) return composed;
    return {
      ...composed,
      sections: [
        ...composed.sections,
        { id: 'asd-ste100:directive', text: buildSystemPrompt({ mode: steMode }), scope: 'session' }
      ]
    };
  });

  // Enhance spinner while thinking if STE is active
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (!steActive) return next(e);
    const suffix = ` · STE [${modeLabel()}]`;
    return next({
      ...e,
      props: {
        ...e.props,
        suffix: (e.props && e.props.suffix ? e.props.suffix : '') + suffix
      }
    });
  });

  // Keep the final answer of each main-loop turn for the STE pane
  on('turn.complete', async ($, e, next) => {
    if (!e.agentId && !e.isAborted && e.answer.trim()) {
      const asked = await read($, isAsked);
      await update($, view, () => ({ text: e.answer, original: e.answer, source: 'answer', isAsked: asked }));
      await update($, report, () => reportOf(e.answer));
      await update($, tab, () => 'view');
      await update($, isRewriting, () => autoRewrite);
      if (paneAuto && !(await read($, paneOpen))) void openPane($);
      // Rewrite after the turn ends, so the rewrite does not belong to the turn's dispatch
      if (autoRewrite) $.clock.after(0, () => { void rewriteView($); });
    }
    return next(e);
  });

  on('ui.close', async ($, e, next) => {
    if (e.id === PANE_ID) await update($, paneOpen, () => false);
    return next(e);
  });

  // Draw the STE pane
  on('ui.render', { component: 'Pane', requestId: 'ste-sheet' }, async ($, e) => {
    const els = { h, ...$.ui.resolve(e) };
    try {
      return await drawPaneFor($, e, els);
    } catch (err) {
      // Show the error in the pane, not an empty pane
      const { Box, Text } = els;
      return h(Box, { flexDirection: 'column' },
        h(Text, { color: 'red' }, 'The STE pane could not draw this answer.'),
        h(Text, { dimColor: true }, String((err && err.message) || err)));
    }
  });
}

async function drawPaneFor($, e, els) {
  return drawPane(els, {
    view: await read($, view),
    report: await read($, report),
    tab: await read($, tab),
    mode: steMode,
    modeLabel: modeLabel(),
    limitOf,
    isRewriting: await read($, isRewriting),
    onTab: (id) => update($, tab, () => id),
    onRewrite: () => rewriteView($, true),
    onClose: () => $.ui.close({ id: PANE_ID })
  }, e.props.bodyColumns);
}
