/**
 * STE pane: the last answer as an ASD-STE100 document, docked beside the transcript.
 *
 *   v  view      the answer rewritten as an ASD-STE100 document, laid out as a manual page
 *   o  original  the answer as Claude wrote it
 *   c  check     the score and the findings of the text in view
 *   r  rewrite   rewrite the answer again
 *   s  session   the STE record of the whole session; g makes it (on request only, as it uses tokens)
 *   x  close
 */

import { validateText } from '../lib/ste-engine.js';
import { clip, findingRows, findingsOf, lengthRows, proseOf, widthOf } from './sheet.jsx';
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

// A row of a text grid: each cell is [label, value], drawn between │ marks to the given widths
function gridRow({ h, Text }, key, cells, widths) {
  const parts = [<Text key="l" dimColor>│</Text>];
  cells.forEach(([label, value, style = {}], i) => {
    const room = widths[i] - 2;
    const lab = label ? `${label} ` : '';
    const val = clip(String(value), Math.max(1, room - lab.length));
    parts.push(<Text key={`c${i}`}>{' '}<Text dimColor>{lab}</Text><Text {...style}>{val}</Text>{' '.repeat(Math.max(0, room - lab.length - widthOf(val)))}{' '}</Text>);
    parts.push(<Text key={`s${i}`} dimColor>│</Text>);
  });
  return <Text key={key} wrap="truncate-end">{parts}</Text>;
}

// A border line of a text grid: left, cross and right marks, with ─ to the given widths
const gridLine = ({ h, Text }, key, widths, [left, cross, right]) => (
  <Text key={key} dimColor wrap="truncate-end">{left + widths.map(w => '─'.repeat(w)).join(cross) + right}</Text>
);

