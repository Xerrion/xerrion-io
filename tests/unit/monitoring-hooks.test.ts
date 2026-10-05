import { describe, expect, test } from 'bun:test'

const fixture = new URL('../fixtures/monitoring-hooks.ts', import.meta.url).pathname

describe('Monitoring hooks', () => {
  for (const runtime of ['server', 'client']) {
    for (const state of ['enabled', 'disabled']) {
      test(`${runtime} hooks with reporting ${state}`, async () => {
        // Separate processes prevent SvelteKit environment mocks from changing other tests.
        const child = Bun.spawn([process.execPath, fixture, runtime, state], {
          stdout: 'pipe',
          stderr: 'pipe'
        })
        const [exitCode, output, errors] = await Promise.all([
          child.exited,
          new Response(child.stdout).text(),
          new Response(child.stderr).text()
        ])

        expect(errors).toBe('')
        expect(output).toBe('')
        expect(exitCode).toBe(0)
      }, 15_000)
    }
  }
})
