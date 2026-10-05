import type { BrowserOptions, ErrorEvent, Exception, StackFrame } from '@sentry/sveltekit'

export interface MonitoringConfig {
  dsn?: string
  environment?: string
  release?: string
}

export interface MonitoringOptions extends Pick<BrowserOptions, 'environment' | 'release' | 'dataCollection'> {
  dsn: string | undefined
  enabled: boolean
  debug: false
  defaultIntegrations: false
  sendClientReports: false
  maxBreadcrumbs: 0
  beforeBreadcrumb: () => null
  tracesSampler: () => 0
  tracePropagationTargets: never[]
  beforeSend: typeof sanitizeErrorEvent
  beforeSendLog: () => null
  beforeSendMetric: () => null
}

function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value)
    url.username = ''
    url.password = ''
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) return '[invalid URL]'
    return value.split(/[?#]/, 1)[0]
  }
}

function sanitizeText(value: string | undefined): string | undefined {
  return value?.replace(/\b[a-z][a-z\d+.-]*:\/\/[^\s"'<>]+/gi, sanitizeUrl)
}

function sanitizeFrame(frame: StackFrame): StackFrame {
  const applicationSource = frame.in_app === true && /\/(?:src|build\/server)\//.test(frame.filename ?? '')
  const context = applicationSource
    ? {
        context_line: sanitizeText(frame.context_line)?.slice(0, 300),
        pre_context: frame.pre_context?.slice(-5).map((line) => sanitizeText(line)?.slice(0, 300) ?? ''),
        post_context: frame.post_context?.slice(0, 5).map((line) => sanitizeText(line)?.slice(0, 300) ?? '')
      }
    : {}

  return {
    filename: frame.filename === undefined ? undefined : sanitizeUrl(frame.filename),
    abs_path: frame.abs_path === undefined ? undefined : sanitizeUrl(frame.abs_path),
    function: sanitizeText(frame.function),
    module: sanitizeText(frame.module),
    lineno: frame.lineno,
    colno: frame.colno,
    in_app: frame.in_app,
    platform: frame.platform,
    debug_id: frame.debug_id,
    ...context
  }
}

function sanitizeException(exception: Exception): Exception {
  return {
    type: sanitizeText(exception.type),
    value: sanitizeText(exception.value),
    module: sanitizeText(exception.module),
    stacktrace: exception.stacktrace
      ? { frames: exception.stacktrace.frames?.map(sanitizeFrame) }
      : undefined,
    mechanism: exception.mechanism
      ? {
          type: exception.mechanism.type,
          handled: exception.mechanism.handled,
          synthetic: exception.mechanism.synthetic,
          is_exception_group: exception.mechanism.is_exception_group,
          exception_id: exception.mechanism.exception_id,
          parent_id: exception.mechanism.parent_id
        }
      : undefined
  }
}

function sanitizeTags(tags: ErrorEvent['tags']): ErrorEvent['tags'] {
  if (!tags) return undefined

  const safeTags: NonNullable<ErrorEvent['tags']> = {}
  for (const key of ['runtime', 'route', 'status']) {
    const value = tags[key]
    if (value !== undefined) safeTags[key] = typeof value === 'string' ? sanitizeText(value) : value
  }
  return safeTags
}

/** Keep error diagnostics while excluding request payloads and authentication data. */
export function sanitizeErrorEvent(event: ErrorEvent): ErrorEvent | null {
  if (event.type !== undefined) return null

  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    level: event.level,
    platform: event.platform,
    release: event.release,
    environment: event.environment,
    message: sanitizeText(event.message),
    exception: event.exception
      ? { values: event.exception.values?.map(sanitizeException) }
      : undefined,
    sdk: event.sdk
      ? {
          name: event.sdk.name,
          version: event.sdk.version,
          integrations: event.sdk.integrations,
          packages: event.sdk.packages,
          settings: { infer_ip: 'never' }
        }
      : undefined,
    debug_meta: event.debug_meta
      ? {
          images: event.debug_meta.images
            ?.filter((image) => image.type === 'sourcemap')
            .map((image) => ({
              type: image.type,
              debug_id: image.debug_id,
              code_file: sanitizeUrl(image.code_file)
            }))
        }
      : undefined,
    tags: sanitizeTags(event.tags),
    request: event.request
      ? {
          url: event.request.url === undefined ? undefined : sanitizeUrl(event.request.url),
          method: event.request.method
        }
      : undefined
  }
}

/** Shared error-only settings for browser and server reporting. */
export function createMonitoringOptions(config: MonitoringConfig): MonitoringOptions {
  const dsn = config.dsn?.trim() || undefined

  return {
    dsn,
    enabled: Boolean(dsn),
    debug: false,
    environment: config.environment,
    release: config.release,
    defaultIntegrations: false,
    sendClientReports: false,
    maxBreadcrumbs: 0 as const,
    beforeBreadcrumb: () => null,
    tracesSampler: () => 0 as const,
    tracePropagationTargets: [],
    beforeSend: sanitizeErrorEvent,
    beforeSendLog: () => null,
    beforeSendMetric: () => null,
    dataCollection: {
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
    }
  } satisfies BrowserOptions
}
