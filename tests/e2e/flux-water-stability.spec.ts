import { compute } from '../../src/lib/experiments/flux-water/shaders'
import { waterTimestep } from '../../src/lib/experiments/flux-water/settings'
import { test, expect } from './public-fixtures'

// The bundled DOM types omit the WebGPU flag constants.
declare const GPUBufferUsage: { readonly UNIFORM: number; readonly COPY_DST: number; readonly MAP_READ: number }
declare const GPUTextureUsage: { readonly TEXTURE_BINDING: number; readonly STORAGE_BINDING: number; readonly COPY_SRC: number }
declare const GPUShaderStage: { readonly COMPUTE: number }
declare const GPUMapMode: { readonly READ: number }

for (const width of [320, 448]) test(`water at ${width}px stays smooth through 3600 uneven frames`, async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await page.goto('/tools')
  let remainder = 0
  const timings = Array.from({ length: 3600 }, (_, frame) => {
    const timing = waterTimestep(frame % 2 ? 17 : 16, remainder)
    remainder = timing.remainder
    return { dt: timing.steps ? timing.elapsed / timing.steps : 0, steps: timing.steps }
  })
  const measurements = await page.evaluate(async ({ code, timings, width }) => {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) throw new Error('A real WebGPU adapter is required for the stability check.')
    const device = await adapter.requestDevice()
    const errors: string[] = []
    device.addEventListener('uncapturederror', event => { event.preventDefault(); errors.push(event.error.message) })
    const height = width * 3 / 4
    const format = 'rgba16float'
    const bytesPerPixel = 8
    const buffer = device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' })
    const layout = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, sampler: { type: 'filtering' } }
    ] })
    const pipeline = await device.createComputePipelineAsync({ layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }), compute: { module: device.createShaderModule({ code }), entryPoint: 'wave' } })
    const textures = [0, 1].map(() => device.createTexture({ size: [width, height], format, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC }))
    const groups = textures.map((texture, index) => device.createBindGroup({ layout, entries: [
      { binding: 0, resource: { buffer } }, { binding: 1, resource: texture.createView() },
      { binding: 2, resource: textures[1 - index].createView() }, { binding: 3, resource: sampler }
    ] }))
    const params = new Float32Array(32)
    params.set([width, height, 1 / 120, 0], 0)
    params.set([.55, .5, 0, 0], 4)
    params.set([.03, 0, .45, 1], 8)
    params.set([0, 0, width / height, -.55], 16)
    params[15] = 1
    let stateIndex = 0
    function step(count: number): void {
      const encoder = device.createCommandEncoder()
      const pass = encoder.beginComputePass()
      pass.setPipeline(pipeline)
      for (let index = 0; index < count; index++) {
        pass.setBindGroup(0, groups[stateIndex])
        pass.dispatchWorkgroups(width / 8, height / 8)
        stateIndex = 1 - stateIndex
      }
      pass.end()
      device.queue.submit([encoder.finish()])
    }
    function half(bits: number): number {
      const exponent = (bits >> 10) & 31
      const fraction = bits & 1023
      const value = exponent === 0 ? fraction * 2 ** -24 : exponent === 31 ? fraction ? NaN : Infinity : (1 + fraction / 1024) * 2 ** (exponent - 15)
      return bits & 32768 ? -value : value
    }
    async function measure(): Promise<{ rms: number; roughness: number; max: number }> {
      const readback = device.createBuffer({ size: width * height * bytesPerPixel, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ })
      const encoder = device.createCommandEncoder()
      encoder.copyTextureToBuffer({ texture: textures[stateIndex] }, { buffer: readback, bytesPerRow: width * bytesPerPixel }, [width, height])
      device.queue.submit([encoder.finish()])
      await readback.mapAsync(GPUMapMode.READ)
      const bits = new Uint16Array(readback.getMappedRange())
      const values = Array.from({ length: width * height }, (_, index) => half(bits[index * 4]))
      let energy = 0
      let roughness = 0
      let max = 0
      for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
        const index = y * width + x
        const h = values[index]
        energy += h * h
        max = Math.max(max, Math.abs(h))
        const lap = values[index - 1] + values[index + 1] + values[index - width] + values[index + width] - 4 * h
        roughness += lap * lap
      }
      readback.unmap()
      readback.destroy()
      return { rms: Math.sqrt(energy / values.length), roughness: Math.sqrt(roughness / values.length), max }
    }
    try {
      device.queue.writeBuffer(buffer, 0, params)
      step(1)
      const initial = await measure()
      params[15] = 0
      device.queue.writeBuffer(buffer, 0, params)
      const samples = []
      for (const [frame, timing] of timings.entries()) {
        params[2] = timing.dt
        params[9] = frame < 180 ? 1.35 : 0
        params[4] = .5 + .2 * Math.sin(frame / 60)
        params[5] = .5 + .2 * Math.cos(frame / 60)
        device.queue.writeBuffer(buffer, 0, params)
        step(timing.steps)
        if (frame % 60 === 59) await device.queue.onSubmittedWorkDone()
        if ([59, 599, 1799, 3599].includes(frame)) samples.push({ frame: frame + 1, ...await measure() })
      }
      return { initial, samples, errors }
    } finally { textures.forEach(texture => texture.destroy()); buffer.destroy(); device.destroy() }
  }, { code: compute, timings, width })
  await testInfo.attach('wave-stability', { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' })
  expect(measurements.errors).toEqual([])
  const settled = measurements.samples.at(-1)!
  expect(settled.rms).toBeLessThan(measurements.initial.rms * .05)
  expect(settled.roughness).toBeLessThan(measurements.initial.roughness)
})
