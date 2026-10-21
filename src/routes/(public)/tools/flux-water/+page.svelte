<script lang="ts">
  import { onMount } from 'svelte'

  import Icon from '$lib/components/Icon.svelte'
  import SEOHead from '$lib/components/SEOHead.svelte'
  import type { WaterEngine, WaterStats } from '$lib/experiments/flux-water/engine'
  import { defaults, materials, palettes, qualities } from '$lib/experiments/flux-water/settings'
  import type { WaterSettings } from '$lib/experiments/flux-water/settings'
  import { breadcrumbSchema } from '$lib/seo'

  let canvas: HTMLCanvasElement
  let studio: HTMLDivElement
  let engine = $state.raw<WaterEngine>()
  let settings = $state<WaterSettings>({ ...defaults })
  let status = $state<'loading' | 'ready' | 'error'>('loading')
  let error = $state('')
  let paused = $state(true)
  let reducedMotion = $state(false)
  let fullscreen = $state(false)
  let saving = $state(false)
  let message = $state('')
  let stats = $state<WaterStats>({ fps: 0, frames: 0, width: 0, height: 0, adapted: false })
  let disposed = false
  let attempt = 0
  let noticeTimer: ReturnType<typeof setTimeout>
  const downloadUrls = new Set<string>()
  const ready = $derived(status === 'ready')

  $effect(() => { engine?.setSettings({ ...settings }) })
  $effect(() => { engine?.setPaused(paused) })

  onMount(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion = motion.matches
    paused = motion.matches
    const motionChanged = (): void => { reducedMotion = motion.matches; if (motion.matches) paused = true }
    const fullscreenChanged = (): void => { fullscreen = document.fullscreenElement === studio }
    motion.addEventListener('change', motionChanged)
    document.addEventListener('fullscreenchange', fullscreenChanged)
    void start()
    return () => {
      disposed = true
      attempt++
      engine?.destroy()
      clearTimeout(noticeTimer)
      downloadUrls.forEach(url => URL.revokeObjectURL(url))
      motion.removeEventListener('change', motionChanged)
      document.removeEventListener('fullscreenchange', fullscreenChanged)
    }
  })

  async function start(): Promise<void> {
    const currentAttempt = ++attempt
    engine?.destroy()
    engine = undefined
    status = 'loading'
    error = ''
    try {
      const { WaterEngine } = await import('$lib/experiments/flux-water/engine')
      if (disposed || currentAttempt !== attempt) return
      engine = new WaterEngine(canvas, {
        ready: () => { if (!disposed) status = 'ready' },
        error: detail => { if (!disposed) { error = detail; status = 'error'; paused = true } },
        stats: value => { if (!disposed) stats = value }
      }, paused)
      engine.setSettings({ ...settings })
      await engine.initialize()
    } catch {
      if (!disposed && currentAttempt === attempt) { status = 'error'; error = 'The experiment could not load. Check your connection and try again.' }
    }
  }

  function notice(text: string): void {
    message = text
    clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => { message = '' }, 4000)
  }

  function burst(): void {
    if (!ready) return
    paused = false
    engine?.setPaused(false)
    engine?.burst()
  }

  function pointerDown(event: PointerEvent): void {
    if (!ready || event.button !== 0) return
    paused = false
    engine?.setPaused(false)
    engine?.pointerDown(event)
  }

  function canvasKey(event: KeyboardEvent): void {
    if (!ready || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.code === 'Space') { event.preventDefault(); paused = !paused }
    if (event.key.toLowerCase() === 'b') { event.preventDefault(); burst() }
    if (event.key.toLowerCase() === 'r') { event.preventDefault(); engine?.reset() }
  }

  async function saveSnapshot(): Promise<void> {
    if (!ready || saving || !engine) return
    saving = true
    try {
      const blob = await engine.snapshot()
      if (disposed) return
      const url = URL.createObjectURL(blob)
      downloadUrls.add(url)
      const link = document.createElement('a')
      link.href = url
      link.download = `flux-water-${palettes[settings.palette].name.toLowerCase()}.png`
      link.click()
      setTimeout(() => { URL.revokeObjectURL(url); downloadUrls.delete(url) }, 10_000)
      notice('Snapshot saved as PNG.')
    } catch (problem) {
      if (!disposed) notice(problem instanceof Error ? problem.message : 'The snapshot could not be saved. Try again.')
    } finally { if (!disposed) saving = false }
  }

  async function toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement === studio) await document.exitFullscreen()
      else await studio.requestFullscreen()
    } catch { notice('Fullscreen is unavailable in this browser.') }
  }
