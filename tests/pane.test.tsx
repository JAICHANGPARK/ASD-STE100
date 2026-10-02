import { expect, mock, test } from 'claude-code/testing'
import { widthOf } from '../hooks/sheet.jsx'

const STE_DOCUMENT = `# Replace the filter

The pump supplies fuel to the engine. You must utilize the correct filter.

1. Stop the pump.
2. Remove the old filter.

WARNING: Do not touch the pump when it is hot. Hot parts can cause injury.`

const ORIGINAL = 'To replace the filter, you should first make sure the pump has been stopped, and then you can go ahead and take out the old filter.'

const pane = (bodyColumns: number) => ({
  component: 'Pane',
  requestId: 'ste-sheet',
  props: { title: 'STE', isFocused: true, bodyColumns, placement: 'dock' },
}) as const

const usage = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

// Stand in for the engine beneath the plugin, and answer the rewrite with `rewritten`
const setup = (on: any, $: any, rewritten = STE_DOCUMENT) => {
  const prompts: string[] = []
  const clock = mock.clock(on)
  on('prompt.submit', (_$: unknown, e: unknown) => e)
  on('turn.complete', () => ({ text: '' }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('model.complete', (_$: unknown, e: any) => {
    prompts.push(e.prompt)
    return { value: { isAnswered: true, text: rewritten, usage } }
  })
  on('ui.render', ($e: any, e: any) => {
    const { Box } = $e.ui.resolve(e)
    return <Box />
  })
  const turn = async (prompt: string, answer: string) => {
    await $.prompt.submit({ text: prompt })
    await $.turn.complete({ answer, durationMs: 10, isAborted: false, turnId: 't', reason: 'answer' })
  }
  return { turn, clock, prompts }
}

test('each answer is rewritten as an ASD-STE100 document in the pane', async ($, on) => {
  const { turn, clock, prompts } = setup(on, $)
  await turn('How do I replace the filter?', ORIGINAL)

  for (const surface of ['terminal', 'desktop'] as const) {
    for (const columns of [40, 70]) {
      const ui = await $.ui.mount({ plugin: 'asd-ste100', surface, ...pane(columns) })
      if (surface === 'terminal' && columns === 40) {
        expect(await ui.find({ type: 'Text', text: /Rewriting the answer/ })).toBeDefined()
        await clock.advance(1)
      }
      expect(await ui.find({ type: 'Text', text: /STE version/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /Original → STE: .*avg words \d+ → \d+/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /too long 1 → 0/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /REPLACE THE FILTER/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /TASK 00-01-01/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /^1\. GENERAL$/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /^ +A\. $/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /^ +\(1\) $/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /^Stop the pump\.$/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /→USE/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /^ WARNING $/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /REV 1\b/ })).toBeDefined()

      await ui.press({ key: 'tab-original' })
      expect(await ui.find({ type: 'Text', text: /go ahead and take out/ })).toBeDefined()
      await ui.press({ key: 'tab-check' })
      expect(await ui.find({ type: 'Text', text: /score/ })).toBeDefined()
      await ui.press({ key: 'tab-view' })
      await ui.unmount()
    }
  }
  expect(prompts).toHaveLength(1)
  expect(prompts[0]).toContain('ASD-STE100 document')
})

test('r rewrites the answer again', async ($, on) => {
  const { turn, clock, prompts } = setup(on, $)
  await turn('How do I replace the filter?', ORIGINAL)
  await clock.advance(1)
  const ui = await $.ui.mount({ plugin: 'asd-ste100', surface: 'terminal', ...pane(60) })
  await ui.press({ key: 'rewrite' })
  expect(prompts).toHaveLength(2)
  expect(await ui.find({ type: 'Text', text: /STE version/ })).toBeDefined()
  await ui.unmount()
})

test('the pane opens after a plain question', async ($, on) => {
  const opened: string[] = []
  mock.clock(on)
  on('prompt.submit', (_$: unknown, e: unknown) => e as never)
  on('turn.complete', () => ({ text: '' }))
  on('ui.open', (_$: unknown, e: any) => {
    opened.push(e.id)
    return { value: { isPlaced: true } } as never
  })
  await $.prompt.submit({ text: 'What is a database index?' })
  await $.turn.complete({ answer: 'An index makes a search fast.', durationMs: 10, isAborted: false, turnId: 't', reason: 'answer' })
  expect(opened).toContain('ste-sheet')
})

test('STE mode adds its rules to the system prompt and keeps the prompt as typed', { options: { autoInject: true } }, async ($, on) => {
  let seen = ''
  on('prompt.submit', (_$: unknown, e: any) => {
    seen = e.text
    return e
  })
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'You are Claude Code.', scope: 'shared' }] }) as never)
  await $.prompt.submit({ text: 'What is a database index?' })
  expect(seen).toBe('What is a database index?')
  const composed = await ($.prompt as any).compose({ model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] })
  const directive = composed.sections.find((s: any) => s.id === 'asd-ste100:directive')
  expect(directive.text).toContain('ASD-STE100 MODE IS ON')
  expect(directive.text).toContain('even when the prompt asks for another form')
})

