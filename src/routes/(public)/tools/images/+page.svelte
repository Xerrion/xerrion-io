<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  import Icon from '$lib/components/Icon.svelte'
  import SEOHead from '$lib/components/SEOHead.svelte'
  import ImageComparison from '$lib/components/tools/ImageComparison.svelte'
  import { breadcrumbSchema } from '$lib/seo'
  import { imageGeometry, formatBytes, INPUT_ACCEPT, MAX_BATCH_BYTES, MAX_FILES, outputFilename, savingsLabel, supportedFormats, validateImageFile } from '$lib/utils/image-converter'
  import type { ConversionOptions, ConvertedImage, CropRatio, ImageFormat, ImageRotation } from '$lib/utils/image-converter'
  import { processImage } from '$lib/utils/image-processor'
  import { createImageZip } from '$lib/utils/image-zip'

  interface ImageResult extends ConvertedImage {
    url: string
    name: string
    settingsKey: string
    referenceUrl?: string
  }
  interface ImageJob {
    id: number
    file: File
    originalUrl: string
    status: 'queued' | 'working' | 'done' | 'error'
    error?: string
    attemptedKey?: string
    result?: ImageResult
  }

  let jobs = $state<ImageJob[]>([])
  let selectedId = $state<number | null>(null)
  let format = $state<ImageFormat>('webp')
  let quality = $state(80)
  let maxEdge = $state<number | undefined>(1920)
  let moreOptionsOpen = $state(false)
  let customSizing = $state(false)
  let resizeMode = $state<'longest' | 'bounds' | 'percent'>('longest')
  let maxWidth = $state<number | undefined>()
  let maxHeight = $state<number | undefined>()
  let scale = $state(100)
  let rotation = $state<ImageRotation>(0)
  let flipHorizontal = $state(false)
  let flipVertical = $state(false)
  let cropRatio = $state<CropRatio>('original')
  let targetKB = $state<number | undefined>()
  let matte = $state<'light' | 'dark'>('light')
  let lightMatte = $state('')
  let darkMatte = $state('')
  let toolElement: HTMLDivElement
  let formats = $state<ImageFormat[]>([])
  let initialized = $state(false)
  let busy = $state(false)
  let zipping = $state(false)
  let dragging = $state(false)
  let message = $state('')
  let settingsError = $state('')
  let progress = $state('')
  let fileInput: HTMLInputElement
  let nextId = 1
  let disposed = false
  const downloadUrls = new Set<string>()
  const options: ConversionOptions = $derived({
    format, quality, maxEdge: resizeMode === 'longest' ? maxEdge ?? 0 : 0,
    background: matte === 'light' ? lightMatte : darkMatte,
    resize: resizeMode === 'bounds' ? { mode: 'bounds', width: maxWidth, height: maxHeight } : resizeMode === 'percent' ? { mode: 'percent', percent: scale } : undefined,
    rotation, flipHorizontal, flipVertical, cropRatio,
    targetBytes: format !== 'png' && targetKB !== undefined ? Math.round(targetKB * 1024) : undefined
  })
  const settingsKey = $derived(JSON.stringify(options))
  const sizeChoice = $derived(customSizing || resizeMode !== 'longest' ? 'custom' : maxEdge === undefined ? 'original' : [800, 1280, 1600, 1920].includes(maxEdge) ? String(maxEdge) : 'custom')
  const selected = $derived(jobs.find(job => job.id === selectedId))
  const ready = $derived(jobs.filter(job => job.result?.settingsKey === settingsKey))
  const totalBefore = $derived(ready.reduce((total, job) => total + job.file.size, 0))
  const totalAfter = $derived(ready.reduce((total, job) => total + job.result!.blob.size, 0))
  const stale = $derived(jobs.some(job => job.result && job.result.settingsKey !== settingsKey))
  const locked = $derived(zipping)

  onMount(async () => {
    try {
      const colors = getComputedStyle(toolElement)
      lightMatte = colors.getPropertyValue('--color-image-matte-light').trim()
      darkMatte = colors.getPropertyValue('--color-image-matte-dark').trim()
      const available = await supportedFormats()
      if (disposed) return
      formats = available
      if (!formats.includes(format)) format = formats[0] ?? 'png'
      if (formats.length === 0) message = 'Image export is unavailable. Try a current browser.'
    } catch {
      if (!disposed) message = 'Image editing is unavailable. Try a current browser.'
    } finally {
      if (!disposed) initialized = true
    }
  })

  function release(job: ImageJob): void {
    URL.revokeObjectURL(job.originalUrl)
    if (job.result) { URL.revokeObjectURL(job.result.url); if (job.result.referenceUrl) URL.revokeObjectURL(job.result.referenceUrl) }
  }

  onDestroy(() => {
    disposed = true
    jobs.forEach(release)
    downloadUrls.forEach(url => URL.revokeObjectURL(url))
  })

  function addFiles(files: File[]): void {
    if (locked) return
    const errors: string[] = []
    let bytes = jobs.reduce((total, job) => total + job.file.size, 0)
    for (const file of files) {
      const error = validateImageFile(file)
      if (error) { errors.push(`${file.name}: ${error}`); continue }
      if (jobs.length >= MAX_FILES) { errors.push('You can convert up to 20 images at once.'); break }
      if (bytes + file.size > MAX_BATCH_BYTES) { errors.push('This batch exceeds 100 MB. Remove an image or choose smaller files.'); continue }
      const job: ImageJob = { id: nextId++, file, originalUrl: URL.createObjectURL(file), status: 'queued' }
      jobs.push(job)
      bytes += file.size
      selectedId ??= job.id
    }
    message = [...new Set(errors)].join(' ')
    progress = ''
  }

  function removeJob(id: number): void {
    if (locked) return
    const job = jobs.find(item => item.id === id)
    if (job) release(job)
    jobs = jobs.filter(item => item.id !== id)
    if (selectedId === id) selectedId = jobs[0]?.id ?? null
    progress = ''
  }

  function clearAll(): void {
    if (locked) return
    jobs.forEach(release)
    jobs = []
    selectedId = null
    message = settingsError = progress = ''
    fileInput.value = ''
  }

  function preset(name: 'web' | 'email' | 'png'): void {
    customSizing = false
    resizeMode = 'longest'
    targetKB = undefined
    format = name === 'png' ? 'png' : name === 'email' ? 'jpeg' : formats.includes('webp') ? 'webp' : 'jpeg'
    quality = name === 'email' ? 75 : 80
    maxEdge = name === 'png' ? undefined : name === 'email' ? 1600 : 1920
  }

  function chooseSize(value: string): void {
    customSizing = value === 'custom'
    if (customSizing) { moreOptionsOpen = true; return }
    resizeMode = 'longest'
    maxEdge = value === 'original' ? undefined : Number(value)
  }

  function isPreset(name: 'web' | 'email' | 'png'): boolean {
    if (resizeMode !== 'longest' || targetKB !== undefined) return false
    if (name === 'png') return format === 'png' && maxEdge === undefined
    if (name === 'email') return format === 'jpeg' && quality === 75 && maxEdge === 1600
    return format === (formats.includes('webp') ? 'webp' : 'jpeg') && quality === 80 && maxEdge === 1920
  }

  function resetSettings(): void {
    preset('web')
    rotation = 0
    flipHorizontal = flipVertical = false
    cropRatio = 'original'
    matte = 'light'
    maxWidth = maxHeight = undefined
    scale = 100
  }

  $effect(() => {
    const fileIds = jobs.map(job => job.id).join(',')
    const key = settingsKey
    const priority = selectedId
    if (!initialized || !formats.length || !fileIds) return
    const controller = new AbortController()
    busy = true
    progress = 'Updating preview…'
    const timer = setTimeout(() => { void convertAll(controller.signal, key, priority) }, 250)
    return () => { clearTimeout(timer); controller.abort(); busy = false }
  })

  async function convertAll(signal: AbortSignal, key: string, priority: number | null): Promise<void> {
    const snapshot = { ...options }
    try {
      imageGeometry(1, 1, snapshot)
      if (snapshot.targetBytes !== undefined && (snapshot.targetBytes < 1024 || snapshot.targetBytes > 25 * 1024 * 1024)) throw new Error('Choose a target size from 1 to 25600 KB.')
    } catch (error) {
      settingsError = (error as Error).message
      busy = false
      progress = 'Check the export settings.'
      return
    }
    settingsError = ''
    // The selected image renders first. Controls stay usable while other images finish.
    const batch = [...jobs].sort((a, b) => Number(b.id === priority) - Number(a.id === priority))
    let completed = 0
    try {
      for (const job of batch) {
        if (disposed || signal.aborted || key !== settingsKey) return
        if (job.result?.settingsKey === key || (job.status === 'error' && job.attemptedKey === key)) { completed++; continue }
        job.error = undefined
        job.status = 'working'
        job.attemptedKey = key
        progress = `Updating image ${completed + 1} of ${batch.length}…`
        try {
          const result = await processImage(job.file, snapshot, signal)
          if (disposed || signal.aborted || key !== settingsKey || !jobs.some(item => item.id === job.id)) return
          const previous = job.result
          job.result = { ...result, url: URL.createObjectURL(result.blob), referenceUrl: result.referenceBlob ? URL.createObjectURL(result.referenceBlob) : undefined, name: outputFilename(job.file.name, snapshot.format), settingsKey: key }
          if (previous) { URL.revokeObjectURL(previous.url); if (previous.referenceUrl) URL.revokeObjectURL(previous.referenceUrl) }
          job.status = 'done'
        } catch (error) {
          if (disposed || signal.aborted) return
          job.status = 'error'
          job.error = error instanceof Error ? error.message : 'Conversion failed. Try another image.'
        }
        completed++
      }
      const count = jobs.filter(job => job.result?.settingsKey === key).length
      progress = `${count} of ${jobs.length} image${jobs.length === 1 ? '' : 's'} ready to download.`
    } finally {
      if (!disposed && !signal.aborted) busy = false
    }
  }

  async function downloadZip(): Promise<void> {
    if (locked || !ready.length) return
    zipping = true
    message = ''
    try {
      const blob = await createImageZip(ready.map(job => ({ name: job.result!.name, blob: job.result!.blob })))
      if (disposed) return
      const url = URL.createObjectURL(blob)
      downloadUrls.add(url)
      const link = document.createElement('a')
      link.href = url
      link.download = 'xerrion-images.zip'
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => { URL.revokeObjectURL(url); downloadUrls.delete(url) }, 60_000)
    } catch {
      if (!disposed) message = 'The ZIP could not be created. Download the images individually.'
    } finally {
      if (!disposed) zipping = false
    }
  }
