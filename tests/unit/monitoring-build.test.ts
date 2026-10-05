import { afterEach, describe, expect, setDefaultTimeout, test } from 'bun:test'
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { SourceMap } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { brotliDecompressSync, gunzipSync } from 'node:zlib'
import { createSentrySDK } from 'sentry'

import { prepareMonitoringBuild } from '../../scripts/prepare-monitoring'

// Real SDK startup and local HTTP uploads need time to complete on a busy build host.
setDefaultTimeout(15000)

const fixtureDirectories: string[] = []

afterEach(async () => {
  for (const directory of fixtureDirectories.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

async function writeFixtureFile(file: string, content: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, content)
}

async function createBuildFixture(): Promise<{ directory: string; build: string; clientScript: string; serverScript: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'xerrion-monitoring-build-'))
  fixtureDirectories.push(directory)
  const build = join(directory, 'build')
  const source = join(directory, 'src', 'failure.ts')
  const intermediate = join(directory, '.svelte-kit', 'adapter-bun', 'intermediate.js')
  const original = "// Original source\nexport function diagnosticFailure(): never {\n  throw new Error('Synthetic fixture failure')\n}\n"
  const generated = "export function diagnosticFailure(){throw new Error('Synthetic fixture failure')}"
  await writeFixtureFile(source, original)
  await writeFixtureFile(intermediate, generated + '\n//# sourceMappingURL=intermediate.js.map\n')
  await writeFixtureFile(intermediate + '.map', JSON.stringify({
    version: 3,
    file: 'intermediate.js',
    sources: [relative(dirname(intermediate), source)],
    sourcesContent: [original],
    names: [],
    // Generated line 1 maps to original line 3, column 3.
    mappings: 'AAEE'
  }))

  const clientScript = join(build, 'client', '_app', 'immutable', 'entry', 'app.js')
  const serverScript = join(build, 'server', 'chunks', 'hooks.server.js')
  for (const file of [clientScript, serverScript]) {
    await writeFixtureFile(file, '// Final adapter output\n' + generated + `\n//# sourceMappingURL=${file.split('/').at(-1)}.map\n`)
    await writeFixtureFile(file + '.map', JSON.stringify({
      version: 3,
      file: file.split('/').at(-1),
      sources: [relative(dirname(file), intermediate)],
      sourcesContent: [await readFile(intermediate, 'utf8')],
      names: [],
      mappings: ';AAAA'
    }))
  }
  return { directory, build, clientScript, serverScript }
}

