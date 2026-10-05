import assert from 'node:assert/strict'
import { mock } from 'bun:test'
import type { NavigationEvent, RequestEvent } from '@sveltejs/kit'
import type { ErrorEvent } from '@sentry/browser'

const runtime = Bun.argv[2]
const enabled = Bun.argv[3] === 'enabled'
const events: ErrorEvent[] = []
const itemTypes: string[] = []
const diagnostics: unknown[][] = []
const originalConsoleError = console.error
console.error = (...values: unknown[]) => { diagnostics.push(values) }
const endpoint = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    assert.equal(new URL(request.url).pathname, '/api/3/envelope/')
    const lines = (await request.text()).trim().split('\n')
    for (let index = 1; index < lines.length; index += 2) {
      const item = JSON.parse(lines[index]) as { type: string }
      itemTypes.push(item.type)
      if (item.type === 'event') events.push(JSON.parse(lines[index + 1]) as ErrorEvent)
    }
    return Response.json({ id: 'test-event-id' })
  }
})

mock.module('$app/environment', () => ({ dev: false }))
mock.module('$env/dynamic/private', () => ({ env: {} }))
mock.module('$env/dynamic/public', () => ({
  env: {
    PUBLIC_SENTRY_DSN: enabled ? `http://testpublic@127.0.0.1:${endpoint.port}/3` : '',
    PUBLIC_SENTRY_ENVIRONMENT: 'test',
    PUBLIC_SENTRY_RELEASE: 'test-release'
  }
}))

function assertSafeEvents(): void {
  assert.ok(itemTypes.every((type) => type === 'event'))
  for (const event of events) {
    assert.equal(event.environment, 'test')
    assert.equal(event.release, 'test-release')
    assert.equal(event.sdk?.settings?.infer_ip, 'never')
    for (const field of ['user', 'extra', 'contexts', 'breadcrumbs', 'server_name']) {
      assert.ok(!(field in event), `${field} must be absent`)
    }
    assert.ok(!JSON.stringify(event).includes('do-not-send'))
  }
}