// Split `total` cells into widths for n columns, with the n + 1 border marks
function splitWidths(total, shares) {
  const room = total - shares.length - 1;
  const sum = shares.reduce((a, b) => a + b, 0);
  const widths = shares.map(x => Math.max(4, Math.floor((room * x) / sum)));
  widths[widths.length - 1] += room - widths.reduce((a, b) => a + b, 0);
  return widths;
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
  const { view, report, tab, mode, modeLabel, limitOf, isRewriting, record, recordReport, isRecording, onTab, onRewrite, onRecord, onClose } = pane;
  const width = Math.max(20, columns);
  const isFramed = width >= 50;
  const inner = width;
  // The body sits inside one cell of padding on each side of a framed page
  const bodyWidth = isFramed ? width - 2 : width;

  let status;
  let body = [];
  let info = [];
  const isSession = tab === 'session';
  if (isSession) {
    if (isRecording) {
      status = <Text color="yellow">Writing the STE record of this session…</Text>;
    } else if (record) {
      status = <Text><Text color="green">Session record</Text><Text dimColor>{record.source === 'lite' ? ' · lite (small model)' : ' · full context'} · g: write again</Text></Text>;
    } else {
      status = <Text dimColor>No session record yet. Press g or type /asd session to write one. This uses tokens.</Text>;
    }
    if (record) body = manualRows(els, record.text, { mode, limitOf, columns: bodyWidth });
  } else if (!view) {
    status = <Text dimColor>The pane shows the next answer as an ASD-STE100 document.</Text>;
  } else if (tab === 'original') {
    status = <Text dimColor>Original answer, as Claude wrote it</Text>;
    body = viewRows(els, view.original, { mode, limitOf, columns: bodyWidth });
  } else if (isRewriting && view.source !== 'rewrite') {
    status = <Text color="yellow">Rewriting the answer as an ASD-STE100 document…</Text>;
    body = [<Text key="wait" dimColor>Press o to read the original answer now.</Text>];
  } else {
    status = view.source === 'rewrite'
      ? <Text color="green">STE version</Text>
      : <Text><Text color="yellow">Original answer, not rewritten</Text><Text dimColor> · r: rewrite</Text></Text>;
    body = tab === 'check' && report
      ? checkRows(els, report, limitOf, bodyWidth)
      : manualRows(els, view.text, { mode, limitOf, columns: bodyWidth });
    if (view.source === 'rewrite') {
      info = changeRows(els, statsOf(view.original, mode, limitOf), statsOf(view.text, mode, limitOf), inner);
    }
  }

  // The page shows the session record on the session tab, else the last answer
  const doc = isSession
    ? { text: record ? record.text : '', task: `00-02-${String((record && record.rev) || 0).padStart(2, '0')}`, rev: record ? record.rev : 0, date: record && record.date, report: recordReport, fallback: 'Session record' }
    : { text: view ? view.text : '', task: `00-01-${String((view && view.task) || 0).padStart(2, '0')}`, rev: view ? view.rev || 0 : 0, date: view && view.date, report, fallback: 'Last answer' };
  const taskNo = doc.task;
  const title = (titleOf(doc.text) || doc.fallback).toUpperCase();
  // AMM page blocks: 001 description and operation, 201 maintenance practices (a text with steps)
  const hasSteps = blocksOf(doc.text).some(b => b.kind === 'step');
  const block = hasSteps ? ['201', 'MAINTENANCE PRACTICES'] : ['001', 'DESCRIPTION & OPERATION'];
  const rev = String(doc.rev);
  const pageReport = doc.report;
  const score = pageReport ? `${pageReport.score}/100` : '—';

  let header;
  let footer;
  if (isFramed) {
    const top = splitWidths(inner, [3, 1]);
    const cells = splitWidths(inner, [3, 2, 1, 2]);
    const foot = splitWidths(inner, [3, 2, 3]);
    header = [
      gridLine(els, 'h0', top, ['┌', '┬', '┐']),
      gridRow(els, 'h1', [['', 'ASD-STE100  STE MAINTENANCE MANUAL', { bold: true }], ['TASK', taskNo, { bold: true }]], top),
      gridRow(els, 'h2', [['', title, { bold: true, color: 'cyan' }], ['PAGE BLOCK', block[0]]], top),
      gridLine(els, 'h3', top, ['├', '┴', '┤']),
      gridRow(els, 'h4', [['', block[1]]], [inner - 2]),
      gridLine(els, 'h5', cells, ['├', '┬', '┤']),
      gridRow(els, 'h6', [['EFFECTIVITY', 'ALL'], ['MODE', /STRICT/.test(modeLabel) ? 'STRICT 100%' : '80% STE'], ['REV', rev, { bold: true }], ['DATE', doc.date || '—']], cells),
      gridLine(els, 'h7', cells, ['└', '┴', '┘']),
    ];
    footer = [
      gridLine(els, 'f0', foot, ['┌', '┬', '┐']),
      gridRow(els, 'f1', [['', 'STE100 ISSUE 9'], ['SCORE', score, pageReport ? { color: scoreColor(pageReport.score), bold: true } : {}], ['', `${taskNo}  PAGE ${block[0]}`]], foot),
      gridLine(els, 'f2', foot, ['└', '┴', '┘']),
    ];
  } else {
    header = [
      <Text key="h1"><Text inverse bold> ASD-STE100 </Text><Text bold>{`  TASK ${taskNo}`}</Text></Text>,
      <Text key="h2" bold color="cyan">{title}</Text>,
      <Text key="h3" dimColor>{`${block[1]} · ${modeLabel} · REV ${rev}`}</Text>,
    ];
    footer = [<Text key="f1" dimColor>{`SCORE ${score} · PAGE ${block[0]}`}</Text>];
  }

  const page = (
    <Box key="page" flexDirection="column" width={width}>
      {header}
      {status}
      <Text key="gap1"> </Text>
      <Box flexDirection="column" paddingX={isFramed ? 1 : 0}>{body}</Box>
      <Text key="gap2"> </Text>
      {info}
      {footer}
    </Box>
  );

  return (
    <Box flexDirection="column" width={width}>
      {page}
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        <Button key="tab-view" plain hotkey="v" label="view" dimColor={tab !== 'view'} onPress={() => onTab('view')} />
        <Button key="tab-original" plain hotkey="o" label="original" dimColor={tab !== 'original'} onPress={() => onTab('original')} />
        <Button key="tab-check" plain hotkey="c" label="check" dimColor={tab !== 'check'} onPress={() => onTab('check')} />
        <Button key="tab-session" plain hotkey="s" label="session" dimColor={tab !== 'session'} onPress={() => onTab('session')} />
        {isSession
          ? <Button key="record" plain hotkey="g" label={record ? 'write again' : 'write record'} dimColor={isRecording} onPress={onRecord} />
          : <Button key="rewrite" plain hotkey="r" label="rewrite" dimColor={!view || isRewriting} onPress={onRewrite} />}
        <Button key="close" plain hotkey="x" label="close" role="dismiss" onPress={onClose} />
      </Box>
    </Box>
  );
}
