import { expect, test } from 'claude-code/testing'

const STE_ANSWER = `# Replace the filter

The pump supplies fuel to the engine. You must utilize the correct filter.

1. Stop the pump.
2. Remove the old filter.

WARNING: Do not touch the pump when it is hot. Hot parts can cause injury.`

const pane = (bodyColumns: number) => ({
  component: 'Pane',
  requestId: 'ste-sheet',
  props: { title: 'STE', isFocused: true, bodyColumns, placement: 'dock' },
}) as const

const setup = (on: any, $: any) => {
  on('prompt.submit', (_$: unknown, e: unknown) => e)
  on('turn.complete', () => ({ text: '' }))
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.render', ($e: any, e: any) => {
    const { Box } = $e.ui.resolve(e)
    return <Box />
  })
  return async (prompt: string, answer: string) => {
    await $.prompt.submit({ text: prompt })
    await $.turn.complete({ answer, durationMs: 10, isAborted: false, turnId: 't', reason: 'answer' })
  }
}

test('an answer asked in ASD-STE100 shows as an STE document', async ($, on) => {
  const turn = setup(on, $)
  await turn('Explain filter replacement in ASD-STE100', STE_ANSWER)

  for (const surface of ['terminal', 'desktop'] as const) {
    for (const columns of [40, 70]) {
      const ui = await $.ui.mount({ plugin: 'asd-ste100', surface, ...pane(columns) })
      expect(await ui.find({ type: 'Text', text: /Answer written in STE/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /^Replace the filter$/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /→USE/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /^WARNING$/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /1\. Stop the pump/ })).toBeDefined()

      await ui.press({ key: 'tab-check' })
      expect(await ui.find({ type: 'Text', text: /score/ })).toBeDefined()
      await ui.press({ key: 'tab-view' })
      await ui.unmount()
    }
  }
})

test('r rewrites an answer that is not in STE', { options: { autoInject: false } }, async ($, on) => {
  const turn = setup(on, $)
  on('model.complete', () => ({ value: { isAnswered: true, text: 'Use the correct filter.', usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }) as never)
  await turn('How do I replace the filter?', 'You should utilize the correct filter prior to commencing operation.')

  const ui = await $.ui.mount({ plugin: 'asd-ste100', surface: 'terminal', ...pane(60) })
  expect(await ui.find({ type: 'Text', text: /not in STE/ })).toBeDefined()
  await ui.press({ key: 'rewrite' })
  expect(await ui.find({ type: 'Text', text: /Rewritten in STE/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Use the correct filter\./ })).toBeDefined()
  await ui.unmount()
})

test('the pane opens after a plain question too', async ($, on) => {
  const opened: string[] = []
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

test('STE mode adds its rules to the system prompt and keeps the prompt as typed', async ($, on) => {
  let seen = ''
  on('prompt.submit', (_$: unknown, e: any) => {
    seen = e.text
    return e
  })
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'You are Claude Code.', scope: 'shared' }] }) as never)
  await $.prompt.submit({ text: 'What is a database index?' })
  expect(seen).toBe('What is a database index?')
  const composed = await ($.prompt as any).compose({ model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] })
  expect(composed.sections.map((s: any) => s.id)).toContain('asd-ste100:directive')
})

test('an answer with the word "constructor" draws', async ($, on) => {
  const turn = setup(on, $)
  await turn('Explain the widget tree', 'Provider passes data down without long chains of constructor parameters.')
  const ui = await $.ui.mount({ plugin: 'asd-ste100', surface: 'terminal', ...pane(60) })
  expect(await ui.find({ type: 'Text', text: /could not draw/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /constructor parameters/ })).toBeDefined()
  await ui.unmount()
})