describe('monitoring build preparation', () => {
  test('flattens the adapter chain and injects matching debug IDs into browser and server output', async () => {
    const fixture = await createBuildFixture()
    const result = await prepareMonitoringBuild(fixture.build, {})
    expect(result.uploaded).toBe(false)
    expect(result.flattenedMaps).toBe(2)

    for (const script of [fixture.clientScript, fixture.serverScript]) {
      const archived = script === fixture.clientScript
        ? join(fixture.build, 'monitoring', 'client', relative(join(fixture.build, 'client'), script)) + '.map'
        : script + '.map'
      const code = await readFile(script, 'utf8')
      const map = JSON.parse(await readFile(archived, 'utf8'))
      const debugId = map.debug_id ?? map.debugId
      expect(debugId).toMatch(/^[a-f\d-]{36}$/i)
      expect(code).toContain(debugId)
      expect(code).toContain('_sentryDebugIds')
      expect(map.sources).toHaveLength(1)
      expect(map.sources[0]).toEndWith('src/failure.ts')
      expect(map.sourcesContent[0]).toContain("throw new Error('Synthetic fixture failure')")
      const errorLine = code.split('\n').findIndex((line) => line.includes('export function diagnosticFailure'))
      const origin = new SourceMap(map).findEntry(errorLine, 0)
      if (!('originalSource' in origin)) throw new Error('Expected a mapping to the original source.')
      expect(origin.originalLine).toBe(2)
      expect(origin.originalColumn).toBe(2)
      expect(origin.originalSource).toEndWith('src/failure.ts')
    }
    expect(await Bun.file(fixture.clientScript + '.map').exists()).toBe(false)
    expect(await Bun.file(fixture.serverScript + '.map').exists()).toBe(true)
  })

  test('archives every public map variant and refreshes compressed JavaScript while retaining compressed CSS', async () => {
    const fixture = await createBuildFixture()
    for (const extension of ['.gz', '.br']) {
      await writeFixtureFile(fixture.clientScript + extension, 'obsolete compressed JavaScript')
      await writeFixtureFile(fixture.clientScript + '.map' + extension, 'compressed source map')
    }
    const css = join(fixture.build, 'client', '_app', 'theme.css.gz')
    await writeFixtureFile(css, 'compressed CSS')
    const result = await prepareMonitoringBuild(fixture.build, {})
    expect(result.archivedClientMaps).toBe(3)
    expect(result.refreshedCompressedScripts).toBe(2)
    const injectedCode = await readFile(fixture.clientScript, 'utf8')
    expect(injectedCode).toContain('_sentryDebugIds')
    for (const extension of ['.gz', '.br']) {
      const compressed = await readFile(fixture.clientScript + extension)
      const decompressed = extension === '.gz' ? gunzipSync(compressed) : brotliDecompressSync(compressed)
      expect(decompressed.toString('utf8')).toBe(injectedCode)
      expect(await Bun.file(fixture.clientScript + '.map' + extension).exists()).toBe(false)
      expect(await Bun.file(join(fixture.build, 'monitoring', 'client', '_app', 'immutable', 'entry', 'app.js.map' + extension)).exists()).toBe(true)
    }
    expect(await Bun.file(css).exists()).toBe(true)
  })

  test('uses the original Vite map directory after adapter copying and resolves virtual package sources', async () => {
    const fixture = await createBuildFixture()
    const source = join(fixture.directory, 'src', 'failure.ts')
    const copiedMapFile = join(fixture.directory, '.svelte-kit', 'adapter-bun', 'intermediate.js.map')
    const originalMapFile = join(fixture.directory, '.svelte-kit', 'output', 'server', 'intermediate.js.map')
    const virtualPackageSource = join(fixture.directory, 'synthetic-dependency', 'built', 'entry.js')
    await writeFixtureFile(join(fixture.directory, 'node_modules', 'synthetic-dependency', 'package.json'), JSON.stringify({
      name: 'synthetic-dependency', main: 'built/entry.js'
    }))
    await writeFixtureFile(join(fixture.directory, 'node_modules', 'synthetic-dependency', 'built', 'entry.js'), 'exports.ready = true\n')
    const map = JSON.stringify({
      version: 3, file: 'intermediate.js', names: [], mappings: 'AAEE',
      sources: [relative(dirname(originalMapFile), source), relative(dirname(originalMapFile), virtualPackageSource)],
      sourcesContent: [await readFile(source, 'utf8'), null]
    })
    await writeFixtureFile(originalMapFile, map)
    await writeFixtureFile(copiedMapFile, map)
    const result = await prepareMonitoringBuild(fixture.build, {})
    expect(result.flattenedMaps).toBe(2)
    const preparedMap = JSON.parse(await readFile(fixture.serverScript + '.map', 'utf8'))
    const code = await readFile(fixture.serverScript, 'utf8')
    const line = code.split('\n').findIndex((value) => value.includes('export function diagnosticFailure'))
    const origin = new SourceMap(preparedMap).findEntry(line, 0)
    if (!('originalSource' in origin)) throw new Error('Expected a mapping to the original source.')
    expect(resolve(dirname(fixture.serverScript), origin.originalSource)).toBe(source)
    expect(origin.originalLine).toBe(2)
    expect(origin.originalColumn).toBe(2)
  })

  test('prepares the same build twice without changing injected code, IDs, or original source locations', async () => {
    const fixture = await createBuildFixture()
    await prepareMonitoringBuild(fixture.build, {})
    const scripts = [fixture.clientScript, fixture.serverScript]
    const maps = [
      join(fixture.build, 'monitoring', 'client', '_app', 'immutable', 'entry', 'app.js.map'),
      fixture.serverScript + '.map'
    ]
    const codeBefore = await Promise.all(scripts.map((script) => readFile(script, 'utf8')))
    const idsBefore = await Promise.all(maps.map(async (file) => {
      const map = JSON.parse(await readFile(file, 'utf8'))
      return map.debug_id ?? map.debugId
    }))
    const result = await prepareMonitoringBuild(fixture.build, {})
    expect(result.flattenedMaps).toBe(2)
    expect(result.archivedClientMaps).toBe(1)
    expect(await Promise.all(scripts.map((script) => readFile(script, 'utf8')))).toEqual(codeBefore)
    for (const [index, file] of maps.entries()) {
      const map = JSON.parse(await readFile(file, 'utf8'))
      expect(map.debug_id ?? map.debugId).toBe(idsBefore[index])
      const line = codeBefore[index].split('\n').findIndex((value) => value.includes('export function diagnosticFailure'))
      const origin = new SourceMap(map).findEntry(line, 0)
      if (!('originalSource' in origin)) throw new Error('Expected a mapping to the original source.')
      expect(origin.originalSource).toEndWith('src/failure.ts')
      expect(origin.originalLine).toBe(2)
    }
  })

  test('does not upload without a build token and disables SDK telemetry during injection', async () => {
    const fixture = await createBuildFixture()
    let injected = false
    let uploaded = false
    const previousTelemetry = process.env.SENTRY_CLI_NO_TELEMETRY
    const previousConfigDirectory = process.env.SENTRY_CONFIG_DIR
    await prepareMonitoringBuild(fixture.build, {}, (options) => {
      expect(options.url).toBe('http://127.0.0.1')
      expect(options.token).toBeUndefined()
      return { sourcemap: {
        async inject() {
          expect(process.env.SENTRY_CLI_NO_TELEMETRY).toBe('1')
          expect(process.env.DO_NOT_TRACK).toBe('1')
          injected = true
        },
        async upload() { uploaded = true }
      } }
    })
    expect(injected).toBe(true)
    expect(uploaded).toBe(false)
    expect(process.env.SENTRY_CLI_NO_TELEMETRY).toBe(previousTelemetry)
    expect(process.env.SENTRY_CONFIG_DIR).toBe(previousConfigDirectory)
  })

  test.each([false, true])('restores existing SDK configuration and removes only its own directory after injection failure = %j', async (failInjection) => {
    const fixture = await createBuildFixture()
    const originalConfigDirectory = join(fixture.directory, 'original-cli-state')
    const originalState = join(originalConfigDirectory, 'cli.db')
    await writeFixtureFile(originalState, 'Original CLI state fixture')
    const previousConfigDirectory = process.env.SENTRY_CONFIG_DIR
    const previousNoCache = process.env.SENTRY_NO_CACHE
    process.env.SENTRY_CONFIG_DIR = originalConfigDirectory
    let temporaryConfigDirectory: string | undefined
    try {
      const preparation = prepareMonitoringBuild(fixture.build, {}, () => {
        temporaryConfigDirectory = process.env.SENTRY_CONFIG_DIR
        expect(temporaryConfigDirectory).toBeDefined()
        expect(temporaryConfigDirectory).not.toBe(originalConfigDirectory)
        expect(process.env.SENTRY_NO_CACHE).toBe(previousNoCache)
        return { sourcemap: {
          async inject() {
            if (!temporaryConfigDirectory) throw new Error('Expected isolated SDK configuration.')
            await access(temporaryConfigDirectory)
            expect(await Bun.file(originalState).text()).toBe('Original CLI state fixture')
            if (failInjection) throw new Error('Synthetic injection failure')
          },
          async upload() { throw new Error('Unexpected upload') }
        } }
      })
      if (failInjection) await expect(preparation).rejects.toThrow('Source map injection failed. Check the generated build maps.')
      else await preparation
      expect(process.env.SENTRY_CONFIG_DIR).toBe(originalConfigDirectory)
      expect(process.env.SENTRY_NO_CACHE).toBe(previousNoCache)
      if (!temporaryConfigDirectory) throw new Error('Expected isolated SDK configuration.')
      await expect(access(temporaryConfigDirectory)).rejects.toMatchObject({ code: 'ENOENT' })
      expect(await readFile(originalState, 'utf8')).toBe('Original CLI state fixture')
    } finally {
      if (previousConfigDirectory === undefined) delete process.env.SENTRY_CONFIG_DIR
      else process.env.SENTRY_CONFIG_DIR = previousConfigDirectory
    }
  })

  test('requires an explicit instance and slugs before it uses a token', async () => {
    const fixture = await createBuildFixture()
    let created = false
    const createClient = () => {
      created = true
      return { sourcemap: { async inject() {}, async upload() {} } }
    }
    await expect(prepareMonitoringBuild(fixture.build, { SENTRY_AUTH_TOKEN: 'synthetic-build-token' }, createClient))
      .rejects.toThrow('Source map upload requires SENTRY_URL, SENTRY_ORG, and SENTRY_PROJECT.')
    for (const url of ['invalid', 'file:///tmp/example', 'https://user:synthetic-build-token@example.invalid', 'https://example.invalid?token=synthetic-build-token']) {
      await expect(prepareMonitoringBuild(fixture.build, {
        SENTRY_AUTH_TOKEN: 'synthetic-build-token', SENTRY_URL: url, SENTRY_ORG: 'example', SENTRY_PROJECT: 'website'
      }, createClient)).rejects.toThrow('Source map upload requires a valid instance URL and organization and project slugs.')
    }
    expect(created).toBe(false)
  })

  test('passes authentication only to the SDK and reports upload failures without token or API response text', async () => {
    const fixture = await createBuildFixture()
    const token = 'synthetic-build-token'
    const apiError = 'synthetic private API response'
    let injected = false
    try {
      await prepareMonitoringBuild(fixture.build, {
        SENTRY_AUTH_TOKEN: token, SENTRY_URL: 'https://errors.example.invalid', SENTRY_ORG: 'example',
        SENTRY_PROJECT: 'website', PUBLIC_SENTRY_RELEASE: 'test-release'
      }, (options) => {
        expect(options).toMatchObject({ token, url: 'https://errors.example.invalid', org: 'example', project: 'website' })
        return { sourcemap: {
          async inject() { injected = true },
          async upload(parameters) {
            expect(injected).toBe(true)
            expect(parameters).toEqual({ directory: fixture.build, release: 'test-release' })
            expect(JSON.stringify(parameters)).not.toContain(token)
            throw new Error(token + ' ' + apiError)
          }
        } }
      })
      throw new Error('Upload unexpectedly succeeded')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      if (!(error instanceof Error)) throw error
      expect(error.message).toBe('Source map upload failed. Check the instance settings and build token.')
      expect(error.message).not.toContain(token)
      expect(error.message).not.toContain(apiError)
    }
  })

  test('accepts a positive upload count and keeps injected IDs and JavaScript bytes stable on reinjection', async () => {
    const fixture = await createBuildFixture()
    const scripts = [fixture.clientScript, fixture.serverScript]
    const result = await prepareMonitoringBuild(fixture.build, {
      SENTRY_AUTH_TOKEN: 'synthetic-build-token', SENTRY_URL: 'http://127.0.0.1',
      SENTRY_ORG: 'example', SENTRY_PROJECT: 'website'
    }, (options) => {
      const client = createSentrySDK(options)
      return { sourcemap: {
        inject: (parameters) => client.sourcemap.inject(parameters),
        async upload(parameters) {
          const before = await Promise.all(scripts.map((script) => readFile(script, 'utf8')))
          const mapsBefore = await Promise.all(scripts.map((script) => readFile(script + '.map', 'utf8')))
          await client.sourcemap.inject({ directory: parameters.directory })
          expect(await Promise.all(scripts.map((script) => readFile(script, 'utf8')))).toEqual(before)
          expect(await Promise.all(scripts.map((script) => readFile(script + '.map', 'utf8')))).toEqual(mapsBefore)
          return { filesUploaded: 4 }
        }
      } }
    })
    expect(result.uploaded).toBe(true)
  })

  test.each([undefined, { filesUploaded: 0 }])('rejects an upload without a positive file count: %j', async (uploadResult) => {
    const fixture = await createBuildFixture()
    await expect(prepareMonitoringBuild(fixture.build, {
      SENTRY_AUTH_TOKEN: 'synthetic-build-token', SENTRY_URL: 'http://127.0.0.1',
      SENTRY_ORG: 'example', SENTRY_PROJECT: 'website'
    }, () => ({ sourcemap: {
      async inject() {},
      async upload() { return uploadResult }
    } }))).rejects.toThrow('Source map upload failed. Check the instance settings and build token.')
  })

  test('fails the build with fixed output when a token has incomplete upload settings', async () => {
    const fixture = await createBuildFixture()
    const token = 'synthetic-build-token'
    const processResult = Bun.spawn([process.execPath, '--no-env-file', resolve('scripts/prepare-monitoring.ts')], {
      cwd: fixture.directory,
      env: { PATH: process.env.PATH, SENTRY_AUTH_TOKEN: token },
      stdout: 'pipe',
      stderr: 'pipe'
    })
    const [exitCode, stdout, stderr] = await Promise.all([
      processResult.exited, new Response(processResult.stdout).text(), new Response(processResult.stderr).text()
    ])
    expect(exitCode).toBe(1)
    expect(stdout).toBe('')
    expect(stderr.trim()).toBe('Source map upload requires SENTRY_URL, SENTRY_ORG, and SENTRY_PROJECT.')
    expect(stdout + stderr).not.toContain(token)
  })

  test('contains real SDK upload failures without printing authentication or private API response text', async () => {
    const fixture = await createBuildFixture()
    const token = 'synthetic-build-token'
    const privateResponse = 'Synthetic private API response content'
    let requests = 0
    const api = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch() {
        requests++
        return Response.json({ detail: privateResponse + ' ' + token }, { status: 403 })
      }
    })
    try {
      const processResult = Bun.spawn([process.execPath, '--no-env-file', resolve('scripts/prepare-monitoring.ts')], {
        cwd: fixture.directory,
        env: {
          PATH: process.env.PATH,
          SENTRY_AUTH_TOKEN: token,
          SENTRY_URL: `http://127.0.0.1:${api.port}`,
          SENTRY_ORG: 'example',
          SENTRY_PROJECT: 'website',
          SENTRY_CONFIG_DIR: join(fixture.directory, 'cli-state')
        },
        stdout: 'pipe',
        stderr: 'pipe'
      })
      const [exitCode, stdout, stderr] = await Promise.all([
        processResult.exited, new Response(processResult.stdout).text(), new Response(processResult.stderr).text()
      ])
      expect(requests).toBeGreaterThan(0)
      expect(exitCode).toBe(1)
      expect(stdout).toBe('')
      expect(stderr.trim()).toBe('Source map upload failed. Check the instance settings and build token.')
      expect(stdout + stderr).not.toContain(token)
      expect(stdout + stderr).not.toContain(privateResponse)
    } finally {
      api.stop(true)
    }
  })

  test('uploads through the real SDK transport twice with fresh isolated configuration and cleans up both directories', async () => {
    const fixture = await createBuildFixture()
    const token = 'synthetic-build-token'
    const requests: string[] = []
    const uploadedChunks = new Set<string>()
    let uploadedBytes = 0
    const api = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      async fetch(request): Promise<Response> {
        const path = new URL(request.url).pathname
        requests.push(request.method + ' ' + path)
        if (request.method === 'GET' && path === '/api/0/organizations/example/') {
          return Response.json({ slug: 'example', links: { regionUrl: `http://127.0.0.1:${api.port}` } })
        }
        if (request.method === 'GET' && path === '/api/0/organizations/example/chunk-upload/') {
          return Response.json({
            url: `http://127.0.0.1:${api.port}/api/0/organizations/example/chunk-upload/`,
            chunkSize: 33554432, chunksPerRequest: 1, maxRequestSize: 33554432,
            hashAlgorithm: 'sha1', concurrency: 1, compression: ['gzip'], maxFileSize: 4294967296, maxWait: 300
          })
        }
        if (request.method === 'POST' && path === '/api/0/organizations/example/chunk-upload/') {
          const file = (await request.formData()).get('file_gzip')
          if (!(file instanceof File)) return Response.json({ detail: 'Invalid synthetic chunk' }, { status: 400 })
          uploadedChunks.add(file.name)
          uploadedBytes += gunzipSync(new Uint8Array(await file.arrayBuffer())).byteLength
          return Response.json({})
        }
        if (request.method === 'POST' && path === '/api/0/organizations/example/artifactbundle/assemble/') {
          const body = await request.json() as { chunks: string[]; projects: string[] }
          if (body.projects.length !== 1 || body.projects[0] !== 'website') {
            return Response.json({ detail: 'Invalid synthetic project' }, { status: 400 })
          }
          const missingChunks = body.chunks.filter((checksum) => !uploadedChunks.has(checksum))
          return Response.json({ state: missingChunks.length ? 'not_found' : 'created', missingChunks })
        }
        return Response.json({ detail: 'Unexpected synthetic endpoint' }, { status: 404 })
      }
    })
    const runner = join(fixture.directory, 'transport.ts')
    const originalConfigDirectory = join(fixture.directory, 'original-cli-state')
    await writeFixtureFile(join(originalConfigDirectory, 'cli.db'), 'Original CLI state fixture')
    await writeFile(runner, `
      import { prepareMonitoringBuild } from ${JSON.stringify(resolve('scripts/prepare-monitoring.ts'))}
      import { createSentrySDK } from ${JSON.stringify(resolve('node_modules/sentry/dist/index.mjs'))}
      import { existsSync } from 'node:fs'
      const originalConfigDirectory = process.env.SENTRY_CONFIG_DIR
      const configurations: string[] = []
      const results = []
      const realFetch = globalThis.fetch
      const guardedFetch = async (input, options) => {
        const target = new URL(input instanceof Request ? input.url : input.toString())
        if (target.origin !== process.env.SENTRY_URL) throw new Error('Only the local fixture API is allowed.')
        return realFetch(input, options)
      }
      guardedFetch.preconnect = realFetch.preconnect
      globalThis.fetch = guardedFetch
      for (let attempt = 0; attempt < 2; attempt++) {
        results.push(await prepareMonitoringBuild(process.argv[2], process.env, (options) => {
          configurations.push(process.env.SENTRY_CONFIG_DIR!)
          return createSentrySDK(options)
        }))
      }
      console.log(JSON.stringify({
        uploaded: results.every((result) => result.uploaded),
        restored: process.env.SENTRY_CONFIG_DIR === originalConfigDirectory,
        unique: new Set(configurations).size === 2,
        removed: configurations.every((directory) => !existsSync(directory))
      }))
    `)
    try {
      const processResult = Bun.spawn([process.execPath, '--no-env-file', runner, fixture.build], {
        cwd: fixture.directory,
        env: {
          PATH: process.env.PATH, SENTRY_AUTH_TOKEN: token,
          SENTRY_URL: `http://127.0.0.1:${api.port}`, SENTRY_ORG: 'example', SENTRY_PROJECT: 'website',
          SENTRY_CONFIG_DIR: originalConfigDirectory, XDG_CACHE_HOME: join(fixture.directory, 'api-cache')
        },
        stdout: 'pipe',
        stderr: 'pipe'
      })
      const [exitCode, stdout, stderr] = await Promise.all([
        processResult.exited, new Response(processResult.stdout).text(), new Response(processResult.stderr).text()
      ])
      expect(exitCode).toBe(0)
      expect(stderr).toBe('')
      expect(JSON.parse(stdout)).toEqual({ uploaded: true, restored: true, unique: true, removed: true })
      expect(requests).toContain('GET /api/0/organizations/example/chunk-upload/')
      expect(requests.filter((request) => request === 'POST /api/0/organizations/example/artifactbundle/assemble/').length).toBeGreaterThanOrEqual(2)
      expect(requests).toContain('POST /api/0/organizations/example/chunk-upload/')
      expect(uploadedBytes).toBeGreaterThan(0)
      expect(await readFile(join(originalConfigDirectory, 'cli.db'), 'utf8')).toBe('Original CLI state fixture')
      expect(await Bun.file(fixture.clientScript + '.map').exists()).toBe(false)
      expect(await Bun.file(join(fixture.build, 'monitoring', 'client', relative(join(fixture.build, 'client'), fixture.clientScript)) + '.map').exists()).toBe(true)
      expect(stdout + stderr).not.toContain(token)
    } finally {
      api.stop(true)
    }
  }, 30000)

  test('rejects malformed build maps with fixed diagnostics', async () => {
    const fixture = await createBuildFixture()
    await writeFile(fixture.serverScript + '.map', 'Synthetic malformed map with private content')
    await expect(prepareMonitoringBuild(fixture.build, {}))
      .rejects.toThrow('Source map preparation failed. Check the generated build map chain.')
  })

  test('fails safely when a dependency map cannot be resolved instead of losing application mappings', async () => {
    const fixture = await createBuildFixture()
    const mapFile = fixture.clientScript + '.map'
    const map = JSON.parse(await readFile(mapFile, 'utf8'))
    map.sourcesContent[0] = "export const dependency = true\n//# sourceMappingURL=missing-dependency.js.map\n"
    await writeFile(mapFile, JSON.stringify(map))
    await expect(prepareMonitoringBuild(fixture.build, {}, createSentrySDK))
      .rejects.toThrow('Source map preparation failed. Check the generated build map chain.')
  })
})
