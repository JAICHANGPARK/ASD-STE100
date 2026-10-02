/**
 * STE pane: the last answer as an ASD-STE100 document, docked beside the transcript.
 *
 *   v  view      the answer rewritten as an ASD-STE100 document, laid out as a manual page
 *   o  original  the answer as Claude wrote it
 *   c  check     the score and the findings of the text in view
 *   r  rewrite   rewrite the answer again
 *   x  close
 */

import { validateText } from '../lib/ste-engine.js';
import { clip, findingRows, findingsOf, lengthRows, proseOf } from './sheet.jsx';
import { blocksOf, manualRows, titleOf, viewRows } from './view.jsx';

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
 * Draw the pane as a page of a maintenance manual:
 *   title block   ASD-STE100, task number, mode, document title, status
 *   body          the STE document, numbered 1. / A. / (1) / (a)
 *   info block    change summary, score, revision, date, page
 * Below 50 cells the page has no outer frame, so the text keeps its width.
 * @param {object} els  - the surface's element table ($.ui.resolve(e)) plus `h`
 * @param {object} pane - { view, report, tab, mode, modeLabel, limitOf, isRewriting, onTab, onRewrite, onClose }
 *   view: { text, original, source: 'answer' | 'rewrite', isAsked, task, rev, date } | null
 * @param {number} columns - cells across the pane body
 */
export function drawPane(els, pane, columns) {
  const { h, Box, Text, Button } = els;
  const { view, report, tab, mode, modeLabel, limitOf, isRewriting, onTab, onRewrite, onClose } = pane;
  const width = Math.max(20, columns);
  const isFramed = width >= 50;
  const inner = isFramed ? width - 4 : width;
  const rule = (k) => <Text key={k} dimColor>{'─'.repeat(inner)}</Text>;

  let status;
  let body = [];
  let info = [];
  if (!view) {
    status = <Text dimColor>The pane shows the next answer as an ASD-STE100 document.</Text>;
  } else if (tab === 'original') {
    status = <Text dimColor>Original answer, as Claude wrote it</Text>;
    body = viewRows(els, view.original, { mode, limitOf, columns: inner });
  } else if (isRewriting && view.source !== 'rewrite') {
    status = <Text color="yellow">Rewriting the answer as an ASD-STE100 document…</Text>;
    body = [<Text key="wait" dimColor>Press o to read the original answer now.</Text>];
  } else {
    status = view.source === 'rewrite'
      ? <Text color="green">STE version</Text>
      : <Text><Text color="yellow">Original answer, not rewritten</Text><Text dimColor> · r: rewrite</Text></Text>;
    body = tab === 'check' && report
      ? checkRows(els, report, limitOf, inner)
      : manualRows(els, view.text, { mode, limitOf, columns: inner });
    if (view.source === 'rewrite') {
      info = changeRows(els, statsOf(view.original, mode, limitOf), statsOf(view.text, mode, limitOf), inner);
    }
  }

  const task = view ? `TASK 00-01-${String(view.task || 1).padStart(2, '0')}` : 'TASK 00-01-00';
  const title = (view && titleOf(view.text)) || 'LAST ANSWER';
  const facts = [
    report ? <Text key="f-score"><Text dimColor>Score </Text><Text color={scoreColor(report.score)}>{`${report.score}/100`}</Text></Text> : null,
    <Text key="f-rev"><Text dimColor>Rev </Text>{String(view ? view.rev || 0 : 0)}</Text>,
    view && view.date ? <Text key="f-date">{view.date}</Text> : null,
    <Text key="f-page" dimColor>Page 1 of 1</Text>,
  ].filter(Boolean);

  const page = (
    <Box key="page" flexDirection="column" width={width} {...(isFramed ? { borderStyle: 'single', borderColor: 'gray', paddingX: 1 } : {})}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text inverse bold> ASD-STE100 </Text>
        <Text><Text bold>{task}</Text><Text dimColor>{`  ${modeLabel}`}</Text></Text>
      </Box>
      <Text bold>{title.toUpperCase()}</Text>
      {status}
      {rule('r1')}
      {body}
      {rule('r2')}
      {info}
      <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
        {facts.flatMap((f, i) => (i === 0 ? [f] : [<Text key={`sep${i}`} dimColor>│</Text>, f]))}
      </Box>
    </Box>
  );

  return (
    <Box flexDirection="column" width={width}>
      {page}
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
