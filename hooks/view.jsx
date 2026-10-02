/**
 * STE view: an answer laid out as an ASD-STE100 document.
 *
 * - Headings become section titles.
 * - Descriptive text shows one sentence on each line.
 * - Numbered lines become procedure steps.
 * - WARNING, CAUTION and NOTE lines become signal blocks (STE Section 7).
 * - Unapproved words show in red with the approved word after them.
 * - A sentence over the word limit shows its word count in red.
 */

import { validateText } from '../lib/ste-engine.js';

// Words that ask for an ASD-STE100 answer
export const STE_REQUEST = /asd[- ]?ste|ste[- ]?100|simplified technical english|\bSTE\b|karpathy/i;

const SIGNAL = /^\s*(?:\*\*)?(WARNING|CAUTION|NOTE)(?:\*\*)?\s*:?\s*(?:\*\*)?\s*/i;
const SIGNAL_COLOR = { WARNING: 'red', CAUTION: 'yellow', NOTE: 'blue' };

const plain = (text) => text
  .replace(/`([^`]+)`/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/(^|\W)[*_]([^*_]+)[*_](?=\W|$)/g, '$1$2')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

/**
 * Split a markdown answer into STE blocks.
 * @returns {Array<{kind: string, text?: string, lines?: string[], n?: number, signal?: string}>}
 */
export function blocksOf(answer) {
  const blocks = [];
  let paragraph = [];
  let code = null;
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'text', text: plain(paragraph.join(' ')) });
    paragraph = [];
  };

  for (const line of (answer || '').split('\n')) {
    if (code) {
      if (/^\s*```/.test(line)) {
        blocks.push({ kind: 'code', lines: code });
        code = null;
      } else {
        code.push(line);
      }
      continue;
    }
    if (/^\s*```/.test(line)) {
      flush();
      code = [];
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push({ kind: 'title', level: heading[1].length, text: plain(heading[2]) });
      continue;
    }
    if (SIGNAL.test(line)) {
      flush();
      const signal = line.match(SIGNAL)[1].toUpperCase();
      blocks.push({ kind: 'signal', signal, text: plain(line.replace(SIGNAL, '')) });
      continue;
    }
    const step = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (step) {
      flush();
      blocks.push({ kind: 'step', n: Number(step[1]), text: plain(step[2]) });
      continue;
    }
    const item = line.match(/^\s*[-*+]\s+(.*)$/);
    if (item) {
      flush();
      blocks.push({ kind: 'item', text: plain(item[1]) });
      continue;
    }
    if (/^\s*\|/.test(line)) {
      flush();
      const last = blocks[blocks.length - 1];
      if (!/^\s*\|[\s:|-]+\|\s*$/.test(line)) {
        if (last && last.kind === 'table') last.lines.push(line.trim());
        else blocks.push({ kind: 'table', lines: [line.trim()] });
      }
      continue;
    }
    paragraph.push(line.trim());
  }
  if (code) blocks.push({ kind: 'code', lines: code });
  flush();
  return blocks;
}

// One sentence with its unapproved words marked, and its word count when it is too long
function sentenceLine({ h, Text }, report, key, prefix, limitOf) {
  const s = report.sentences[0];
  if (!s) return null;
  const words = s.issues.filter(i => i.type === 'UNAPPROVED_WORD' && i.word);
  const parts = [];
  let rest = s.text;
  for (const w of words) {
    const at = rest.toLowerCase().indexOf(w.word.toLowerCase());
    if (at < 0) continue;
    parts.push(rest.slice(0, at));
    parts.push(
      <Text key={`${key}-${parts.length}`}>
        <Text color="red" underline>{rest.slice(at, at + w.word.length)}</Text>
        {w.replacement ? <Text color="blue">{` →${w.replacement.split(/[,(]/)[0].trim().toUpperCase()}`}</Text> : null}
      </Text>
    );
    rest = rest.slice(at + w.word.length);
  }
  parts.push(rest);
  const limit = limitOf(s);
  return (
    <Text key={key}>
      {prefix}
      {parts}
      {s.wordCount > limit ? <Text color="red">{`  ${s.wordCount}/${limit} words`}</Text> : null}
    </Text>
  );
}

function sentencesOf(text, mode) {
  return validateText(text, { mode }).sentences.map(s => ({ ...s, report: { sentences: [s] } }));
}

/**
 * Draw an answer as an STE document.
 * @param {object} els  - the surface's element table plus `h`
 * @param {string} text - the answer
 * @param {object} opts - { mode, limitOf, columns }
 */
export function viewRows(els, text, { mode, limitOf, columns }) {
  const { h, Box, Text } = els;
  const rows = [];
  let n = 0;
  const key = () => `v${n++}`;

  for (const b of blocksOf(text)) {
    if (b.kind === 'title') {
      if (rows.length) rows.push(<Text key={key()}> </Text>);
      rows.push(<Text key={key()} bold>{b.text}</Text>);
      continue;
    }
    if (b.kind === 'signal') {
      rows.push(
        <Box key={key()} flexDirection="column" borderStyle="single" borderColor={SIGNAL_COLOR[b.signal]} width={Math.max(20, columns)}>
          <Text bold color={SIGNAL_COLOR[b.signal]}>{b.signal}</Text>
          {sentencesOf(b.text, mode).map(s => sentenceLine(els, s.report, key(), '', limitOf))}
        </Box>
      );
      continue;
    }
    if (b.kind === 'step' || b.kind === 'item') {
      const mark = b.kind === 'step' ? `${b.n}. ` : '• ';
      sentencesOf(b.text, mode).forEach((s, i) => {
        rows.push(sentenceLine(els, s.report, key(), <Text color="blue">{i === 0 ? mark : ' '.repeat(mark.length)}</Text>, limitOf));
      });
      continue;
    }
    if (b.kind === 'code' || b.kind === 'table') {
      for (const line of b.lines) rows.push(<Text key={key()} dimColor wrap="truncate-end">{`  ${line}`}</Text>);
      continue;
    }
    // Descriptive text: one sentence on each line, then a gap after the paragraph
    for (const s of sentencesOf(b.text, mode)) rows.push(sentenceLine(els, s.report, key(), '', limitOf));
    rows.push(<Text key={key()}> </Text>);
  }
  return rows.filter(Boolean);
}

// The document title: the first level-1 heading, or the first heading
export function titleOf(text) {
  const titles = blocksOf(text).filter(b => b.kind === 'title');
  const first = titles.find(b => b.level === 1) || titles[0];
  return first ? first.text : '';
}

const letter = (i) => String.fromCharCode(65 + (i % 26));
const HANGUL = /[\uac00-\ud7a3]/;

/**
 * Draw an STE document as a page of a maintenance manual.
 *   1. SECTION       a heading
 *      A. Sentence   one sentence of descriptive text
 *      (1) Step      a numbered procedure step
 *      (a) Item      a list item
 * WARNING, CAUTION and NOTE are boxes with the signal word in the middle of the top line.
 * @param {object} els  - the surface's element table plus `h`
 * @param {string} text - the STE document
 * @param {object} opts - { mode, limitOf, columns }
 */
export function manualRows(els, text, { mode, limitOf, columns }) {
  const { h, Box, Text } = els;
  const rows = [];
  let n = 0;
  const key = () => `m${n++}`;
  const title = titleOf(text);
  let section = 0;
  let sentence = 0;
  let item = 0;
  let titleSkipped = false;

  const startSection = (name) => {
    section += 1;
    sentence = 0;
    item = 0;
    if (rows.length) rows.push(<Text key={key()}> </Text>);
    rows.push(<Text key={key()} bold>{`${section}. ${name.toUpperCase()}`}</Text>);
  };
  // A numbered line whose wrapped lines start under the text, not under the number
  const numbered = (indent, mark, body, color) => (
    <Box key={key()} flexDirection="row">
      <Box width={indent + mark.length} flexShrink={0}>
        <Text color={color}>{' '.repeat(indent) + mark}</Text>
      </Box>
      <Box flexGrow={1} flexShrink={1}>{body}</Box>
    </Box>
  );

  for (const b of blocksOf(text)) {
    if (b.kind === 'title') {
      if (!titleSkipped && b.text === title) {
        titleSkipped = true;
        continue;
      }
      startSection(b.text);
      continue;
    }
    if (section === 0 && b.kind !== 'code' && b.kind !== 'table') startSection(HANGUL.test(text) ? '개요' : 'General');
    if (b.kind === 'signal') {
      const color = SIGNAL_COLOR[b.signal];
      rows.push(
        <Box key={key()} flexDirection="column" borderStyle="single" borderColor={color} width={Math.max(20, columns)} paddingX={1}>
          <Box justifyContent="center"><Text bold inverse color={color}>{` ${b.signal} `}</Text></Box>
          {sentencesOf(b.text, mode).map(s => sentenceLine(els, s.report, key(), '', limitOf))}
        </Box>
      );
      continue;
    }
    if (b.kind === 'step') {
      item = 0;
      sentencesOf(b.text, mode).forEach((s, i) => {
        const mark = i === 0 ? `(${b.n}) ` : ' '.repeat(`(${b.n}) `.length);
        rows.push(numbered(3, mark, sentenceLine(els, s.report, key(), '', limitOf), 'blue'));
      });
      continue;
    }
    if (b.kind === 'item') {
      const mark = `(${String.fromCharCode(97 + (item % 26))}) `;
      item += 1;
      rows.push(numbered(3, mark, sentenceLine(els, { sentences: sentencesOf(b.text, mode).slice(0, 1) }, key(), '', limitOf), 'blue'));
      for (const s of sentencesOf(b.text, mode).slice(1)) rows.push(numbered(3, ' '.repeat(mark.length), sentenceLine(els, s.report, key(), '', limitOf)));
      continue;
    }
    if (b.kind === 'code' || b.kind === 'table') {
      for (const line of b.lines) rows.push(<Text key={key()} dimColor wrap="truncate-end">{`     ${line}`}</Text>);
      continue;
    }
    item = 0;
    for (const s of sentencesOf(b.text, mode)) {
      rows.push(numbered(3, `${letter(sentence)}. `, sentenceLine(els, s.report, key(), '', limitOf)));
      sentence += 1;
    }
  }
  return rows.filter(Boolean);
}