</script>

<SEOHead title="Image converter & optimizer" description="Convert and resize images to WebP, JPEG, or PNG. Compare quality, reduce file sizes, and download a batch. Your images stay on your device." jsonLd={breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Tools', url: '/tools' }, { name: 'Image converter', url: '/tools/images' }])} />

<div class="converter-page container" bind:this={toolElement}>
  <header class="tool-header">
    <a class="eyebrow" href="/tools"><Icon name="layers" size="sm" /> All tools & experiments</a>
    <h1>Image <span>converter.</span></h1>
    <div class="intro-row"><p>Smaller images, ready to share. Choose your photos and see changes as you go.</p><span class="privacy"><Icon name="check" size="sm" /> Files stay on your device</span></div>
  </header>
  <noscript><p class="notice">Enable JavaScript to convert images locally in your browser.</p></noscript>

  <div class="workspace">
    <section class="work-area" aria-label="Image workspace">
      <div class="drop-area" class:dragging class:has-images={jobs.length > 0} ondragover={(event) => { event.preventDefault(); if (!locked) dragging = true }} ondragleave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) dragging = false }} ondrop={(event) => { event.preventDefault(); dragging = false; addFiles(Array.from(event.dataTransfer?.files ?? [])) }} role="region" aria-label="Drop images here">
        <div class="drop-icon"><Icon name="layers" size="lg" /></div>
        <h2>{jobs.length ? `${jobs.length} image${jobs.length === 1 ? '' : 's'} added` : 'Start with your images'}</h2>
        <p>Drop them here, or choose files below.<br />JPEG, PNG, WebP, AVIF, or BMP. Up to 25 MB each.</p>
        <div class="upload-actions"><label class="browse-button" class:disabled={locked} for="image-files"><Icon name="folder" size="sm" /> {jobs.length ? 'Add images' : 'Choose images'}</label>{#if jobs.length}<button class="text-button" onclick={clearAll} disabled={locked}>Clear all</button>{/if}</div>
        <input bind:this={fileInput} id="image-files" class="file-input" type="file" accept={INPUT_ACCEPT} multiple disabled={locked} onchange={(event) => { addFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = '' }} />
      </div>
      {#if message || settingsError}<p class="notice error" role="alert">{message || settingsError}</p>{/if}

      {#if selected}
        <section class="preview" aria-labelledby="preview-heading">
          <div class="section-heading"><div><h2 id="preview-heading">Your preview</h2><p class="preview-name" title={selected.file.name}>{selected.file.name}</p></div><span class="preview-badge" aria-live="off">{busy || selected.result?.settingsKey !== settingsKey ? 'Updating…' : 'Up to date'}</span></div>
          {#if selected.error}<p class="notice error" role="alert">{selected.error}</p>{/if}
          {#if selected.result}
            <ImageComparison original={selected.result.referenceUrl ?? selected.originalUrl} converted={selected.result.url} width={selected.result.width} height={selected.result.height} />
            <div class="preview-details"><span>{selected.result.originalWidth} × {selected.result.originalHeight} <span aria-hidden="true">→</span> {selected.result.width} × {selected.result.height} px</span><span>{format === 'png' ? 'Lossless PNG' : `Encoded at ${selected.result.quality}% quality`}</span></div>
            {#if !selected.result.targetMet}<p class="size-tip">The target size could not be reached. Try a smaller image size or a larger file-size target.</p>{/if}
            {#if selected.result.blob.size > selected.file.size}<p class="size-tip">This version is larger. Try WebP, lower the quality, or choose a smaller image size.</p>{/if}
          {:else if selected.status !== 'error'}<div class="original-preview"><img src={selected.originalUrl} alt={`Preview of ${selected.file.name}`} onerror={(event) => { event.currentTarget.setAttribute('hidden', '') }} /><p>Preparing your preview…</p></div>{/if}
        </section>
      {/if}

      {#if jobs.length}
        <section class="queue" aria-labelledby="queue-heading">
          <div class="section-heading"><h2 id="queue-heading">{jobs.length > 1 ? 'Choose an image to preview' : 'Your image'}</h2>{#if jobs.length > 1}<span class="hint">Settings apply to all images</span>{/if}</div>
          <ul class="file-list">
            {#each jobs as job (job.id)}
              <li class:selected={job.id === selectedId}>
                <button class="file-select" onclick={() => { selectedId = job.id }} aria-pressed={job.id === selectedId}>
                  <img src={job.originalUrl} alt="" width="48" height="48" onerror={(event) => { event.currentTarget.setAttribute('hidden', '') }} />
                  <span class="file-info"><span class="file-name">{job.file.name}</span><span class="file-meta">{formatBytes(job.file.size)}{#if job.result} <span aria-hidden="true">→</span> {formatBytes(job.result.blob.size)}{/if}</span></span>
                  <span class="file-status" class:larger={job.result && job.result.blob.size > job.file.size}>{#if job.status === 'working'}Updating…{:else if job.status === 'error'}Could not convert{:else if job.result}{job.result.settingsKey !== settingsKey ? 'Updating…' : savingsLabel(job.file.size, job.result.blob.size)}{:else}Preparing preview{/if}</span>
                </button>
                {#if job.result?.settingsKey === settingsKey}<a class="download-one" href={job.result.url} download={job.result.name} aria-label={`Download ${job.result.name}`}><Icon name="arrow-up" size="sm" /></a>{/if}
                <button class="remove-button" onclick={() => removeJob(job.id)} disabled={locked} aria-label={`Remove ${job.file.name}`}><Icon name="x" size="sm" /></button>
              </li>
            {/each}
          </ul>
        </section>
      {:else}<p class="empty-note">Choose up to 20 images. We’ll prepare a preview automatically.</p>{/if}
    </section>

    <aside class="settings" aria-labelledby="settings-heading">
      <div class="settings-title"><div class="settings-heading"><h2 id="settings-heading">Make it ready</h2><button class="text-button" onclick={resetSettings} disabled={locked}>Reset</button></div></div>
      <div class="settings-actions">
        {#if ready.length}
          <div class="batch-summary"><div><span>{ready.length > 1 ? `${ready.length} images ready` : 'Your new file'}</span><strong>{formatBytes(totalAfter)}</strong></div><p>{formatBytes(totalBefore)} originally · {savingsLabel(totalBefore, totalAfter)}</p></div>
          {#if ready.length === 1}<a class="zip-button" href={ready[0].result!.url} download={ready[0].result!.name}>Download image <Icon name="arrow-right" size="sm" /></a>
          {:else}<button class="zip-button" onclick={downloadZip} disabled={locked || busy || stale}>{zipping ? 'Preparing ZIP…' : `Download ${ready.length} as ZIP`}<Icon name="folder" size="sm" /></button>{/if}
        {:else}<button class="zip-button" disabled>{jobs.length ? 'Updating images…' : 'Add an image to start'}<Icon name="arrow-right" size="sm" /></button>{/if}
        <div class="conversion-status" role="status" aria-label="Conversion progress" aria-live="polite" aria-atomic="true">{progress || (initialized ? 'Your preview updates automatically.' : 'Checking browser support…')}</div>
      </div>

      <div class="settings-fields">
        <fieldset disabled={locked || !initialized || !formats.length}>
          <legend class="visually-hidden">Image conversion settings</legend>
          <div class="setting-group"><span class="field-label" id="presets-label">Quick start</span><div class="presets" role="group" aria-labelledby="presets-label"><button aria-pressed={isPreset('web')} onclick={() => preset('web')}><span>Balanced</span><small>For the web</small></button><button aria-pressed={isPreset('email')} onclick={() => preset('email')}><span>Email</span><small>Easy sharing</small></button><button aria-pressed={isPreset('png')} onclick={() => preset('png')}><span>PNG</span><small>Full quality</small></button></div></div>
          <div class="setting-group"><label for="output-format">File format</label><select id="output-format" bind:value={format}>{#each formats as available}<option value={available}>{available === 'jpeg' ? 'JPEG' : available === 'webp' ? 'WebP' : 'PNG'}</option>{/each}</select><p class="hint">{format === 'webp' ? 'A good choice for small files and transparent images.' : format === 'jpeg' ? 'Easy to share and works almost everywhere.' : 'Keeps full image quality and transparent areas.'}</p></div>
          <div class="setting-group"><div class="range-label"><label for="image-quality">Quality</label><output for="image-quality">{format === 'png' ? 'Full quality' : `${quality}%`}</output></div><input id="image-quality" type="range" min="1" max="100" step="1" bind:value={quality} disabled={format === 'png'} /><div class="range-hints"><span>Smaller file</span><span>More detail</span></div></div>
          <div class="setting-group"><label for="image-size">Image size</label><select id="image-size" value={sizeChoice} onchange={(event) => chooseSize(event.currentTarget.value)}><option value="original">Keep original size</option><option value="1920">Large · up to 1920 px</option><option value="1600">Email · up to 1600 px</option><option value="1280">Medium · up to 1280 px</option><option value="800">Small · up to 800 px</option><option value="custom">Custom size…</option></select><p class="hint">Keeps the proportions. Never makes images larger.</p></div>
          <details class="advanced-section" bind:open={moreOptionsOpen}>
            <summary>More options<span>File size, cropping & rotation</span></summary>
            <div class="setting-group"><label for="target-size">Target file size <span class="optional">(KB, optional)</span></label><input id="target-size" type="number" min="1" max="25600" step="1" placeholder="No size target" bind:value={targetKB} disabled={format === 'png'} /><p class="hint">{format === 'png' ? 'Choose WebP or JPEG to set a file-size target.' : 'We adjust quality to fit. If the target is too small, we’ll tell you.'}</p></div>
            {#if format === 'jpeg'}<div class="setting-group"><label for="jpeg-background">Transparency background</label><select id="jpeg-background" bind:value={matte}><option value="light">White</option><option value="dark">Black</option></select></div>{/if}
            <details class="advanced-section" open><summary>Custom dimensions</summary>
              <div class="setting-group"><label for="resize-mode">Resize by</label><select id="resize-mode" bind:value={resizeMode}><option value="longest">Longest edge</option><option value="bounds">Width and height</option><option value="percent">Percentage</option></select></div>
              {#if resizeMode === 'longest'}<div class="setting-group"><label for="longest-edge">Longest edge <span class="optional">(px)</span></label><input id="longest-edge" type="number" min="1" max="8192" step="1" placeholder="Original dimensions" bind:value={maxEdge} /></div>
              {:else if resizeMode === 'bounds'}<div class="dimension-fields"><div class="setting-group"><label for="max-width">Max width (px)</label><input id="max-width" type="number" min="1" max="8192" step="1" placeholder="Original" bind:value={maxWidth} /></div><div class="setting-group"><label for="max-height">Max height (px)</label><input id="max-height" type="number" min="1" max="8192" step="1" placeholder="Original" bind:value={maxHeight} /></div></div>
              {:else}<div class="setting-group"><div class="range-label"><label for="image-scale">Scale</label><output for="image-scale">{scale}%</output></div><input id="image-scale" type="range" min="1" max="100" step="1" bind:value={scale} /></div>{/if}
              <p class="hint">Leave dimensions empty to keep the original size.</p>
            </details>
            <details class="advanced-section"><summary>Crop & transform</summary>
              <div class="setting-group"><label for="crop-ratio">Crop ratio</label><select id="crop-ratio" bind:value={cropRatio}><option value="original">Original proportions</option><option value="1:1">Square · 1:1</option><option value="4:3">Standard · 4:3</option><option value="3:2">Photo · 3:2</option><option value="16:9">Widescreen · 16:9</option></select><p class="hint">Crops from the center before rotating and resizing.</p></div>
              <div class="setting-group"><span class="field-label">Orientation</span><div class="transform-controls"><button onclick={() => { rotation = ((rotation + 90) % 360) as ImageRotation }}>Rotate 90° <span>{rotation}°</span></button><button aria-pressed={flipHorizontal} onclick={() => { flipHorizontal = !flipHorizontal }}>Flip horizontal</button><button aria-pressed={flipVertical} onclick={() => { flipVertical = !flipVertical }}>Flip vertical</button></div></div>
            </details>
          </details>
        </fieldset>
      </div>
      <p class="export-note">{jobs.length > 1 ? 'Settings apply to all your images. ' : ''}Exports are still images. Original camera metadata is removed.</p>
    </aside>
  </div>
  <p class="tool-notes">No uploads or account needed. Up to 20 images and 100 MB per batch. Maximum 40 megapixels per image.</p>
</div>

<style>
  .tool-header { padding-block: var(--space-8); }
  .eyebrow { display: flex; align-items: center; gap: var(--space-2); color: var(--color-muted); font-size: var(--text-xs); letter-spacing: .07em; text-transform: uppercase; }
  h1 { margin-block: var(--space-5) var(--space-6); font-size: clamp(2rem, 4vw, 3rem); line-height: 1.08; letter-spacing: -.045em; font-weight: 500; }
  h1 span { color: var(--color-accent); }
  .intro-row { display: flex; justify-content: space-between; align-items: end; gap: var(--space-6); }
  .intro-row > p { max-width: 43ch; color: var(--color-muted); }
  .privacy { display: inline-flex; gap: var(--space-2); align-items: center; color: var(--color-accent); font-size: var(--text-xs); flex-shrink: 0; }
  .workspace { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: var(--space-8); align-items: start; padding-block: var(--space-8); border-top: 1px solid var(--color-border); }
  .work-area { min-width: 0; }
  .drop-area { display: flex; flex-direction: column; align-items: center; text-align: center; border: 1px dashed var(--color-border-hover); border-radius: var(--radius-lg); padding: var(--space-10) var(--space-5); background: var(--color-surface); transition: border-color var(--transition-base), background var(--transition-base); }
  .drop-area.dragging, .drop-area:focus-within { border-color: var(--color-accent); background: var(--color-surface-hover); }
  .drop-area.has-images { display: flex; flex-direction: row; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3); padding: var(--space-4); text-align: left; }
  .drop-area.has-images .drop-icon, .drop-area.has-images p { display: none; }
  .drop-area.has-images h2 { font-size: var(--text-sm); }
  .drop-area.has-images .browse-button { margin: 0; padding-inline: var(--space-3); }
  .drop-icon { display: grid; place-items: center; width: 52px; height: 52px; margin-bottom: var(--space-5); color: var(--color-accent); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
  .drop-area h2 { font-size: var(--text-xl); font-weight: 500; letter-spacing: -.025em; }
  .drop-area p { color: var(--color-muted); font-size: var(--text-sm); line-height: 1.7; margin-top: var(--space-3); }
  .browse-button { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-3); min-height: 44px; padding: var(--space-2) var(--space-5); margin-top: var(--space-6); border: 1px solid var(--color-accent); border-radius: var(--radius-sm); color: var(--color-accent); cursor: pointer; font-size: var(--text-sm); }
  .browse-button:hover { background: var(--color-surface-hover); }
  .file-input, .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .drop-area:has(.file-input:focus-visible) .browse-button { outline: 2px solid var(--color-accent); outline-offset: 4px; }
  .settings { position: sticky; top: var(--space-5); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-6); }
  .settings-title { flex-shrink: 0; }
  .settings-fields { border-top: 1px solid var(--color-border); padding-top: var(--space-1); }
  .settings-actions { background: var(--color-surface); margin-block: var(--space-3) var(--space-4); }
  .settings-title h2 { font-size: var(--text-xl); font-weight: 500; }
  fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
  .setting-group { margin-top: var(--space-5); }
  .setting-group label, .field-label { display: block; color: var(--color-text); font-size: var(--text-sm); margin-bottom: var(--space-2); }
  .presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
  button, select, input { font: inherit; }
  button { cursor: pointer; }
  .presets button, select, input[type='number'] { min-height: 44px; border: 1px solid var(--color-border-hover); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-text); font-size: var(--text-sm); }
  .presets button { padding: var(--space-3) var(--space-1); }
  .presets button span, .presets button small { display: block; }
  .presets button small { margin-top: var(--space-1); font-size: var(--text-xs); color: var(--color-muted); }
  .presets button:hover, .presets button[aria-pressed="true"] { color: var(--color-accent); border-color: var(--color-accent); }
  select, input[type='number'] { width: 100%; padding: var(--space-2) var(--space-3); }
  .hint { margin-top: var(--space-2); color: var(--color-muted); font-size: var(--text-xs); line-height: 1.6; }
  .optional { color: var(--color-muted); }
  .range-label { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-3); }
  output { color: var(--color-accent); font-size: var(--text-sm); font-variant-numeric: tabular-nums; }
  input[type='range'] { width: 100%; min-height: 28px; accent-color: var(--color-accent); cursor: pointer; }
  .range-hints { display: flex; justify-content: space-between; color: var(--color-muted); font-size: var(--text-xs); }
  .zip-button { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: 48px; border: 1px solid var(--color-accent); border-radius: var(--radius-sm); padding: var(--space-3); font-size: var(--text-sm); }
  .zip-button { background: var(--color-accent); color: var(--color-background); margin-top: var(--space-4); font-weight: 600; text-decoration: none; }
  .zip-button:hover { background: var(--color-accent-hover); color: var(--color-background); }
  .zip-button:disabled { background: var(--color-bg); color: var(--color-muted); border-color: var(--color-border); opacity: 1; }
  button:disabled, input:disabled, fieldset:disabled, .disabled { opacity: .5; cursor: not-allowed; }
  .conversion-status { margin-top: var(--space-3); font-size: var(--text-xs); color: var(--color-muted); min-height: 20px; }
  .batch-summary { margin-top: var(--space-3); }
  .batch-summary > div { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-3); font-size: var(--text-xs); color: var(--color-muted); }
  .batch-summary strong { color: var(--color-accent); font-size: var(--text-xl); font-weight: 500; }
  .batch-summary p, .export-note { color: var(--color-muted); font-size: var(--text-xs); line-height: 1.6; margin-top: var(--space-2); }
  .export-note { border-top: 1px solid var(--color-border); padding-top: var(--space-4); margin-top: var(--space-4); }
  .empty-note { padding-block: var(--space-5); color: var(--color-muted); font-size: var(--text-xs); font-family: var(--font-mono); }
  .queue, .preview { margin-top: var(--space-8); }
  .section-heading { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); }
  .section-heading h2 { font-size: var(--text-sm); font-weight: 500; flex-shrink: 0; }
  .text-button { border: 0; background: transparent; color: var(--color-muted); min-height: 44px; font-size: var(--text-xs); }
  .text-button:hover { color: var(--color-accent); }
  .file-list { list-style: none; padding: 0; margin: 0; }
  .file-list li { display: flex; align-items: center; border-bottom: 1px solid var(--color-border); border-left: 2px solid transparent; }
  .file-list li.selected { border-left-color: var(--color-accent); background: var(--color-surface); }
  .file-select { display: flex; align-items: center; gap: var(--space-3); text-align: left; min-width: 0; flex: 1; border: 0; background: transparent; color: var(--color-text); padding: var(--space-3); }
  .file-select img { width: 44px; height: 44px; object-fit: cover; border-radius: var(--radius-sm); flex-shrink: 0; }
  .file-info { min-width: 0; flex: 1; }
  .file-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-sm); }
  .file-meta { display: block; margin-top: var(--space-1); color: var(--color-muted); font-size: var(--text-xs); }
  .file-meta span { color: var(--color-accent); }
  .file-status { color: var(--color-accent); font-size: var(--text-xs); max-width: 100px; text-align: right; }
  .file-status.larger { color: var(--color-warning); }
  .remove-button, .download-one { display: grid; place-items: center; min-width: 36px; min-height: 44px; border: 0; background: transparent; color: var(--color-muted); }
  .download-one { color: var(--color-accent); }
  .download-one :global(svg) { transform: rotate(180deg); }
  .remove-button:hover { color: var(--color-danger); }
  .preview { border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
  .preview .section-heading { margin: 0; padding: var(--space-4); }
  .preview .section-heading > div { min-width: 0; }
  .preview-badge { font-size: var(--text-xs); color: var(--color-accent); white-space: nowrap; }
  .upload-actions { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-3); }
  .preview-name { margin-top: var(--space-1); min-width: 0; max-width: 32ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-xs); color: var(--color-muted); }
  .original-preview { padding: var(--space-4); background: var(--color-surface); text-align: center; }
  .original-preview img { max-height: 280px; width: 100%; object-fit: contain; }
  .original-preview p { font-size: var(--text-xs); color: var(--color-muted); margin-top: var(--space-4); }
  .preview-details { display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3); border-top: 1px solid var(--color-border); padding: var(--space-4); font-size: var(--text-xs); color: var(--color-muted); }
  .size-tip { padding: 0 var(--space-4) var(--space-4); font-size: var(--text-xs); color: var(--color-warning); }
  .notice { padding: var(--space-4); margin-top: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--text-sm); overflow-wrap: anywhere; }
  .error { color: var(--color-danger); }
  .preview .notice { margin: var(--space-4); }
  .settings-heading { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); }
  .settings-heading .text-button { color: var(--color-accent); }
  .advanced-section { border-top: 1px solid var(--color-border); margin-top: var(--space-5); padding-top: var(--space-4); }
  summary { cursor: pointer; min-height: 44px; font-size: var(--text-sm); color: var(--color-text); }
  summary > span { display: block; margin-top: var(--space-1); margin-left: var(--space-4); font-size: var(--text-xs); color: var(--color-muted); }
  .advanced-section .setting-group { margin-top: var(--space-3); }
  .dimension-fields { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
  .transform-controls { display: grid; gap: var(--space-2); }
  .transform-controls button { display: flex; justify-content: space-between; min-height: 44px; padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-text); font-size: var(--text-xs); }
  .transform-controls button[aria-pressed='true'] { color: var(--color-accent); border-color: var(--color-accent); }
  .tool-notes { border-top: 1px solid var(--color-border); padding-block: var(--space-5); color: var(--color-muted); font-size: var(--text-xs); }
  @media (max-width: 850px) { .workspace { grid-template-columns: minmax(0, 1fr) 300px; gap: var(--space-5); } .settings { padding: var(--space-4); } .intro-row { align-items: start; flex-direction: column; gap: var(--space-4); } .file-select { display: grid; grid-template-columns: 44px minmax(0, 1fr); row-gap: var(--space-1); } .file-select img { grid-row: 1 / span 2; } .file-info { grid-column: 2; grid-row: 1; } .file-status { grid-column: 2; text-align: left; max-width: none; } }
  @media (max-width: 680px) { .tool-header { padding-block: var(--space-8); } .workspace { display: flex; flex-direction: column; padding-top: var(--space-5); } .work-area, .settings { width: 100%; } .settings { position: static; max-height: none; padding: var(--space-5); } .settings-fields { overflow: visible; } .drop-area { padding-block: var(--space-8); }  .file-select { padding-inline: var(--space-2); gap: var(--space-2); } }
  @media (prefers-reduced-motion: reduce) { .drop-area { transition: none; } }
</style>
