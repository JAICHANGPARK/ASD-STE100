import { expect, test } from 'claude-code/testing'

const ANSWER =
  'It is imperative that the operator ensures the reservoir is replenished prior to commencing operation. ' +
  'Utilize a torque wrench. Close the valve.'

const band = (bodyColumns: number) => ({
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 30, bodyColumns },
}) as const

test('the STE sheet shows the last answer after a turn, and Hide removes it', async ($, on) => {
  // Stand in for the engine beneath the plugin
  on('turn.complete', () => ({ text: '' }))
  on('ui.render', ($e, e) => {
    const { Box } = $e.ui.resolve(e)
    return <Box />
  })
  await $.turn.complete({ answer: ANSWER, durationMs: 10, isAborted: false, turnId: 't1', reason: 'answer' })

  for (const surface of ['terminal', 'desktop'] as const) {
    for (const columns of [80, 140]) {
      const ui = await $.ui.mount({ plugin: 'asd-ste100', surface, ...band(columns) })
      expect(await ui.find({ type: 'Text', text: /STE sheet/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /utilize/i })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /score/ })).toBeDefined()
      await ui.unmount()
    }
  }

  const ui = await $.ui.mount({ plugin: 'asd-ste100', surface: 'terminal', ...band(120) })
  await ui.press({ key: 'ste-hide' })
  expect(await ui.find({ type: 'Text', text: /STE sheet/ })).toBeUndefined()
  await ui.unmount()
})
