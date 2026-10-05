import assert from 'node:assert/strict'
import { mock } from 'bun:test'
import type { NavigationEvent, RequestEvent } from '@sveltejs/kit'
import type { ErrorEvent } from '@sentry/sveltekit'

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

  const Sentry = await import('@sentry/sveltekit')
  const { handle, handleError } = await import('../../src/hooks.server')
  const { captureServerError, withRequestMonitoring } = await import('../../src/lib/server/monitoring')
  const deletedCookies: unknown[][] = []

  function request(path: string, sessionId?: string, route: string | null = path): RequestEvent {
    const url = new URL(`https://example.test${path}?code=do-not-send`)
    return {
      locals: { user: { id: 0, username: 'stale-user' }, sessionId: 'stale-session' },
      route: { id: route },
      url,
      request: new Request(url, {
        headers: { authorization: 'Bearer do-not-send', cookie: 'session=do-not-send' }
      }),
      isSubRequest: false,
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
      resolve: async (event, options) => {
        assert.equal(event, anonymous)
        assert.equal(event.locals.user, null)
        assert.equal(event.locals.sessionId, null)
        if (enabled) {
          assert.equal(typeof options?.transformPageChunk, 'function')
          const html = await options?.transformPageChunk?.({ html: '<head></head><body>public</body>', done: true })
          assert.ok(!html?.includes('_sentryFetchProxy'))
        } else {
          assert.equal(options, undefined)
        }
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

      let resumeFirstRequest!: () => void
      let enteredFirstRequest!: () => void
      const firstRequestGate = new Promise<void>((resolve) => { resumeFirstRequest = resolve })
      const firstRequestEntered = new Promise<void>((resolve) => { enteredFirstRequest = resolve })
      const firstRequest = handle({
        event: request('/parallel-first'),
        resolve: async () => {
          Sentry.getIsolationScope().setUser({ id: 'do-not-send' })
          Sentry.getIsolationScope().setExtra('session', 'do-not-send')
          enteredFirstRequest()
          await firstRequestGate
          assert.equal(Sentry.getCurrentScope().getScopeData().tags.route, '/parallel-first')
          Sentry.captureException(new Error('parallel request first failure'))
          return new Response('first request')
        }
      })
      await firstRequestEntered
      await handle({
        event: request('/parallel-second'),
        resolve: async () => {
          assert.equal(Sentry.getCurrentScope().getScopeData().tags.route, '/parallel-second')
          assert.equal(Sentry.getIsolationScope().getScopeData().user.id, undefined)
          Sentry.captureException(new Error('parallel request second failure'))
          return new Response('second request')
        }
      })
      resumeFirstRequest()
      await firstRequest
      assert.equal(Sentry.getCurrentScope().getScopeData().tags.route, undefined)
      assert.equal(Sentry.getIsolationScope().getScopeData().user.id, undefined)

      const { error: kitError } = await import('@sveltejs/kit')
      await assert.rejects(async () => handle({
        event: anonymous,
        resolve: async () => { throw kitError(404, 'Expected route missing') }
      }), (error: unknown) => (error as { status?: number }).status === 404)

      const resolveFailure = new Error('resolve failure')
      await assert.rejects(async () => handle({
        event: anonymous,
        resolve: async () => { throw resolveFailure }
      }), { message: 'resolve failure' })
      assert.deepEqual(await handleError({
        error: resolveFailure, event: anonymous, status: 500, message: 'Internal error'
      }), { message: 'Internal error' })
      assert.equal(await Sentry.flush(5_000), true)

      assert.equal(events.length, 7)
      const byMessage = new Map(events.map((event) => [event.exception?.values?.[0].value, event]))
      assert.deepEqual(byMessage.get('server hook failure')?.tags, { runtime: 'bun', route: '/gallery', status: '503' })
      assert.equal(byMessage.get('server hook failure')?.exception?.values?.[0].mechanism?.type, 'auto.function.sveltekit.handle_error')
      assert.equal(byMessage.get('server hook failure')?.sdk?.name, 'sentry.javascript.sveltekit')
      assert.deepEqual(byMessage.get('isolation first failure')?.tags, { runtime: 'bun', route: '/first' })
      assert.deepEqual(byMessage.get('isolation second failure')?.tags, { runtime: 'bun', route: '/second' })
      assert.deepEqual(byMessage.get('unmatched failure')?.tags, { runtime: 'bun', route: 'unmatched', status: '500' })
      assert.deepEqual(byMessage.get('parallel request first failure')?.tags, { runtime: 'bun', route: '/parallel-first' })
      assert.deepEqual(byMessage.get('parallel request second failure')?.tags, { runtime: 'bun', route: '/parallel-second' })
      assert.deepEqual(byMessage.get('resolve failure')?.tags, { runtime: 'bun', route: '/gallery', status: '500' })
      assert.equal(byMessage.get('resolve failure')?.exception?.values?.[0].mechanism?.type, 'auto.function.sveltekit.handle')
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

    if (!enabled) {
      await assert.rejects(async () => handle({
        event: anonymous,
        resolve: async () => { throw new Error('resolve failure') }
      }), { message: 'resolve failure' })
    }
  } finally {
    await Sentry.close(5_000)
  }
}

async function checkClient(): Promise<void> {
  const pageState = {
    route: { id: '/gallery/[category]' },
    params: { category: 'do-not-send' },
    url: new URL('https://example.test/gallery/do-not-send?code=do-not-send')
  }
  mock.module('$app/state', () => ({ page: pageState }))
  mock.module('$app/stores', () => ({
    page: { subscribe: () => () => {} },
    navigating: { subscribe: () => () => {} }
  }))
  // Bun selects the server export. Use the installed browser export for client-hook tests.
  const clientEntry = new URL('build/esm/index.client.js', import.meta.resolve('@sentry/sveltekit/package.json'))
  const Sentry = await import(clientEntry.href) as typeof import('@sentry/sveltekit')
  mock.module('@sentry/sveltekit', () => Sentry)
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
      // Kit data requests can expose a 4xx error inside an input with a 500 status.
      assert.deepEqual(await handleError({
        error: Object.assign(new Error('expected deserialized failure'), { status: 404 }),
        event,
        status: 500,
        message: 'Expected error'
      }), { message: 'Expected error' })
      pageState.route.id = '/blog/[slug]'
      Sentry.captureException(new Error('client global failure'))
      assert.equal(await Sentry.flush(5_000), true)
      assert.equal(events.length, 2)
      const byMessage = new Map(events.map((event) => [event.exception?.values?.[0].value, event]))
      const hookEvent = byMessage.get('client hook failure')
      assert.deepEqual(hookEvent?.tags, { runtime: 'browser', route: '/gallery', status: '500' })
      assert.equal(hookEvent?.exception?.values?.[0].mechanism?.type, 'auto.function.sveltekit.handle_error')
      assert.equal(hookEvent?.sdk?.name, 'sentry.javascript.sveltekit')
      assert.deepEqual(byMessage.get('client global failure')?.tags, { runtime: 'browser', route: '/blog/[slug]' })
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