async function checkServer(): Promise<void> {
  let validSession = false
  const validatedSessions: string[] = []
  mock.module('$lib/server/auth', () => ({
    SESSION_COOKIE: 'test-session-cookie',
    validateSession: async (sessionId: string) => {
      validatedSessions.push(sessionId)
      return validSession ? { userId: 7, username: 'test-user' } : null
    }
  }))

  const Sentry = await import('@sentry/bun')
  const { handle, handleError } = await import('../../src/hooks.server')
  const { captureServerError, withRequestMonitoring } = await import('../../src/lib/server/monitoring')
  const deletedCookies: unknown[][] = []

  function request(path: string, sessionId?: string, route: string | null = path): RequestEvent {
    return {
      locals: { user: { id: 0, username: 'stale-user' }, sessionId: 'stale-session' },
      route: { id: route },
      url: new URL(`https://example.test${path}?code=do-not-send`),
      cookies: {
        get: () => sessionId,
        delete: (...arguments_: unknown[]) => deletedCookies.push(arguments_)
      }
    } as unknown as RequestEvent
  }

  try {
    const anonymous = request('/gallery')
    const anonymousResponse = await handle({
      event: anonymous,
      resolve: async (event) => {
        assert.equal(event, anonymous)
        assert.equal(event.locals.user, null)
        assert.equal(event.locals.sessionId, null)
        return new Response('public')
      }
    })
    assert.equal(anonymousResponse.headers.get('X-Robots-Tag'), null)
    assert.deepEqual(validatedSessions, [])

    validSession = true
    const authenticated = request('/admin/gallery', 'test-valid-session')
    const authenticatedResponse = await handle({
      event: authenticated,
      resolve: async (event) => {
        assert.deepEqual(event.locals.user, { id: 7, username: 'test-user' })
        assert.equal(event.locals.sessionId, 'test-valid-session')
        return new Response('admin')
      }
    })
    assert.equal(authenticatedResponse.headers.get('X-Robots-Tag'), 'noindex, nofollow')
    assert.deepEqual(validatedSessions, ['test-valid-session'])
    assert.deepEqual(deletedCookies, [])

    validSession = false
    const invalid = request('/admin/login', 'test-expired-session')
    await handle({
      event: invalid,
      resolve: async (event) => {
        assert.equal(event.locals.user, null)
        assert.equal(event.locals.sessionId, null)
        return new Response('login')
      }
    })
    assert.deepEqual(deletedCookies, [['test-session-cookie', { path: '/' }]])
    assert.deepEqual(validatedSessions, ['test-valid-session', 'test-expired-session'])

    const failure = new Error('server hook failure')
    assert.deepEqual(await handleError({
      error: failure, event: anonymous, status: 503, message: 'Service unavailable'
    }), { message: 'Service unavailable' })
    for (const status of [400, 401, 404]) {
      assert.deepEqual(await handleError({
        error: new Error(`expected ${status} failure`), event: anonymous, status, message: 'Expected error'
      }), { message: 'Expected error' })
    }

    if (enabled) {
      let resumeFirst!: () => void
      let enteredFirst!: () => void
      const firstGate = new Promise<void>((resolve) => { resumeFirst = resolve })
      const firstEntered = new Promise<void>((resolve) => { enteredFirst = resolve })
      const first = withRequestMonitoring('/first', async () => {
        Sentry.getIsolationScope().setUser({ id: 'do-not-send' })
        Sentry.getIsolationScope().setExtra('session', 'do-not-send')
        enteredFirst()
        await firstGate
        assert.equal(Sentry.getIsolationScope().getScopeData().tags.route, '/first')
        Sentry.captureException(new Error('isolation first failure'))
        return 'first'
      })
      await firstEntered
      assert.equal(await withRequestMonitoring('/second', async () => {
        assert.equal(Sentry.getIsolationScope().getScopeData().tags.route, '/second')
        assert.equal(Sentry.getIsolationScope().getScopeData().user.id, undefined)
        await Promise.resolve()
        Sentry.captureException(new Error('isolation second failure'))
        return 'second'
      }), 'second')
      resumeFirst()
      assert.equal(await first, 'first')
      assert.equal(Sentry.getIsolationScope().getScopeData().tags.route, undefined)
      assert.equal(Sentry.getIsolationScope().getScopeData().user.id, undefined)
      captureServerError(new Error('unmatched failure'), null)
      assert.equal(await Sentry.flush(5_000), true)

      assert.equal(events.length, 4)
      const byMessage = new Map(events.map((event) => [event.exception?.values?.[0].value, event]))
      assert.deepEqual(byMessage.get('server hook failure')?.tags, { runtime: 'bun', route: '/gallery', status: '503' })
      assert.deepEqual(byMessage.get('isolation first failure')?.tags, { runtime: 'bun', route: '/first' })
      assert.deepEqual(byMessage.get('isolation second failure')?.tags, { runtime: 'bun', route: '/second' })
      assert.deepEqual(byMessage.get('unmatched failure')?.tags, { runtime: 'bun', route: 'unmatched', status: '500' })
      assertSafeEvents()
    } else {
      assert.equal(Sentry.getClient(), undefined)
      assert.equal(await withRequestMonitoring('/disabled', () => 'callback result'), 'callback result')
      captureServerError(new Error('disabled failure'), null)
      assert.equal(events.length, 0)
      assert.deepEqual(diagnostics, [
        ['[server] Unexpected request failure', { route: '/gallery', status: 503 }],
        ['[server] Unexpected request failure', { route: 'unmatched', status: 500 }]
      ])
    }

    await assert.rejects(async () => handle({
      event: anonymous,
      resolve: async () => { throw new Error('resolve failure') }
    }), { message: 'resolve failure' })
  } finally {
    await Sentry.close(5_000)
  }
}

async function checkClient(): Promise<void> {
  const Sentry = await import('@sentry/browser')
  const { handleError } = await import('../../src/hooks.client')
  const event = {
    route: { id: '/gallery' },
    params: {},
    url: new URL('https://example.test/gallery?code=do-not-send')
  } as unknown as NavigationEvent
  try {
    assert.deepEqual(await handleError({
      error: new Error('client hook failure'), event, status: 500, message: 'Unexpected error'
    }), { message: 'Unexpected error' })
    for (const status of [400, 401, 404]) {
      assert.deepEqual(await handleError({
        error: new Error(`expected ${status} failure`), event, status, message: 'Expected error'
      }), { message: 'Expected error' })
    }
    if (enabled) {
      assert.equal(await Sentry.flush(5_000), true)
      assert.equal(events.length, 1)
      assert.deepEqual(events[0].tags, { runtime: 'browser', route: '/gallery', status: '500' })
      assertSafeEvents()
    } else {
      assert.equal(Sentry.getClient(), undefined)
      assert.equal(events.length, 0)
      assert.deepEqual(diagnostics, [
        ['[browser] Unexpected navigation failure', { route: '/gallery', status: 500 }]
      ])
    }
  } finally {
    await Sentry.close(5_000)
  }
}

try {
  if (runtime === 'server') await checkServer()
  else if (runtime === 'client') await checkClient()
  else throw new Error('Unknown test runtime')
} finally {
  console.error = originalConsoleError
  endpoint.stop(true)
}