test('an answer with the word "constructor" draws', async ($, on) => {
  const { turn, clock } = setup(on, $, 'Provider passes data down without long chains of constructor parameters.')
  await turn('Explain the widget tree', 'Provider passes data down without long chains of constructor parameters.')
  await clock.advance(1)
  const ui = await $.ui.mount({ plugin: 'asd-ste100', surface: 'terminal', ...pane(60) })
  expect(await ui.find({ type: 'Text', text: /could not draw/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /constructor parameters/ })).toBeDefined()
  await ui.unmount()
})

test('by default the answer stays as Claude wrote it', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'You are Claude Code.', scope: 'shared' }] }) as never)
  const composed = await ($.prompt as any).compose({ model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] })
  expect(composed.sections.map((s: any) => s.id)).not.toContain('asd-ste100:directive')
})

test('code blocks and tables draw as markdown, and model numbers are not doubled', async ($, on) => {
  const doc = [
    '# Flutter Widgets',
    '',
    '## 2. StatefulWidget',
    '',
    'A StatefulWidget keeps data in a State object.',
    '',
    '```dart',
    'class Counter extends StatefulWidget {}',
    '```',
    '',
    '| Category | Examples |',
    '|---|---|',
    '| Layout | `Row`, `Column` |',
  ].join(String.fromCharCode(10))
  const { turn, clock } = setup(on, $, doc)
  await turn('Explain Flutter widgets', 'Flutter widgets are the parts of the screen.')
  await clock.advance(1)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'asd-ste100', surface, ...pane(72) })
    expect(await ui.find({ type: 'Text', text: /^1\. STATEFULWIDGET$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /1\. 2\./ })).toBeUndefined()
    expect(await ui.findAll({ type: 'Markdown' })).toHaveLength(1)
    expect(await ui.find({ type: 'Text', text: /│ Category +│ Examples +│/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /│ Layout +│ Row, Column +│/ })).toBeDefined()
    await ui.unmount()
  }
})

test('a pane that waits on a narrow terminal says how to open it', async ($, on) => {
  const toasts: string[] = []
  mock.clock(on)
  on('prompt.submit', (_$: unknown, e: unknown) => e as never)
  on('turn.complete', () => ({ text: '' }))
  on('ui.open', () => ({ value: { isPlaced: false } }) as never)
  on('ui.toast', (_$: unknown, e: any) => {
    toasts.push(e.text)
    return { value: {} } as never
  })
  await $.prompt.submit({ text: 'What is a database index?' })
  await $.turn.complete({ answer: 'An index makes a search fast.', durationMs: 10, isAborted: false, turnId: 't', reason: 'answer' })
  expect(toasts.join(' ')).toContain('/asd pane')
})

const RECORD = [
  '# STE Mod Work',
  '',
  '## Purpose',
  '',
  'The person wanted an STE pane.',
  '',
  '## Completed work',
  '',
  '1. Release 2026.10.2+18.',
].join(String.fromCharCode(10))

