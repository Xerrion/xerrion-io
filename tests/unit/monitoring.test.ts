import { describe, expect, test } from 'bun:test'
import type { ErrorEvent } from '@sentry/sveltekit'

import { createMonitoringOptions, sanitizeErrorEvent } from '$lib/monitoring'

describe('Error reporting settings', () => {
  test('disables reporting when no DSN is configured', () => {
    for (const dsn of [undefined, '', '   ']) {
      const options = createMonitoringOptions({ dsn })
      expect(options.enabled).toBe(false)
      expect(options.dsn).toBeUndefined()
    }
  })

  test('uses the configured endpoint, environment and release', () => {
    const options = createMonitoringOptions({
      dsn: ' https://public@example.test/3 ',
      environment: 'preview',
      release: 'test-release'
    })

    expect(options.enabled).toBe(true)
    expect(options.dsn).toBe('https://public@example.test/3')
    expect(options.environment).toBe('preview')
    expect(options.release).toBe('test-release')
  })

  test('rejects breadcrumbs, traces, logs and metrics', () => {
    const options = createMonitoringOptions({ dsn: 'https://public@example.test/3' })

    expect(options.defaultIntegrations).toBe(false)
    expect(options.debug).toBe(false)
    expect(options.sendClientReports).toBe(false)
    expect(options.maxBreadcrumbs).toBe(0)
    expect(options.beforeBreadcrumb()).toBeNull()
    expect(options.tracesSampler()).toBe(0)
    expect(options.tracePropagationTargets).toEqual([])
    expect(options.beforeSendLog()).toBeNull()
    expect(options.beforeSendMetric()).toBeNull()
  })

  test('explicitly disables SDK collection of private data', () => {
    expect(createMonitoringOptions({}).dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 0
    })
  })
})

