/**
 * ASD-STE100 Claude Code Mod
 * 
 * Provides:
 * - /ste command (on, off, 80, strict, check, rewrite, status)
 * - Automatic prompt guidance injection when active
 * - UI status indicator & spinner suffix
 * - Built-in Claude tools: mcp__asd-ste100__validate_ste & mcp__asd-ste100__rewrite_ste
 */

import { validateText, buildSystemPrompt } from '../lib/ste-engine.js';

let steActive = false;
let steMode = 'pragmatic'; // 'pragmatic' (80% Karpathy mode) or 'strict' (100% ASD-STE100)

export function register(on, options = {}) {
  // Read userConfig defaults if provided
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
        name: 'ste',
        description: 'Control ASD-STE100 writing mode, check text, or rewrite content',
        argumentHint: '[on|off|80|strict|check <text>|rewrite <text>|status]'
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

      if (steActive) {
        $.ui.status(`STE [${steMode.toUpperCase()}]: Active`);
      }
    } catch (err) {
      // Avoid failing session start if registration encounters issues
      $.ui.log(`ASD-STE100 mod initialization notice: ${err.message}`);
    }

    return next(e);
  });

  // Handle /ste command
  on('command.run', { command: 'ste' }, async ($, e) => {
    const rawArgs = (e.args || '').trim();
    const parts = rawArgs.split(/\s+/);
    const sub = (parts[0] || '').toLowerCase();
    const rest = parts.slice(1).join(' ').trim();

    if (sub === 'on') {
      steActive = true;
      await $.store.set('ste_active', true);
      $.ui.status(`STE [${steMode.toUpperCase()}]: Active`);
      return { text: `[ASD-STE100] Activated. Mode: ${steMode.toUpperCase()} (80% Karpathy style by default). All LLM responses will follow controlled language guidelines.` };
    }

    if (sub === 'off') {
      steActive = false;
      await $.store.set('ste_active', false);
      $.ui.status('');
      return { text: '[ASD-STE100] Deactivated. Standard generation resumed.' };
    }

    if (sub === '80' || sub === 'pragmatic') {
      steMode = 'pragmatic';
      steActive = true;
      await $.store.set('ste_mode', 'pragmatic');
      await $.store.set('ste_active', true);
      $.ui.status('STE [PRAGMATIC 80%]: Active');
      return { text: '[ASD-STE100] Switched to 80% Pragmatic Mode (Karpathy style): short punchy sentences (<=25 words), active voice, 1 idea/sentence, clean modern vocabulary.' };
    }

    if (sub === '100' || sub === 'strict') {
      steMode = 'strict';
      steActive = true;
      await $.store.set('ste_mode', 'strict');
      await $.store.set('ste_active', true);
      $.ui.status('STE [STRICT 100%]: Active');
      return { text: '[ASD-STE100] Switched to 100% Strict Mode (Full ASD-STE100 Issue 8): max 20 words for procedural, max 25 for descriptive, strict approved vocabulary tables, zero passive voice.' };
    }

    if (sub === 'status') {
      return {
        text: `[ASD-STE100 Status]
- State: ${steActive ? 'ACTIVE (automatically formatting prompts)' : 'INACTIVE'}
- Mode: ${steMode.toUpperCase()} (${steMode === 'strict' ? '100% Strict Standard' : '80% Karpathy Pragmatic Mode'})
- Commands: /ste [on|off|80|strict|check <text>|rewrite <text>]`
      };
    }

    if (sub === 'check') {
      if (!rest) {
        return { text: 'Usage: /ste check <text to analyze>' };
      }
      const report = validateText(rest, { mode: steMode });
      let output = `[ASD-STE100 Quality Report - ${steMode.toUpperCase()}]\nScore: ${report.score}/100 | Sentences: ${report.totalSentences} | Avg Words: ${report.averageWordsPerSentence} | Issues: ${report.totalIssues}\n`;
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
        return { text: 'Usage: /ste rewrite <text to convert to STE>' };
      }
      // Call model to rewrite
      const systemInstruction = buildSystemPrompt({ mode: steMode });
      const response = await $.model.complete({
        model: 'haiku',
        system: systemInstruction,
        prompt: `Rewrite the following text into ${steMode === 'strict' ? 'Strict ASD-STE100' : '80% ASD-STE100 (Karpathy mode)'}:\n\n${rest}`,
        maxTokens: 1000,
        timeoutMs: 30000
      });

      if (response && response.isAnswered) {
        return { text: `[Rewritten in ASD-STE100 (${steMode.toUpperCase()})]:\n\n${response.text.trim()}` };
      }
      return { text: `Could not rewrite via model. Validation report for original text:\n` + JSON.stringify(validateText(rest, { mode: steMode }), null, 2) };
    }

    // Default help
    return {
      text: `[ASD-STE100 Simplified Technical English Assistant]
Inspired by Andrej Karpathy's controlled language guidance for LLM understanding.

Commands:
  /ste on             - Activate automatic STE prompt enhancement
  /ste off            - Deactivate STE enhancement
  /ste 80             - Set to 80% Pragmatic Mode (Karpathy style, readable & fast)
  /ste strict         - Set to 100% Strict ASD-STE100 standard
  /ste check <text>   - Lint text and inspect compliance score
  /ste rewrite <text> - Rewrite text into STE format
  /ste status         - Check current mode and settings`
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
      prompt: `Rewrite the following into ${mode === 'strict' ? 'Strict ASD-STE100' : '80% ASD-STE100'}:\n\n${e.text}`,
      maxTokens: 1500
    });
    return { result: response && response.isAnswered ? response.text.trim() : 'Rewriting failed or model timed out.' };
  });

  // Automatically attach STE directive to prompts if active
  on('prompt.submit', async ($, e, next) => {
    if (!steActive) {
      return next(e);
    }

    const directive = `\n\n[ASD-STE100 Formatting Directive]: Please provide all technical explanations in ${steMode === 'strict' ? 'Strict ASD-STE100' : '80% ASD-STE100 (Karpathy Pragmatic Mode)'} (short sentences <= 25 words, active voice, 1 idea/sentence, clear direct vocabulary without filler).`;
    
    // Check if user already explicitly included STE instructions
    if (/asd-ste100|simplified technical english|ste100/i.test(e.text)) {
      return next(e);
    }

    return next({
      ...e,
      text: e.text + directive
    });
  });

  // Enhance spinner while thinking if STE is active
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (!steActive) return next(e);
    const suffix = ` · STE [${steMode.toUpperCase()}]`;
    return next({
      ...e,
      props: {
        ...e.props,
        suffix: (e.props && e.props.suffix ? e.props.suffix : '') + suffix
      }
    });
  });
}
