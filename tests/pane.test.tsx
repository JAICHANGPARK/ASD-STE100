import { expect, mock, test } from 'claude-code/testing'

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
      expect(await ui.find({ type: 'Text', text: /^Replace the filter$/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /→USE/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /^WARNING$/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /1\. Stop the pump/ })).toBeDefined()

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