describe('Error event privacy', () => {
  test('keeps useful diagnostics for an ordinary application error', () => {
    const event: ErrorEvent = {
      type: undefined,
      event_id: 'test-event-id',
      timestamp: 123,
      platform: 'javascript',
      level: 'error',
      release: 'test-release',
      environment: 'preview',
      message: 'Gallery query failed',
      sdk: { name: 'sentry.javascript.bun', version: '11.4.0', integrations: ['LinkedErrors'] },
      tags: { runtime: 'bun', route: '/gallery', status: 500 },
      exception: {
        values: [{
          type: 'TypeError',
          value: 'Gallery query failed',
          mechanism: { type: 'generic', handled: true },
          stacktrace: {
            frames: [{ filename: '/app/build/server.js', function: 'loadGallery', lineno: 12, colno: 4, in_app: true }]
          }
        }]
      }
    }

    expect(sanitizeErrorEvent(event)).toMatchObject(event)
  })

  test('removes users, request payloads, unrestricted context and breadcrumbs', () => {
    const event: ErrorEvent = {
      type: undefined,
      user: { id: 'private-user', email: 'private@example.test', ip_address: '192.0.2.1' },
      request: {
        url: 'https://username:password@example.test/admin/callback?code=private-code&state=private-state#private-fragment',
        method: 'POST',
        headers: { authorization: 'Bearer private-token', cookie: 'session=private-cookie' },
        cookies: { session: 'private-cookie' },
        data: { password: 'private-body' },
        query_string: 'code=private-code'
      },
      extra: { form: 'private-form' },
      contexts: { auth: { state: 'private-state' } },
      breadcrumbs: [{ message: 'private-breadcrumb', data: { token: 'private-token' } }],
      tags: { runtime: 'bun', route: '/admin/callback', status: '500', email: 'private@example.test' },
      transaction: '/admin/callback?code=private-code',
      server_name: 'private-server'
    }
    const original = structuredClone(event)
    const result = sanitizeErrorEvent(event)

    expect(result?.request).toEqual({ url: 'https://example.test/admin/callback', method: 'POST' })
    expect(result?.tags).toEqual({ runtime: 'bun', route: '/admin/callback', status: '500' })
    for (const key of ['user', 'extra', 'contexts', 'breadcrumbs', 'transaction', 'server_name']) {
      expect(result).not.toHaveProperty(key)
    }
    expect(JSON.stringify(result)).not.toContain('private')
    expect(event).toEqual(original)
  })

  test('keeps the SDK instruction to suppress IP inference', () => {
    const result = sanitizeErrorEvent({
      type: undefined,
      sdk: { name: 'sentry.javascript.browser', version: '11.4.0', settings: { infer_ip: 'auto' } }
    })

    expect(result?.sdk?.settings).toEqual({ infer_ip: 'never' })
  })

  test('scrubs authentication URLs in messages and exception values', () => {
    const event: ErrorEvent = {
      type: undefined,
      message: 'Fetch https://user:password@example.test/auth?code=private-code&state=private-state#private-fragment failed',
      exception: { values: [{ type: 'Error', value: 'Callback failed for https://example.test/admin/callback?code=private-code' }] }
    }

    const result = sanitizeErrorEvent(event)
    expect(result?.message).toBe('Fetch https://example.test/auth failed')
    expect(result?.exception?.values?.[0].value).toBe('Callback failed for https://example.test/admin/callback')
    expect(JSON.stringify(result)).not.toContain('private')
  })

  test('scrubs credentials in database connection URLs inside error text', () => {
    const result = sanitizeErrorEvent({
      type: undefined,
      message: 'Connection failed: postgres://username:private-password@example.test/database?token=private-token'
    })

    expect(result?.message).toBe('Connection failed: postgres://example.test/database')
    expect(JSON.stringify(result)).not.toContain('private')
  })

  test('removes malformed URLs that could contain credentials', () => {
    const result = sanitizeErrorEvent({
      type: undefined,
      message: 'Connection failed: postgres://alice:example-password@db:bad-port/database?token=example-token'
    })

    expect(result?.message).toBe('Connection failed: [invalid URL]')
    expect(JSON.stringify(result)).not.toContain('example-password')
    expect(JSON.stringify(result)).not.toContain('example-token')
  })

  test('scrubs absolute and relative frame URLs and excludes source lines and variables', () => {
    const event: ErrorEvent = {
      type: undefined,
      exception: { values: [{
        value: 'Example error',
        mechanism: { type: 'generic', handled: true, data: { token: 'private-token' } },
        stacktrace: { frames: [{
          filename: 'https://username:password@example.test/_app/main.js?code=private-code#private-fragment',
          abs_path: '/_app/main.js?state=private-state#private-fragment',
          function: 'handleCallback',
          lineno: 42,
          colno: 7,
          vars: { password: 'private-password' },
          context_line: 'const password = "private-password"',
          pre_context: ['private-before'],
          post_context: ['private-after']
        }] }
      }] }
    }

    const result = sanitizeErrorEvent(event)
    expect(result?.exception?.values?.[0].stacktrace?.frames?.[0]).toMatchObject({
      filename: 'https://example.test/_app/main.js',
      abs_path: '/_app/main.js',
      function: 'handleCallback',
      lineno: 42,
      colno: 7
    })
    expect(JSON.stringify(result)).not.toContain('private')
    expect(result?.exception?.values?.[0].mechanism).not.toHaveProperty('data')
  })

  test('drops non-error events if they reach the error sanitizer', () => {
    expect(sanitizeErrorEvent({ type: 'transaction' } as unknown as ErrorEvent)).toBeNull()
  })

  test('keeps bounded application source context without local variables', () => {
    const result = sanitizeErrorEvent({
      type: undefined,
      exception: { values: [{ stacktrace: { frames: [{
        filename: '/app/build/server/chunks/gallery.js',
        in_app: true,
        context_line: 'throw new Error("Gallery query failed")',
        pre_context: Array.from({ length: 8 }, (_, index) => `before ${index}`),
        post_context: Array.from({ length: 8 }, (_, index) => `after ${index}`),
        vars: { session: 'private-session' }
      }] } }] }
    })
    const frame = result?.exception?.values?.[0].stacktrace?.frames?.[0]

    expect(frame?.context_line).toBe('throw new Error("Gallery query failed")')
    expect(frame?.pre_context).toEqual(['before 3', 'before 4', 'before 5', 'before 6', 'before 7'])
    expect(frame?.post_context).toEqual(['after 0', 'after 1', 'after 2', 'after 3', 'after 4'])
    expect(frame).not.toHaveProperty('vars')
  })

  test('keeps source map debug IDs without URL credentials or query parameters', () => {
    const result = sanitizeErrorEvent({
      type: undefined,
      debug_meta: { images: [{
        type: 'sourcemap',
        debug_id: 'test-debug-id',
        code_file: 'https://username:private-password@example.test/_app/main.js?token=private-token#private-fragment'
      }] }
    })

    expect(result?.debug_meta?.images).toEqual([{
      type: 'sourcemap',
      debug_id: 'test-debug-id',
      code_file: 'https://example.test/_app/main.js'
    }])
    expect(JSON.stringify(result)).not.toContain('private')
  })
})
