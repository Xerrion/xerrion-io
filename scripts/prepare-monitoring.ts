import { access, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { createSentrySDK, type SentryOptions } from 'sentry'
import * as sorcery from 'sorcery'

interface SourceMapClient {
  sourcemap: {
    inject(params: { directory: string }): Promise<unknown>
    upload(params: { directory: string; release?: string }): Promise<unknown>
  }
}

type SourceMapClientFactory = (options: SentryOptions) => SourceMapClient

export interface MonitoringBuildResult {
  uploaded: boolean
  flattenedMaps: number
  archivedClientMaps: number
  refreshedCompressedScripts: number
}

class MonitoringBuildError extends Error {}

function getUploadOptions(environment: NodeJS.ProcessEnv): SentryOptions | null {
  const token = environment.SENTRY_AUTH_TOKEN?.trim()
  if (!token) return null

  const url = environment.SENTRY_URL?.trim()
  const org = environment.SENTRY_ORG?.trim()
  const project = environment.SENTRY_PROJECT?.trim()
  if (!url || !org || !project) {
    throw new MonitoringBuildError('Source map upload requires SENTRY_URL, SENTRY_ORG, and SENTRY_PROJECT.')
  }

  try {
    const target = new URL(url)
    if (
      !['http:', 'https:'].includes(target.protocol) ||
      target.username || target.password || target.search || target.hash ||
      !/^[a-z\d][a-z\d_-]*$/i.test(org) ||
      !/^[a-z\d][a-z\d_-]*$/i.test(project)
    ) throw new Error()
  } catch {
    throw new MonitoringBuildError('Source map upload requires a valid instance URL and organization and project slugs.')
  }

  return { token, url, org, project }
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await listFiles(path))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

function isSourceMap(value: unknown): value is sorcery.InputSourceMap {
  return typeof value === 'object' && value !== null &&
    'version' in value && value.version === 3 &&
    'sources' in value && Array.isArray(value.sources) && value.sources.every((source) => typeof source === 'string') &&
    'names' in value && Array.isArray(value.names) && value.names.every((name) => typeof name === 'string') &&
    'mappings' in value && typeof value.mappings === 'string' &&
    (!('sourceRoot' in value) || typeof value.sourceRoot === 'string') &&
    (!('sourcesContent' in value) || Array.isArray(value.sourcesContent) &&
      value.sourcesContent.every((content) => content === null || typeof content === 'string'))
}

function parseSourceMap(content: string): sorcery.InputSourceMap {
  const map: unknown = JSON.parse(content)
  if (!isSourceMap(map)) throw new Error('Invalid generated source map.')
  return map
}

async function readSourceMap(file: string): Promise<sorcery.InputSourceMap> {
  return parseSourceMap(await readFile(file, 'utf8'))
}

async function restoreArchivedClientMaps(directory: string): Promise<void> {
  const archiveDirectory = join(directory, 'monitoring', 'client')
  let files: string[]
  try {
    files = await listFiles(archiveDirectory)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return
    throw error
  }
  for (const file of files) {
    if (!/\.map(?:\.(?:gz|br))?$/.test(file)) continue
    const destination = join(directory, 'client', relative(archiveDirectory, file))
    await mkdir(dirname(destination), { recursive: true })
    try {
      await access(destination)
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
      await rename(file, destination)
    }
  }
}

async function copiedSourceMaps(directory: string): Promise<Record<string, sorcery.InputSourceMap>> {
  const cache: Record<string, sorcery.InputSourceMap> = {}
  const projectDirectory = dirname(directory)
  const resolveModule = createRequire(join(projectDirectory, 'package.json')).resolve
  const copiedServerDirectory = join(projectDirectory, '.svelte-kit', 'adapter-bun')
  const originalServerDirectory = join(projectDirectory, '.svelte-kit', 'output', 'server')
  const copiedClientDirectory = join(directory, 'client')
  const originalClientDirectory = join(projectDirectory, '.svelte-kit', 'output', 'client')
  for (const [copiedDirectory, originalDirectory] of [
    [copiedServerDirectory, originalServerDirectory],
    [copiedClientDirectory, originalClientDirectory]
  ]) {
    let files: string[]
    try {
      files = await listFiles(copiedDirectory)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') continue
      throw error
    }
    for (const file of files) {
      if (!/\.(?:js|mjs|cjs)\.map$/.test(file)) continue
      const originalFile = join(originalDirectory, relative(copiedDirectory, file))
      let originalMap: sorcery.InputSourceMap
      try {
        originalMap = await readSourceMap(originalFile)
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') continue
        throw error
      }
      const map = await readSourceMap(file)
      if (copiedDirectory === copiedClientDirectory &&
        (JSON.stringify(map.sources) !== JSON.stringify(originalMap.sources) || map.sourceRoot !== originalMap.sourceRoot)) {
        // A previous run already flattened this map relative to its deployed file.
        continue
      }
      const sources = await Promise.all(map.sources.map(async (source, index) => {
        const resolved = resolve(dirname(originalFile), map.sourceRoot ?? '', source)
        if (map.sourcesContent?.[index] !== null && map.sourcesContent?.[index] !== undefined) return resolved
        try {
          await access(resolved)
          return resolved
        } catch (error) {
          if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
          // Sentry instrumentation can use a package-relative virtual source without embedded content.
          return resolveModule(relative(projectDirectory, resolved))
        }
      }))
      cache[file.slice(0, -4)] = {
        ...map,
        sourceRoot: '',
        // Copying the Vite output changes directory depth. Resolve before Sorcery follows the chain.
        sources
      }
    }
  }
  return cache
}

async function flattenSourceMaps(directory: string): Promise<number> {
  let flattenedMaps = 0
  try {
    const sourcemaps = await copiedSourceMaps(directory)
    for (const file of await listFiles(directory)) {
      if (!/\.(?:js|mjs|cjs)$/.test(file)) continue
      const chain = await sorcery.load(file, { sourcemaps })
      if (!chain) continue
      const code = await readFile(file, 'utf8')
      const debugId = /(?:^|\n)\/\/# debugId=([a-f\d-]{36})(?:\r?\n|$)/i.exec(code)?.[1]
      const map = parseSourceMap(chain.apply().toString())
      // Sorcery removes extension metadata. Existing SDK injection must retain its map association.
      await writeFile(file + '.map', JSON.stringify(debugId ? { ...map, debug_id: debugId } : map))
      flattenedMaps++
    }
  } catch {
    throw new MonitoringBuildError('Source map preparation failed. Check the generated build map chain.')
  }
  return flattenedMaps
}

/** Inject final adapter output, upload when configured, and keep maps outside the public asset directory. */
export async function prepareMonitoringBuild(
  buildDirectory = 'build',
  environment: NodeJS.ProcessEnv = process.env,
  createClient: SourceMapClientFactory = createSentrySDK
): Promise<MonitoringBuildResult> {
  const uploadOptions = getUploadOptions(environment)
  const directory = resolve(buildDirectory)
  const previousTelemetry = process.env.SENTRY_CLI_NO_TELEMETRY
  const previousDoNotTrack = process.env.DO_NOT_TRACK
  // The SDK checks these values when it executes a command, including local injection.
  process.env.SENTRY_CLI_NO_TELEMETRY = '1'
  process.env.DO_NOT_TRACK = '1'

  try {
    await restoreArchivedClientMaps(directory)
    // Match Sentry's SvelteKit plugin: resolve the adapter's second compilation back to the original source.
    const flattenedMaps = await flattenSourceMaps(directory)
    // Local injection needs no credentials. An explicit inert URL prevents stored SaaS defaults.
    const client = createClient({ ...(uploadOptions ?? { url: 'http://127.0.0.1' }), cwd: directory })
    try {
      await client.sourcemap.inject({ directory })
    } catch {
      throw new MonitoringBuildError('Source map injection failed. Check the generated build maps.')
    }

    if (uploadOptions) {
      try {
        const result = await client.sourcemap.upload({
          directory,
          release: environment.PUBLIC_SENTRY_RELEASE?.trim() || undefined
        })
        if (
          typeof result !== 'object' || result === null || !('filesUploaded' in result) ||
          typeof result.filesUploaded !== 'number' || !Number.isInteger(result.filesUploaded) || result.filesUploaded <= 0
        ) throw new Error()
      } catch {
        throw new MonitoringBuildError('Source map upload failed. Check the instance settings and build token.')
      }
    }

    const files = await listFiles(directory)
    const clientDirectory = join(directory, 'client')
    const archiveDirectory = join(directory, 'monitoring', 'client')
    let archivedClientMaps = 0
    let refreshedCompressedScripts = 0
    for (const file of files) {
      if (/\.(?:js|mjs|cjs)\.(?:gz|br)$/.test(file)) {
        // Adapter compression precedes injection. Refresh these copies with the injected JavaScript.
        const code = await readFile(file.replace(/\.(?:gz|br)$/, ''))
        const compressed = file.endsWith('.gz')
          ? gzipSync(code, { level: constants.Z_BEST_COMPRESSION })
          : brotliCompressSync(code, { params: {
              [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
              [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
              [constants.BROTLI_PARAM_SIZE_HINT]: code.byteLength
            } })
        await writeFile(file, compressed)
        refreshedCompressedScripts++
      } else if (file.startsWith(clientDirectory + sep) && /\.map(?:\.(?:gz|br))?$/.test(file)) {
        const destination = join(archiveDirectory, relative(clientDirectory, file))
        await mkdir(dirname(destination), { recursive: true })
        await rename(file, destination)
        archivedClientMaps++
      }
    }

    return { uploaded: uploadOptions !== null, flattenedMaps, archivedClientMaps, refreshedCompressedScripts }
  } finally {
    if (previousTelemetry === undefined) delete process.env.SENTRY_CLI_NO_TELEMETRY
    else process.env.SENTRY_CLI_NO_TELEMETRY = previousTelemetry
    if (previousDoNotTrack === undefined) delete process.env.DO_NOT_TRACK
    else process.env.DO_NOT_TRACK = previousDoNotTrack
  }
}

if (import.meta.main) {
  try {
    const result = await prepareMonitoringBuild()
    console.log(result.uploaded
      ? 'Monitoring source maps were uploaded. Public source maps were removed.'
      : 'Monitoring source maps are prepared. Upload skipped because SENTRY_AUTH_TOKEN is not set.')
  } catch (error) {
    console.error(error instanceof MonitoringBuildError
      ? error.message
      : 'Monitoring build preparation failed.')
    process.exitCode = 1
  }
}
