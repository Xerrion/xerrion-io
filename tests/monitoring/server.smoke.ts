import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SourceMap } from 'node:module'
import { resolve } from 'node:path'
import type { ErrorEvent, StackFrame } from '@sentry/sveltekit'

const events: ErrorEvent[] = []
const itemTypes: string[] = []
const intakeErrors: unknown[] = []
const intake = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    try {
      assert.equal(new URL(request.url).pathname, '/api/3/envelope/')
      const lines = (await request.text()).trim().split('\n')
      for (let index = 1; index < lines.length; index += 2) {
        const item = JSON.parse(lines[index]) as { type: string }
        itemTypes.push(item.type)
        if (item.type === 'event') events.push(JSON.parse(lines[index + 1]) as ErrorEvent)
      }
      return Response.json({ id: 'production-smoke-event' })
    } catch (error) {
      intakeErrors.push(error)
      return new Response('Invalid test envelope', { status: 400 })
    }
  }
})

const localDsn = `http://testpublic@127.0.0.1:${intake.port}/3`
const child = Bun.spawn([process.execPath, '--no-env-file', './build'], {
  cwd: resolve('.'),
  env: {
    PATH: process.env.PATH ?? '',
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: '0',
    PUBLIC_SENTRY_DSN: localDsn,
    SENTRY_DSN: localDsn,
    PUBLIC_SENTRY_ENVIRONMENT: 'test',
    PUBLIC_SENTRY_RELEASE: 'production-smoke'
  },
  stdout: 'pipe',
  stderr: 'pipe'
})

let output = ''
let errors = ''
const stdout = child.stdout.pipeTo(new WritableStream({
  write(chunk: Uint8Array) { output += new TextDecoder().decode(chunk) }
}))
const stderr = child.stderr.pipeTo(new WritableStream({
  write(chunk: Uint8Array) { errors += new TextDecoder().decode(chunk) }
}))

async function waitFor(condition: () => boolean, label: string): Promise<void> {
  const deadline = Date.now() + 10_000
  while (!condition()) {
    if (Date.now() >= deadline || child.exitCode !== null) throw new Error(label)
    await Bun.sleep(25)
  }
}

function getApplicationFrame(event: ErrorEvent): StackFrame {
  const frames = event.exception?.values?.flatMap((exception) => exception.stacktrace?.frames ?? []) ?? []
  const frame = frames.find((candidate) => candidate.function === 'getRedis')
  assert.ok(frame, 'The application getRedis frame must be present')
  assert.equal(frame.in_app, true)
  assert.ok(frame.filename?.startsWith(resolve('build/server') + '/'))
  // The SDK skips runtime source snippets above its 10,000-line limit.
  if (frame.context_line !== undefined) {
    assert.ok(frame.context_line.includes('REDIS_URL is not set'))
    assert.ok(frame.context_line.length <= 300)
    assert.ok((frame.pre_context?.length ?? 0) <= 5)
    assert.ok((frame.post_context?.length ?? 0) <= 5)
  }
  return frame
}

try {
  await waitFor(() => /Listening on http:\/\/127\.0\.0\.1:\d+\//.test(output), 'Production Bun server did not start')
  const origin = output.match(/Listening on (http:\/\/127\.0\.0\.1:\d+)\//)?.[1]
  assert.ok(origin)

  const about = await fetch(`${origin}/about`)
  assert.equal(about.status, 200)
  assert.ok((await about.text()).includes('The longer'))

  const login = await fetch(`${origin}/admin/login`)
  assert.equal(login.status, 200)
  assert.equal(login.headers.get('X-Robots-Tag'), 'noindex, nofollow')
  assert.ok((await login.text()).includes('Admin Access'))

  const archivedMaps = new Bun.Glob('**/*.js.map').scan({ cwd: 'build/monitoring/client', onlyFiles: true })
  const archivedMap = (await archivedMaps.next()).value
  assert.ok(archivedMap, 'Private browser source maps must exist after preparation')
  for (const path of [`/${archivedMap}`, `/monitoring/client/${archivedMap}`]) {
    const mapResponse: Response = await fetch(`${origin}${path}`)
    assert.equal(mapResponse.status, 404)
    assert.ok(!(await mapResponse.text()).includes('sourcesContent'))
  }
  assert.equal(events.length, 0)

  const failure = await fetch(`${origin}/admin?monitoring=do-not-send`, {
    headers: {
      cookie: `session=${'a'.repeat(64)}`,
      authorization: 'Bearer do-not-send'
    },
    redirect: 'manual'
  })
  assert.equal(failure.status, 500)
  await failure.text()
  await waitFor(() => events.length > 0, 'Production Bun server did not report the application error')
  await Bun.sleep(250)
  assert.deepEqual(intakeErrors, [])
  assert.equal(events.length, 1)
  assert.ok(itemTypes.every((type) => type === 'event'))

  const event = events[0]
  assert.equal(event.sdk?.name, 'sentry.javascript.sveltekit')
  assert.equal(event.sdk?.version, '11.4.0')
  assert.equal(event.sdk?.settings?.infer_ip, 'never')
  assert.equal(event.environment, 'test')
  assert.equal(event.release, 'production-smoke')
  assert.deepEqual(event.tags, { runtime: 'bun', route: '/admin', status: '500' })
  assert.equal(event.exception?.values?.[0].value, 'REDIS_URL is not set')
  for (const field of ['user', 'extra', 'contexts', 'breadcrumbs', 'server_name']) assert.ok(!(field in event))
  assert.ok(!JSON.stringify(event).includes('do-not-send'))
  assert.ok(!JSON.stringify(event).includes('a'.repeat(64)))

  const frame = getApplicationFrame(event)
  const debugId = frame.debug_id ?? event.debug_meta?.images?.find((image) => image.code_file === frame.filename)?.debug_id
  assert.ok(debugId, 'The application frame must have a source-map debug ID')
  const map = JSON.parse(await readFile(`${frame.filename}.map`, 'utf8'))
  assert.equal(map.debug_id ?? map.debugId, debugId)
  assert.ok(frame.lineno && frame.colno)
  const entry = new SourceMap(map).findEntry(frame.lineno - 1, frame.colno - 1)
  assert.ok('originalSource' in entry && typeof entry.originalSource === 'string')
  assert.ok(entry.originalSource.endsWith('/src/lib/server/redis.ts'))
  assert.ok('originalLine' in entry && typeof entry.originalLine === 'number')
  const sourceLines = (await readFile('src/lib/server/redis.ts', 'utf8')).split('\n')
  assert.equal(sourceLines[entry.originalLine], "  if (!url) throw new Error('REDIS_URL is not set')")
  const sourceIndex = map.sources.findIndex((source: string) => source.endsWith('/src/lib/server/redis.ts'))
  assert.ok(sourceIndex >= 0)
  assert.equal(map.sourcesContent[sourceIndex].split('\n')[entry.originalLine], sourceLines[entry.originalLine])
  assert.equal(errors, '')
  console.log(`Production Bun server passed: public and login pages render; one private application error resolves to src/lib/server/redis.ts:${entry.originalLine + 1}.`)
} finally {
  child.kill('SIGTERM')
  const stopped = await Promise.race([child.exited.then(() => true), Bun.sleep(3_000).then(() => false)])
  if (!stopped) child.kill('SIGKILL')
  await child.exited
  await Promise.all([stdout, stderr])
  intake.stop(true)
}
