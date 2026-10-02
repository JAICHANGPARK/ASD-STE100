/**
 * STE pane: the last answer as an ASD-STE100 document, docked beside the transcript.
 *
 *   v  view     the answer laid out as an STE document
 *   c  check    the score and the findings of that text
 *   r  rewrite  rewrite an answer that is not in STE
 *   x  close
 */

import { clip, findingRows, findingsOf, lengthRows } from './sheet.jsx';
import { viewRows } from './view.jsx';

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

  let status;
  let body;
  if (!view) {
    status = <Text dimColor>Ask for an ASD-STE100 explanation, or press r after an answer.</Text>;
    body = [];
  } else {
    status = isRewriting
      ? <Text color="yellow">Rewriting the last answer in STE…</Text>
      : view.source === 'rewrite'
        ? <Text color="green">✓ Rewritten in STE</Text>
        : view.isAsked
          ? <Text color="green">✓ Answer written in STE</Text>
          : <Text color="yellow">This answer is not in STE. Press r to rewrite it.</Text>;
    body = tab === 'check' && report
      ? checkRows(els, report, limitOf, width)
      : viewRows(els, view.text, { mode, limitOf, columns: width });
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
        <Button key="tab-view" plain hotkey="v" label="view" dimColor={tab === 'check'} onPress={() => onTab('view')} />
        <Button key="tab-check" plain hotkey="c" label="check" dimColor={tab !== 'check'} onPress={() => onTab('check')} />
        <Button key="rewrite" plain hotkey="r" label="rewrite" dimColor={!view || isRewriting} onPress={onRewrite} />
        <Button key="close" plain hotkey="x" label="close" role="dismiss" onPress={onClose} />
      </Box>
    </Box>
  );
}
