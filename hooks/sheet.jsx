/**
 * STE turn sheet: a drawing-sheet style report of the last answer, shown above the prompt.
 *
 * Panels follow the ASD-STE100 overview sheet:
 *   A  Summary (score, sentences, words)
 *   B  Sentence lengths against the word limit
 *   C  Findings (unapproved words, passive voice, style)
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
      const alt = i.replacement || i.suggestion || '';
      const id = `${i.type}:${item.toLowerCase()}`;
      const row = rows.get(id) || { type: i.type, item, alt, severity: i.severity, count: 0 };
      row.count += 1;
      rows.set(id, row);
    }
  }
  const rank = { error: 0, warning: 1, info: 2 };
  return [...rows.values()].sort((a, b) => rank[a.severity] - rank[b.severity] || b.count - a.count);
}

const clip = (text, n) => (text.length > n ? `${text.slice(0, Math.max(0, n - 1))}…` : text);
const pad = (text, n) => clip(text, n).padEnd(n);

function Panel({ h, Box, Text, letter, title, note, width, children }) {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" width={width} flexGrow={width ? 0 : 1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text>
          <Text inverse bold>{` ${letter} `}</Text>
          <Text bold>{` ${title}`}</Text>
        </Text>
        {note ? <Text dimColor>{note} </Text> : null}
      </Box>
      {children}
    </Box>
  );
}

// Panel B: the longest sentences as bars, with the limit marked
function lengthRows({ h, Text }, report, limitOf, barWidth) {
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

// Panel C: a dictionary-style table of findings
function findingRows({ h, Text }, findings, width) {
  if (findings.length === 0) {
    return [<Text key="none" color="green">✓ No unapproved words, passive voice or style issues.</Text>];
  }
  const itemWidth = Math.min(22, Math.max(10, Math.floor(width * 0.32)));
  const kindWidth = 9;
  const altWidth = Math.max(8, width - itemWidth - kindWidth - 6);
  const shown = findings.slice(0, 5);
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
    rows.push(<Text key="more" dimColor>{`  +${findings.length - shown.length} more · /ste check <text> for the full report`}</Text>);
  }
  return rows;
}

/**
 * Draw the sheet.
 * @param {object} els   - the surface's element table ($.ui.resolve(e)) plus `h`
 * @param {object} sheet - { report, modeLabel, limitOf, onHide }
 * @param {number} columns - cells across the band
 */
export function drawSheet(els, sheet, columns) {
  const { h, Box, Text, Button } = els;
  const { report, modeLabel, limitOf, onHide } = sheet;
  const findings = findingsOf(report);
  const isWide = columns >= 110;
  const leftWidth = isWide ? Math.floor(columns * 0.48) : undefined;
  const barWidth = Math.max(10, Math.min(40, (isWide ? leftWidth : columns) - 18));
  const rightInner = isWide ? columns - leftWidth - 4 : columns - 4;
  const scoreColor = report.score >= 90 ? 'green' : report.score >= 70 ? 'yellow' : 'red';
  const over = report.sentences.filter(s => s.wordCount > limitOf(s)).length;

  const header = (
    <Box flexDirection="row" justifyContent="space-between" width={columns}>
      <Text>
        <Text inverse bold> A </Text>
        <Text bold> STE sheet </Text>
        <Text dimColor>{`· ${modeLabel} · last answer`}</Text>
      </Text>
      <Box flexDirection="row">
        <Text>
          <Text dimColor>score </Text>
          <Text bold color={scoreColor}>{`${report.score}/100`}</Text>
          <Text dimColor>{`  ${report.totalSentences} sentences · ${report.totalWords} words · avg ${report.averageWordsPerSentence} · ${report.totalIssues} issues `}</Text>
        </Text>
        <Button key="ste-hide" label="Hide" plain onPress={onHide} />
      </Box>
    </Box>
  );

  const lengths = (
    <Panel h={h} Box={Box} Text={Text} letter="B" title="Sentence length" note={over ? `${over} over limit` : 'all within limit'} width={leftWidth}>
      {lengthRows({ h, Text }, report, limitOf, barWidth)}
    </Panel>
  );
  const table = (
    <Panel h={h} Box={Box} Text={Text} letter="C" title="Findings" note={findings.length ? `${findings.length} items` : 'clean'}>
      {findingRows({ h, Text }, findings, rightInner)}
    </Panel>
  );

  return (
    <Box flexDirection="column" width={columns}>
      {header}
      <Box flexDirection={isWide ? 'row' : 'column'}>
        {lengths}
        {table}
      </Box>
    </Box>
  );
}
