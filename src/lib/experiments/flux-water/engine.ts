import { compute, render } from './shaders'
import { defaults, palettes, resolutions, waterGeometry, waterTimestep } from './settings'
import type { WaterSettings } from './settings'

// The bundled DOM types include GPU interfaces but omit the flag constants.
declare const GPUBufferUsage: { readonly UNIFORM: number; readonly COPY_DST: number }
declare const GPUTextureUsage: { readonly RENDER_ATTACHMENT: number; readonly COPY_SRC: number; readonly TEXTURE_BINDING: number; readonly STORAGE_BINDING: number }
declare const GPUShaderStage: { readonly COMPUTE: number; readonly FRAGMENT: number }

export interface WaterStats {
  fps: number
  frames: number
  width: number
  height: number
  adapted: boolean
}

interface WaterCallbacks {
  ready: () => void
  error: (message: string) => void
  stats: (stats: WaterStats) => void
}

interface Impulse { x: number; y: number; strength: number }

/** Owns one canvas and releases its GPU resources when the page leaves. */
export class WaterEngine {
  private device?: GPUDevice
  private context?: GPUCanvasContext
  private uniform!: GPUBuffer
  private sampler!: GPUSampler
  private computeLayout!: GPUBindGroupLayout
  private renderLayout!: GPUBindGroupLayout
  private wavePipeline!: GPUComputePipeline
  private surfacePipeline!: GPUComputePipeline
  private renderPipeline!: GPURenderPipeline
  private textures: GPUTexture[] = []
  private waveGroups: GPUBindGroup[] = []
  private surfaceGroups: GPUBindGroup[] = []
  private renderGroup!: GPUBindGroup
  private params = new Float32Array(32)
  private settings = { ...defaults }
  private width = 0
  private height = 0
  private baseResolution = resolutions[1]
  private pixelScale = 1
  private stateIndex = 0
  private seed = true
  private dirty = true
  private ready = false
  private disposed = false
  private paused: boolean
  private visible = true
  private simulationTime = 0
  private animation = 0
  private lastTick = 0
  private nextFrameAt = 0
  private submitted = 0
  private completed = 0
  private fpsStart = 0
  private fpsFrames = 0
  private frames = 0
  private fps = 0
  private costAverage = 1000 / 60
  private slowFrames = 0
  private fastFrames = 0
  private framesSinceResize = 0
  private pointer = { x: .55, y: .5, dx: 0, dy: 0, down: false }
  private impulses: Impulse[] = []
  private resizeObserver?: ResizeObserver
  private intersectionObserver?: IntersectionObserver
  private capture?: { resolve: (blob: Blob) => void; reject: (error: Error) => void }

  constructor(private canvas: HTMLCanvasElement, private callbacks: WaterCallbacks, paused = false) {
    this.paused = paused
  }