test('the session record runs only on request, from the full context', async ($, on) => {
  const forks: string[] = []
  const { turn } = setup(on, $)
  on('model.fork', (_$: unknown, e: any) => {
    forks.push(e.prompt)
    return { value: { isAnswered: true, text: RECORD, usage } } as never
  })
  await turn('Explain the pane', 'The pane shows the answer.')
  const ui = await $.ui.mount({ plugin: 'asd-ste100', surface: 'terminal', ...pane(72) })
  await ui.press({ key: 'tab-session' })
  expect(await ui.find({ type: 'Text', text: /No session record yet/ })).toBeDefined()
  expect(forks).toHaveLength(0)

  await ui.press({ key: 'record' })
  expect(forks).toHaveLength(1)
  expect(forks[0]).toContain('record of this whole conversation')
  expect(await ui.find({ type: 'Text', text: /Session record/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /STE MOD WORK/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /00-02-01/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^1\. PURPOSE$/ })).toBeDefined()
  await ui.unmount()
})

test('the session record falls back to the transcript and a small model', async ($, on) => {
  const { turn, prompts } = setup(on, $, RECORD)
  on('model.fork', () => ({ value: { isAnswered: false, reason: 'api-error', status: 500, error: 'api_error', usage } }) as never)
  on('session.messages', () => ({ value: [
    { role: 'user', text: 'Make an STE pane.', toolUses: [] },
    { role: 'assistant', text: 'I made the STE pane.', toolUses: [] },
  ] }) as never)
  await turn('Explain the pane', 'The pane shows the answer.')
  const ui = await $.ui.mount({ plugin: 'asd-ste100', surface: 'terminal', ...pane(72) })
  await ui.press({ key: 'tab-session' })
  await ui.press({ key: 'record' })
  const last = prompts[prompts.length - 1]
  expect(last).toContain('PERSON: Make an STE pane.')
  expect(await ui.find({ type: 'Text', text: /lite \(small model\)/ })).toBeDefined()
  await ui.unmount()
})

test('the rewrite names the language of the answer', async ($, on) => {
  const { turn, clock, prompts } = setup(on, $)
  await turn('Explain the filter', 'You should utilize the correct filter.')
  await clock.advance(1)
  expect(prompts[0]).toContain('Write the document in English')
  await turn('필터를 설명해줘', '올바른 필터를 사용해야 합니다.')
  await clock.advance(1)
  expect(prompts[1]).toContain('Write the document in Korean')
})

test('Korean titles and tables keep the grid lines straight', async ($, on) => {
  const doc = ['# 플러터 위젯 설명', '', '## 위젯 종류', '',
    '| 종류 | 설명 |', '|---|---|',
    '| StatelessWidget | 상태가 없는 위젯입니다. 입력값으로만 화면을 그립니다. |',
    '| StatefulWidget | 상태 객체에 바뀌는 데이터를 저장합니다. |',
  ].join(String.fromCharCode(10))
  const { turn, clock } = setup(on, $, doc)
  await turn('위젯을 설명해줘', '위젯은 화면의 부품입니다.')
  await clock.advance(1)
  const ui = await $.ui.mount({ plugin: 'asd-ste100', surface: 'terminal', ...pane(72) })
  const tree: any = await ui.drawn()
  const flat = (n: any): string => typeof n === 'string' ? n : (n.children || []).map(flat).join('')
  const lines: string[] = []
  const walk = (n: any) => {
    if (typeof n === 'string') return
    if (n.type === 'Text') { lines.push(flat(n)); return }
    ;(n.children || []).forEach(walk)
  }
  walk(tree)
  const header = lines.filter(l => /TASK|PAGE BLOCK|EFFECTIVITY|DESCRIPTION|플러터 위젯 설명|SCORE/.test(l))
  expect(header.length).toBeGreaterThan(4)
  for (const l of header) expect(widthOf(l)).toBe(72)
  // Every line with box marks is the page width or the table width (the body indents a table by 3 cells)
  for (const l of lines.filter(x => /^[│┌├╞└]/.test(x))) expect([72, 67]).toContain(widthOf(l))
  const table = lines.filter(l => /^│/.test(l) && /종류|StatelessWidget|StatefulWidget|상태/.test(l))
  expect(table.length).toBeGreaterThanOrEqual(3)
  const widths = new Set(table.map(l => widthOf(l)))
  expect(widths.size).toBe(1)
  await ui.unmount()
})
