/**
 * STE pane: the last answer as an ASD-STE100 document, docked beside the transcript.
 *
 *   v  view      the answer rewritten as an ASD-STE100 document
 *   o  original  the answer as Claude wrote it
 *   c  check     the score and the findings of the text in view
 *   r  rewrite   rewrite the answer again
 *   x  close
 */

import { validateText } from '../lib/ste-engine.js';
import { clip, findingRows, findingsOf, lengthRows, proseOf } from './sheet.jsx';
import { blocksOf, viewRows } from './view.jsx';

export const PANE_ID = 'ste-sheet';

const scoreColor = (score) => (score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red');

function checkRows(els, report, limitOf, columns) {
  const { h, Text } = els;
  const filled = Math.round((report.score / 100) * columns);
  const over = report.sentences.filter(s => s.wordCount > limitOf(s)).length;
  return [
    <Text key="score">
      <Text dimColor>score </Text>
      <Text bold color={scoreColor(report.score)}>{`${report.score}/100`}</Text>
    </Text>,
    <Text key="gauge">
      <Text color={scoreColor(report.score)}>{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(columns - filled)}</Text>
    </Text>,
    <Text key="stats" dimColor>{clip(`${report.totalSentences} sentences · avg ${report.averageWordsPerSentence} words · ${report.totalIssues} issues`, columns)}</Text>,
    <Text key="gap1"> </Text>,
    <Text key="len" bold>{'Longest sentences '}<Text dimColor>{over ? `${over} over limit` : 'all within limit'}</Text></Text>,
    ...lengthRows(els, report, limitOf, Math.max(8, columns - 14)),
    <Text key="gap2"> </Text>,
    <Text key="find" bold>Findings</Text>,
    ...findingRows(els, findingsOf(report), columns, 30),
  ];
}

// What one text measures for the change summary
export function statsOf(text, mode, limitOf) {
  const prose = proseOf(text);
  const report = prose ? validateText(prose, { mode }) : { sentences: [], averageWordsPerSentence: 0 };
  const count = (type) => report.sentences.reduce((n, s) => n + s.issues.filter(i => i.type === type && !i.permitted).length, 0);
  return {
    sentences: report.sentences.length,
    avgWords: Math.round(report.averageWordsPerSentence),
    tooLong: report.sentences.filter(s => s.wordCount > limitOf(s)).length,
    tables: blocksOf(text).filter(b => b.kind === 'table').length,
    phrasal: count('PHRASAL_VERB'),
    passive: count('PASSIVE_VOICE'),
    unapproved: count('UNAPPROVED_WORD'),
  };
}

// One line that says what the STE rewrite changed, for example "avg words 19 → 7"
function changeRows(els, before, after, columns) {
  const { h, Text } = els;
  const items = [
    ['sentences', before.sentences, after.sentences],
    ['avg words', before.avgWords, after.avgWords],
    ['too long', before.tooLong, after.tooLong],
    ['tables', before.tables, after.tables],
    ['phrasal verbs', before.phrasal, after.phrasal],
    ['passive', before.passive, after.passive],
    ['unapproved words', before.unapproved, after.unapproved],
  ].filter(([, a, b]) => a !== b);
  if (items.length === 0) {
    return [<Text key="chg-none" dimColor>Original → STE: no measured change</Text>];
  }
  const parts = items.map(([label, a, b], n) => (
    <Text key={`chg-${n}`}>
      {n > 0 ? <Text dimColor> · </Text> : null}
      <Text dimColor>{`${label} `}</Text>
      <Text>{`${a} → `}</Text>
      <Text color={label === 'sentences' ? undefined : b < a ? 'green' : 'yellow'}>{String(b)}</Text>
    </Text>
  ));
  return [<Text key="chg"><Text dimColor>Original → STE: </Text>{parts}</Text>];
}

/**
 * Draw the pane.
 * @param {object} els  - the surface's element table ($.ui.resolve(e)) plus `h`
 * @param {object} pane - { view, report, tab, mode, modeLabel, limitOf, isRewriting, onTab, onRewrite, onClose }
 *   view: { text, source: 'answer' | 'rewrite', isAsked } | null
 * @param {number} columns - cells across the pane body
 */
export function drawPane(els, pane, columns) {
  const { h, Box, Text, Button } = els;
  const { view, report, tab, mode, modeLabel, limitOf, isRewriting, onTab, onRewrite, onClose } = pane;
  const width = Math.max(20, columns);

  const score = report ? (
    <Text dimColor>{` · score `}<Text color={scoreColor(report.score)}>{`${report.score}/100`}</Text>{` · ${report.totalIssues} issues`}</Text>
  ) : null;

  let status;
  let body = [];
  if (!view) {
    status = <Text dimColor>The pane shows the next answer as an ASD-STE100 document.</Text>;
  } else if (tab === 'original') {
    status = <Text dimColor>Original answer, as Claude wrote it</Text>;
    body = viewRows(els, view.original, { mode, limitOf, columns: width });
  } else if (isRewriting && view.source !== 'rewrite') {
    status = <Text color="yellow">Rewriting the answer as an ASD-STE100 document…</Text>;
    body = [<Text key="wait" dimColor>Press o to read the original answer now.</Text>];
  } else {
    status = view.source === 'rewrite'
      ? <Text><Text color="green">STE version</Text>{score}</Text>
      : <Text><Text color="yellow">Original answer, not rewritten</Text>{score}<Text dimColor> · r: rewrite</Text></Text>;
    body = tab === 'check' && report
      ? checkRows(els, report, limitOf, width)
      : viewRows(els, view.text, { mode, limitOf, columns: width });
    if (view.source === 'rewrite') {
      status = [status, ...changeRows(els, statsOf(view.original, mode, limitOf), statsOf(view.text, mode, limitOf), width)];
    }
  }

  return (
    <Box flexDirection="column" width={width}>
      <Text>
        <Text inverse bold> ASD-STE100 </Text>
        <Text dimColor>{` ${modeLabel}`}</Text>
      </Text>
      {status}
      <Text dimColor>{'─'.repeat(width)}</Text>
      {body}
      <Text dimColor>{'─'.repeat(width)}</Text>
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        <Button key="tab-view" plain hotkey="v" label="view" dimColor={tab !== 'view'} onPress={() => onTab('view')} />
        <Button key="tab-original" plain hotkey="o" label="original" dimColor={tab !== 'original'} onPress={() => onTab('original')} />
        <Button key="tab-check" plain hotkey="c" label="check" dimColor={tab !== 'check'} onPress={() => onTab('check')} />
        <Button key="rewrite" plain hotkey="r" label="rewrite" dimColor={!view || isRewriting} onPress={onRewrite} />
        <Button key="close" plain hotkey="x" label="close" role="dismiss" onPress={onClose} />
      </Box>
    </Box>
  );
}