  async initialize(): Promise<void> {
    try {
      if (!navigator.gpu) throw new Error('WebGPU is unavailable. Try a browser with WebGPU and hardware acceleration enabled.')
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
      if (this.disposed) return
      if (!adapter) throw new Error('No compatible graphics adapter was found. Enable hardware acceleration or try another device.')
      const device = await adapter.requestDevice()
      if (this.disposed) { device.destroy(); return }
      this.device = device
      device.addEventListener('uncapturederror', event => {
        event.preventDefault()
        this.fail(`The water simulation stopped: ${event.error.message}`)
      })
      void device.lost.then(info => {
        if (!this.disposed) this.fail(`The graphics connection was lost. Try again to reconnect. ${info.message}`)
      })
      const context = this.canvas.getContext('webgpu') as GPUCanvasContext | null
      if (!context) throw new Error('A WebGPU canvas could not be created. Try another browser.')
      this.context = context
      const format = navigator.gpu.getPreferredCanvasFormat()
      context.configure({ device, format, alphaMode: 'opaque', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC })
      this.uniform = device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
      this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' })
      this.computeLayout = device.createBindGroupLayout({ entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'rgba16float' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, sampler: { type: 'filtering' } }
      ] })
      this.renderLayout = device.createBindGroupLayout({ entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } }
      ] })
      const cs = await this.shader(compute, 'Flux water compute')
      if (this.disposed) return
      const rs = await this.shader(render, 'Flux water surface')
      if (this.disposed) return
      const layout = device.createPipelineLayout({ bindGroupLayouts: [this.computeLayout] })
      this.wavePipeline = await device.createComputePipelineAsync({ layout, compute: { module: cs, entryPoint: 'wave' } })
      if (this.disposed) return
      this.surfacePipeline = await device.createComputePipelineAsync({ layout, compute: { module: cs, entryPoint: 'surface' } })
      if (this.disposed) return
      this.renderPipeline = await device.createRenderPipelineAsync({
        layout: device.createPipelineLayout({ bindGroupLayouts: [this.renderLayout] }),
        vertex: { module: rs, entryPoint: 'vertex' },
        fragment: { module: rs, entryPoint: 'fragment', targets: [{ format }] },
        primitive: { topology: 'triangle-list' }
      })
      if (this.disposed) return
      this.ready = true
      this.resize(true)
      this.resizeObserver = new ResizeObserver(() => { if (this.ready) this.resize() })
      this.resizeObserver.observe(this.canvas)
      this.intersectionObserver = new IntersectionObserver(entries => {
        this.visible = entries[0].isIntersecting
        this.resetClock()
        this.wake()
      })
      this.intersectionObserver.observe(this.canvas)
      document.addEventListener('visibilitychange', this.visibilityChanged)
      window.addEventListener('blur', this.releasePointer)
      this.callbacks.ready()
      this.report()
      this.wake()
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'The water simulation could not start. Try again.')
    }
  }

  setSettings(settings: WaterSettings): void {
    const qualityChanged = settings.quality !== this.settings.quality
    this.settings = { ...settings }
    if (qualityChanged) {
      this.baseResolution = resolutions[settings.quality]
      this.pixelScale = 1
      this.slowFrames = this.fastFrames = 0
      if (this.ready) this.resize(true)
    }
    this.dirty = true
    this.wake()
  }

  setPaused(paused: boolean): void {
    this.paused = paused
    if (paused) this.releasePointer()
    this.fps = 0
    this.resetClock()
    this.dirty = true
    if (this.ready) this.report()
    this.wake()
  }

  reset(): void {
    this.seed = this.dirty = true
    this.simulationTime = 0
    this.impulses = []
    this.releasePointer()
    this.wake()
  }

  burst(): void {
    if (!this.ready) return
    for (let index = 0; index < 4; index++) {
      const angle = index * Math.PI * .5 + Math.random() * .5
      this.impulses.push({ x: .55 + Math.cos(angle) * .17, y: .54 + Math.sin(angle) * .17, strength: .9 })
    }
    this.wake()
  }

  pointerDown(event: PointerEvent): void {
    if (!this.ready || event.button !== 0) return
    this.canvas.setPointerCapture(event.pointerId)
    Object.assign(this.pointer, this.coordinates(event), { down: true, dx: 0, dy: 0 })
    this.impulses.push({ x: this.pointer.x, y: this.pointer.y, strength: 1 })
    this.wake()
  }

  pointerMove(event: PointerEvent): void {
    const point = this.coordinates(event)
    if (this.pointer.down) {
      this.pointer.dx = Math.max(-500, Math.min(500, (point.x - this.pointer.x) * this.width * 18))
      this.pointer.dy = Math.max(-500, Math.min(500, (point.y - this.pointer.y) * this.height * 18))
    }
    Object.assign(this.pointer, point)
  }

  releasePointer = (): void => { this.pointer.down = false; this.pointer.dx = this.pointer.dy = 0 }

  snapshot(): Promise<Blob> {
    if (!this.ready) return Promise.reject(new Error('The simulation is unavailable.'))
    if (this.capture) return Promise.reject(new Error('A snapshot is already being prepared.'))
    return new Promise((resolve, reject) => { this.capture = { resolve, reject }; this.dirty = true; this.wake() })
  }

  destroy(): void {
    if (this.disposed) return
    this.disposed = true
    this.ready = false
    cancelAnimationFrame(this.animation)
    this.resizeObserver?.disconnect()
    this.intersectionObserver?.disconnect()
    document.removeEventListener('visibilitychange', this.visibilityChanged)
    window.removeEventListener('blur', this.releasePointer)
    this.capture?.reject(new Error('The water simulation was closed.'))
    this.capture = undefined
    this.context?.unconfigure()
    this.textures.forEach(texture => texture.destroy())
    this.uniform?.destroy()
    this.device?.destroy()
  }

  private fail(message: string): void {
    if (this.disposed) return
    this.destroy()
    this.callbacks.error(message)
  }

  private async shader(code: string, label: string): Promise<GPUShaderModule> {
    const device = this.device!
    device.pushErrorScope('validation')
    const module = device.createShaderModule({ code, label })
    const info = await module.getCompilationInfo()
    const validation = await device.popErrorScope()
    const errors = info.messages.filter(message => message.type === 'error')
    if (errors.length) throw new Error(`${label}: ${errors.map(message => `line ${message.lineNum}: ${message.message}`).join('; ')}`)
    if (validation) throw new Error(validation.message)
    return module
  }

  private coordinates(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) }
  }

  private resetClock(): void { this.lastTick = this.nextFrameAt = this.fpsStart = this.fpsFrames = 0 }
  private visibilityChanged = (): void => { this.releasePointer(); this.resetClock(); this.wake() }
  private wake(): void {
    if (this.ready && !this.animation && !document.hidden && (this.visible || this.capture)) this.animation = requestAnimationFrame(this.frame)
  }

  private report(): void {
    this.callbacks.stats({ fps: this.fps, frames: this.frames, width: this.width, height: this.height, adapted: this.baseResolution < resolutions[this.settings.quality] || this.pixelScale < 1 })
  }

  private resize(force = false): void {
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return
    const device = this.device!
    const geometry = waterGeometry(rect.width, rect.height, this.baseResolution, this.settings.quality, window.devicePixelRatio, this.pixelScale, device.limits.maxTextureDimension2D)
    if (this.canvas.width !== geometry.canvasWidth) this.canvas.width = geometry.canvasWidth
    if (this.canvas.height !== geometry.canvasHeight) this.canvas.height = geometry.canvasHeight
    this.dirty = true
    if (force || this.width !== geometry.width || this.height !== geometry.height) {
      this.width = geometry.width
      this.height = geometry.height
      this.textures.forEach(texture => texture.destroy())
      this.textures = ['wave A', 'wave B', 'surface'].map(label => device.createTexture({ label, size: [this.width, this.height], format: 'rgba16float', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING }))
      const group = (source: number, destination: number): GPUBindGroup => device.createBindGroup({ layout: this.computeLayout, entries: [
        { binding: 0, resource: { buffer: this.uniform } }, { binding: 1, resource: this.textures[source].createView() },
        { binding: 2, resource: this.textures[destination].createView() }, { binding: 3, resource: this.sampler }
      ] })
      this.waveGroups = [group(0, 1), group(1, 0)]
      this.surfaceGroups = [group(0, 2), group(1, 2)]
      this.renderGroup = device.createBindGroup({ layout: this.renderLayout, entries: [
        { binding: 0, resource: { buffer: this.uniform } }, { binding: 1, resource: this.textures[2].createView() }, { binding: 2, resource: this.sampler }
      ] })
      this.stateIndex = 0
      this.seed = true
      this.framesSinceResize = 0
    }
    this.report()
    this.wake()
  }

  private updateParams(elapsed: number, steps: number): void {
    const settings = this.settings
    const impulse = this.impulses.shift()
    this.params.set([this.width, this.height, elapsed / steps, this.simulationTime], 0)
    this.params.set([impulse?.x ?? this.pointer.x, impulse?.y ?? this.pointer.y, this.pointer.dx, this.pointer.dy], 4)
    const strength = impulse?.strength ?? (this.pointer.down ? .35 + Math.min(1, Math.hypot(this.pointer.dx, this.pointer.dy) / 150) : 0)
    this.params.set([.008 + settings.brush * .00065, strength, settings.swirl / 100, settings.persistence / 100], 8)
    this.params.set([0, 0, 0, this.seed ? 1 : 0], 12)
    this.params.set([settings.material, settings.palette, this.canvas.width / this.canvas.height, impulse ? 1 : -.55], 16)
    palettes[settings.palette].colors.forEach((color, index) => this.params.set([...color, 0], 20 + index * 4))
    this.device!.queue.writeBuffer(this.uniform, 0, this.params)
    this.pointer.dx *= .5
    this.pointer.dy *= .5
  }

  private adapt(cost: number): void {
    const interval = 1000 / 60
    this.costAverage = this.costAverage * .94 + cost * .06
    if (this.paused || this.framesSinceResize < 120) return
    if (this.costAverage > interval * 1.2) { this.slowFrames++; this.fastFrames = 0 }
    else if (this.costAverage < interval * 1.05) { this.fastFrames++; this.slowFrames = Math.max(0, this.slowFrames - 1) }
    else { this.slowFrames = Math.max(0, this.slowFrames - 1); this.fastFrames = 0 }
    if (this.slowFrames > 45 && (this.baseResolution > 128 || this.pixelScale > .55)) {
      this.baseResolution = Math.max(128, Math.floor(this.baseResolution * .85 / 8) * 8)
      this.pixelScale = Math.max(.55, this.pixelScale * .9)
      this.slowFrames = this.fastFrames = 0
      this.resize(true)
    } else if (this.fastFrames > 600 && (this.baseResolution < resolutions[this.settings.quality] || this.pixelScale < 1)) {
      this.baseResolution = Math.min(resolutions[this.settings.quality], Math.round(this.baseResolution * 1.1 / 8) * 8)
      this.pixelScale = Math.min(1, this.pixelScale + .05)
      this.slowFrames = this.fastFrames = 0
      this.resize(true)
    }
  }

  private frame = (now: number): void => {
    this.animation = 0
    if (!this.ready || document.hidden || (!this.visible && !this.capture)) return
    if (this.paused && !this.dirty && !this.seed && !this.capture) return
    this.wake()
    if (this.submitted - this.completed >= 12) return
    const interval = 1000 / 60
    if (this.nextFrameAt && now + .5 < this.nextFrameAt) return
    if (!this.nextFrameAt || now - this.nextFrameAt > interval * 2) this.nextFrameAt = now
    this.nextFrameAt += interval
    try {
      const milliseconds = this.lastTick ? now - this.lastTick : interval
      this.lastTick = now
      const { elapsed, steps } = waterTimestep(milliseconds)
      const stepping = !this.paused || this.seed
      if (stepping) this.simulationTime += elapsed
      this.updateParams(stepping ? elapsed : 0, steps)
      const device = this.device!
      const encoder = device.createCommandEncoder()
      {
        const pass = encoder.beginComputePass()
        if (stepping) {
          pass.setPipeline(this.wavePipeline)
          for (let index = 0; index < steps; index++) {
            pass.setBindGroup(0, this.waveGroups[this.stateIndex])
            pass.dispatchWorkgroups(Math.ceil(this.width / 8), Math.ceil(this.height / 8))
            this.stateIndex = 1 - this.stateIndex
          }
        }
        pass.setPipeline(this.surfacePipeline)
        pass.setBindGroup(0, this.surfaceGroups[this.stateIndex])
        pass.dispatchWorkgroups(Math.ceil(this.width / 8), Math.ceil(this.height / 8))
        pass.end()
        if (stepping) this.seed = false
      }
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view: this.context!.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: .04, g: .05, b: .04, a: 1 } }] })
      pass.setPipeline(this.renderPipeline)
      pass.setBindGroup(0, this.renderGroup)
      pass.draw(3)
      pass.end()
      device.queue.submit([encoder.finish()])
      const serial = ++this.submitted
      if (serial % 4 === 0) void device.queue.onSubmittedWorkDone().then(() => { this.completed = Math.max(this.completed, serial) }).catch(error => this.fail(String(error)))
      this.dirty = false
      this.frames++
      this.framesSinceResize++
      this.adapt(milliseconds)
      if (!this.fpsStart) this.fpsStart = now
      this.fpsFrames++
      if (now - this.fpsStart >= 1000) {
        this.fps = this.paused ? 0 : Math.round(this.fpsFrames * 1000 / (now - this.fpsStart))
        this.report()
        this.fpsStart = now
        this.fpsFrames = 0
      }
      if (this.capture) {
        const request = this.capture
        this.capture = undefined
        this.canvas.toBlob(blob => {
          if (this.disposed) request.reject(new Error('The water simulation was closed.'))
          else if (blob) request.resolve(blob)
          else request.reject(new Error('Snapshot encoding is unavailable in this browser.'))
        }, 'image/png')
      }
    } catch (error) { this.fail(error instanceof Error ? error.message : String(error)) }
  }
}
