/**
 * STE check: the parts of the pane's check tab.
 *
 *   - the prose of an answer, without code, tables and links
 *   - sentence lengths against the word limit
 *   - findings (unapproved words, passive voice, style)
 */

const RULE_LABELS = {
  SENTENCE_LENGTH: 'length',
  PASSIVE_VOICE: 'passive',
  UNAPPROVED_WORD: 'word',
  VERB_TENSE: 'verb form',
  NOUN_CLUSTER: 'noun cluster',
  PARAGRAPH_LENGTH: 'paragraph',
};

// Remove the parts of a markdown answer that are not prose: code, tables, links, list marks
export function proseOf(answer) {
  return (answer || '')
    .replace(/```[\s\S]*?```/g, '\n\n')
    .replace(/`[^`\n]*`/g, 'CODE')
    .split('\n')
    .filter(line => !/^\s*\|/.test(line))
    .map(line => line
      .replace(/^\s*#{1,6}\s+/, '')
      .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, 'URL')
      .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1'))
    .join('\n')
    .trim();
}

// One row per finding, with repeats of the same word or phrase folded together
export function findingsOf(report) {
  const rows = new Map();
  for (const s of report.sentences) {
    for (const i of s.issues) {
      if (i.permitted || i.type === 'SENTENCE_LENGTH') continue;
      const item = i.word || i.cluster || (i.message.match(/"([^"]+)"/) || [])[1] || i.message;
      const alt = i.replacement || i.suggestion || (i.type === 'NOUN_CLUSTER' ? i.message : '');
      const id = `${i.type}:${item.toLowerCase()}`;
      const row = rows.get(id) || { type: i.type, item, alt, severity: i.severity, count: 0 };
      row.count += 1;
      rows.set(id, row);
    }
  }
  const rank = { error: 0, warning: 1, info: 2 };
  return [...rows.values()].sort((a, b) => rank[a.severity] - rank[b.severity] || b.count - a.count);
}

export const clip = (text, n) => (text.length > n ? `${text.slice(0, Math.max(0, n - 1))}…` : text);
const pad = (text, n) => clip(text, n).padEnd(n);

// The longest sentences as bars, with the limit marked
export function lengthRows({ h, Text }, report, limitOf, barWidth) {
  const longest = [...report.sentences].sort((a, b) => b.wordCount - a.wordCount).slice(0, 4)
    .sort((a, b) => a.index - b.index);
  const scale = Math.max(30, ...longest.map(s => s.wordCount));
  return longest.map(s => {
    const limit = limitOf(s);
    const filled = Math.round((s.wordCount / scale) * barWidth);
    const mark = Math.round((limit / scale) * barWidth);
    const inside = Math.min(filled, mark);
    const over = Math.max(0, filled - mark);
    const rest = Math.max(0, barWidth - Math.max(filled, mark));
    const isOver = s.wordCount > limit;
    return (
      <Text key={`s${s.index}`}>
        <Text dimColor>{pad(`S${s.index}`, 4)}</Text>
        <Text color="blue">{'█'.repeat(inside)}</Text>
        <Text dimColor>{'░'.repeat(Math.max(0, mark - inside))}</Text>
        <Text color={isOver ? 'red' : 'blue'}>│</Text>
        <Text color="red">{'█'.repeat(over)}</Text>
        <Text dimColor>{'░'.repeat(rest)}</Text>
        <Text color={isOver ? 'red' : undefined}>{` ${s.wordCount}/${limit}`}</Text>
        {isOver ? <Text color="red"> ✕</Text> : null}
      </Text>
    );
  });
}

// A dictionary-style table of findings
export function findingRows({ h, Text }, findings, width, limit = 5) {
  if (findings.length === 0) {
    return [<Text key="none" color="green">✓ No unapproved words, passive voice or style issues.</Text>];
  }
  const itemWidth = Math.min(22, Math.max(10, Math.floor(width * 0.32)));
  const kindWidth = 12;
  const altWidth = Math.max(8, width - itemWidth - kindWidth - 6);
  const shown = findings.slice(0, limit);
  const rows = [
    <Text key="head" dimColor>{`  ${pad('Not approved', itemWidth)} ${pad('Rule', kindWidth)} Use instead`}</Text>,
    ...shown.map((f, n) => (
      <Text key={`f${n}`}>
        <Text color={f.severity === 'info' ? 'yellow' : 'red'}>{f.severity === 'info' ? '! ' : '✕ '}</Text>
        <Text color={f.severity === 'info' ? undefined : 'red'}>{pad(f.item + (f.count > 1 ? ` ×${f.count}` : ''), itemWidth)}</Text>
        <Text dimColor>{` ${pad(RULE_LABELS[f.type] || f.type, kindWidth)} `}</Text>
        <Text color="blue">{clip(f.alt, altWidth)}</Text>
      </Text>
    )),
  ];
  if (findings.length > shown.length) {
    rows.push(<Text key="more" dimColor>{`  +${findings.length - shown.length} more · /asd check <text> for the full report`}</Text>);
  }
  return rows;
}