</script>

<SEOHead title="Flux Water" description="An interactive water experiment. Make ripples, change the light, and explore a real-time WebGPU water surface in your browser." jsonLd={breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Tools', url: '/tools' }, { name: 'Flux Water', url: '/tools/flux-water' }])} />

<div class="water-page container">
  <a class="back-link" href="/tools">← All tools & experiments</a>
  <header class="water-header">
    <p class="eyebrow"><Icon name="sparkles" size="sm" /> Interactive experiment</p>
    <h1>Flux <span>Water.</span></h1>
    <p>Slow down. Make a few waves. Drag across the water and watch the light follow.</p>
  </header>
  <noscript><p class="notice">Enable JavaScript to run this water experiment.</p></noscript>

  <div class="studio" bind:this={studio}>
    <section class="water-view" aria-label="Water experiment">
      <div class="stage" class:unavailable={!ready}>
        <canvas bind:this={canvas} class="water-canvas" aria-label="Interactive water surface" aria-describedby="water-hint water-keys" tabindex={ready ? 0 : -1} data-state={status} data-frames={stats.frames} onpointerdown={pointerDown} onpointermove={event => engine?.pointerMove(event)} onpointerup={() => engine?.releasePointer()} onpointercancel={() => engine?.releasePointer()} onlostpointercapture={() => engine?.releasePointer()} onkeydown={canvasKey}>Your browser needs WebGPU to display the water simulation.</canvas>
        {#if !ready}
          <div class="stage-message">
            <Icon name="layers" size="lg" />
            <h2>{status === 'error' ? 'Water is unavailable' : 'Preparing the water…'}</h2>
            <p>{status === 'error' ? error : 'Setting up the simulation on your device.'}</p>
            {#if status === 'error'}<button class="primary-button" onclick={start}>Try again</button>{/if}
          </div>
        {/if}
      </div>
      <div class="water-status">
        <span class="engine-state" role="status">{status === 'loading' ? 'Starting WebGPU…' : status === 'error' ? 'WebGPU unavailable' : paused ? 'Paused' : 'Live water · WebGPU'}</span>
        <span class="performance" aria-hidden="true">{#if ready}{paused ? 'Paused' : stats.fps ? `${stats.fps} FPS` : 'Warming up'} · {qualities[settings.quality]}{stats.adapted ? ' · adapted' : ''}{/if}</span>
      </div>
      <div class="toolbar">
        <button class="primary-button" disabled={!ready} onclick={() => { paused = !paused }}>{paused ? 'Play' : 'Pause'}</button>
        <button disabled={!ready} onclick={burst}>Make waves</button>
        <button disabled={!ready} onclick={() => { engine?.reset(); notice('Water reset.') }}>Reset water</button>
        <button disabled={!ready || saving} onclick={saveSnapshot}>{saving ? 'Saving…' : 'Save image'}</button>
        <button class="fullscreen-button" disabled={!ready} onclick={toggleFullscreen}>{fullscreen ? 'Exit fullscreen' : 'Fullscreen'} <Icon name="external-link" size="sm" /></button>
      </div>
      <p class="water-hint" id="water-hint">{reducedMotion && paused ? 'Motion is paused to match your device setting. Press Play when you are ready.' : 'Drag with your mouse or finger to stir the water. Or press Make waves.'}</p>
      <p class="keyboard-hint" id="water-keys">With the water focused: Space to pause, B for waves, R to reset.</p>
    </section>

    <aside class="controls" aria-label="Water settings">
      <div class="controls-heading"><h2>Set the mood.</h2><p>Changes appear as you go.</p></div>
      <fieldset disabled={!ready}>
        <legend>Water</legend>
        <div class="choices material-choices">
          {#each materials as material, index}<button aria-pressed={settings.material === index} onclick={() => { settings.material = index }}>{material}</button>{/each}
        </div>
      </fieldset>
      <fieldset disabled={!ready}>
        <legend>Light</legend>
        <div class="choices palette-choices">
          {#each palettes as palette, index}<button aria-pressed={settings.palette === index} onclick={() => { settings.palette = index }}>{palette.name}</button>{/each}
        </div>
      </fieldset>
      <details class="advanced-settings">
        <summary>Water behavior & quality</summary>
        <div class="advanced-content">
          <label for="water-swirl">Surface movement <span>{settings.swirl}%</span></label>
          <input id="water-swirl" type="range" min="0" max="100" bind:value={settings.swirl} disabled={!ready} />
          <label for="water-persistence">Ripple persistence <span>{settings.persistence}%</span></label>
          <input id="water-persistence" type="range" min="0" max="100" bind:value={settings.persistence} disabled={!ready} />
          <label for="water-brush">Brush size <span>{settings.brush}%</span></label>
          <input id="water-brush" type="range" min="0" max="100" bind:value={settings.brush} disabled={!ready} />
          <label for="water-quality">Quality</label>
          <select id="water-quality" bind:value={settings.quality} disabled={!ready}>{#each qualities as quality, index}<option value={index}>{quality}</option>{/each}</select>
          <p>Quality adjusts to your device. Choose Light to reduce graphics work.</p>
          {#if ready}<p class="resolution">{stats.width} × {stats.height} simulation grid</p>{/if}
          <button class="defaults-button" disabled={!ready} onclick={() => { settings = { ...defaults }; notice('Default settings restored.') }}>Restore defaults</button>
        </div>
      </details>
    </aside>
  </div>
  <p class="notice snapshot-notice" role="status">{message}</p>
  <details class="about-water">
    <summary>About this experiment</summary>
    <p>Flux Water simulates ripples on a water surface using WebGPU. Refraction, reflections and moving caustics create the light you see below the water. It is a surface simulation; it does not simulate splashes or droplets.</p>
    <p>Everything runs on your device. The simulation aims for 60 FPS and adjusts its resolution when your device needs it. Actual speed depends on your graphics hardware and browser. It stops rendering while paused, off screen, or in a hidden tab.</p>
  </details>
</div>

<style>
  .water-page { padding-top: var(--space-8); padding-bottom: var(--space-20); }
  .back-link { display: inline-block; color: var(--color-text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-8); }
  .back-link:hover { color: var(--color-accent); }
  .water-header { margin-bottom: var(--space-8); }
  .eyebrow { display: flex; align-items: center; gap: var(--space-2); color: var(--color-accent); font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: .08em; text-transform: uppercase; margin-bottom: var(--space-4); }
  h1 { font-size: clamp(2.8rem, 6vw, 4.75rem); line-height: 1.02; letter-spacing: -.055em; margin: 0 0 var(--space-4); }
  h1 span { color: var(--color-accent); }
  .water-header > p:last-child { color: var(--color-text-secondary); max-width: 42rem; font-size: var(--text-lg); line-height: 1.6; }
  .studio { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: var(--space-6); align-items: start; }
  .water-view { min-width: 0; }
  .stage { position: relative; overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-bg-secondary); aspect-ratio: 4 / 3; }
  .water-canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
  .water-canvas:focus-visible { outline: 3px solid var(--color-accent); outline-offset: -5px; }
  .unavailable .water-canvas { visibility: hidden; }
  .stage-message { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-4); padding: var(--space-6); text-align: center; color: var(--color-text-secondary); background: radial-gradient(ellipse at top, var(--color-menu-active), var(--color-bg-secondary)); }
  .stage-message h2 { font-size: var(--text-xl); color: var(--color-text); letter-spacing: -.03em; }
  .stage-message p { max-width: 34rem; line-height: 1.6; overflow-wrap: anywhere; }
  .water-status { display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2); padding: var(--space-3) 0; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-secondary); }
  .engine-state { color: var(--color-accent); }
  .toolbar { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  button { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); min-height: 44px; padding: var(--space-2) var(--space-3); background: var(--color-bg-secondary); color: var(--color-text); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font: inherit; font-size: var(--text-sm); cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast); }
  button:hover:not(:disabled) { background: var(--color-bg-tertiary); border-color: var(--color-border-hover); }
  button:disabled { opacity: .5; cursor: default; }
  button:focus-visible, select:focus-visible, summary:focus-visible, a:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 4px; }
  button.primary-button { background: var(--color-accent); color: var(--color-bg); border-color: var(--color-accent); font-weight: 700; }
  button.primary-button:hover:not(:disabled) { background: var(--color-accent-hover); }
  .fullscreen-button { margin-left: auto; }
  .water-hint { color: var(--color-text-secondary); font-size: var(--text-sm); line-height: 1.6; margin-top: var(--space-4); }
  .keyboard-hint { color: var(--color-text-secondary); font-size: var(--text-xs); line-height: 1.6; margin-top: var(--space-1); }
  .controls { border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); background: var(--color-bg-secondary); }
  .controls-heading { margin-bottom: var(--space-6); }
  .controls h2 { font-size: var(--text-xl); letter-spacing: -.04em; margin: 0 0 var(--space-2); }
  .controls p { color: var(--color-text-secondary); font-size: var(--text-sm); line-height: 1.6; }
  fieldset { min-width: 0; border: 0; padding: 0; margin: 0 0 var(--space-6); }
  legend { font-size: var(--text-sm); font-weight: 700; margin-bottom: var(--space-3); }
  .choices { display: grid; gap: var(--space-2); }
  .palette-choices { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .choices button { background: var(--color-bg); padding-inline: var(--space-2); }
  .choices button[aria-pressed='true'] { background: var(--color-menu-active); border-color: var(--color-accent); color: var(--color-accent); }
  .advanced-settings { border-top: 1px solid var(--color-border); padding-top: var(--space-4); }
  summary { cursor: pointer; font-size: var(--text-sm); font-weight: 700; min-height: 44px; align-content: center; }
  .advanced-content { display: grid; gap: var(--space-3); padding-top: var(--space-4); }
  .advanced-content label { display: flex; justify-content: space-between; gap: var(--space-2); font-size: var(--text-sm); }
  .advanced-content label span { color: var(--color-accent); font-variant-numeric: tabular-nums; }
  input[type='range'] { width: 100%; min-height: 32px; accent-color: var(--color-accent); margin: 0 0 var(--space-3); cursor: pointer; }
  select { width: 100%; min-height: 44px; color: var(--color-text); background: var(--color-bg); border: 1px solid var(--color-border); padding: var(--space-2); font: inherit; border-radius: var(--radius-sm); }
  .resolution { font-family: var(--font-mono); font-size: var(--text-xs); }
  .snapshot-notice { min-height: 1.5em; margin-top: var(--space-3); color: var(--color-accent); font-size: var(--text-sm); }
  .about-water { margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--color-border); max-width: 52rem; }
  .about-water p { color: var(--color-text-secondary); font-size: var(--text-sm); line-height: 1.8; margin: var(--space-3) 0; }
  .studio:fullscreen { display: grid; width: 100%; height: 100%; padding: var(--space-6); background: var(--color-bg); overflow: auto; align-items: center; }
  .studio:fullscreen .stage { max-height: calc(100dvh - 220px); }
  @media (max-width: 900px) {
    .studio { grid-template-columns: minmax(0, 1fr); }
    .controls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-5); }
    .controls-heading { grid-column: 1 / -1; margin-bottom: 0; }
    fieldset { margin: 0; }
    .advanced-settings { grid-column: 1 / -1; }
    .material-choices { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 480px) {
    .water-page { padding-top: var(--space-5); }
    .back-link { margin-bottom: var(--space-6); }
    .stage { aspect-ratio: 1; }
    .stage-message { padding: var(--space-4); gap: var(--space-3); }
    .stage-message h2 { font-size: var(--text-base); }
    .stage-message p { font-size: var(--text-sm); }
    .toolbar > button { flex: 1 1 auto; }
    .fullscreen-button { margin-left: 0; }
    .controls { padding: var(--space-4); gap: var(--space-4); }
    .choices button { font-size: var(--text-xs); }
    .studio:fullscreen { padding: var(--space-3); align-items: start; }
  }
  @media (prefers-reduced-motion: reduce) { button { transition: none; } }
</style>
