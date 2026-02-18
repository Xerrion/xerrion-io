<script lang="ts">
  import { upload } from '@vercel/blob/client';
  import { motion } from '@humanspeak/svelte-motion';

  let { data } = $props();

  type UploadStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'error';

  const STEP_PROGRESS: Record<string, number> = {
    fetching: 72,
    decoding: 75,
    normalizing: 78,
    'resizing:thumb': 82,
    'resizing:medium': 86,
    'resizing:full': 90,
    'uploading:thumb': 93,
    'uploading:medium': 95,
    'uploading:full': 97,
    saving: 98,
    cleanup: 99,
    done: 100
  };

  const STEP_LABELS: Record<string, string> = {
    fetching: 'Fetching…',
    decoding: 'Decoding HEIC…',
    normalizing: 'Normalizing…',
    'resizing:thumb': 'Resizing thumbnail…',
    'resizing:medium': 'Resizing medium…',
    'resizing:full': 'Resizing full…',
    'uploading:thumb': 'Saving thumbnail…',
    'uploading:medium': 'Saving medium…',
    'uploading:full': 'Saving full…',
    saving: 'Saving to database…',
    cleanup: 'Cleaning up…'
  };

  interface FileUploadItem {
    file: File;
    status: UploadStatus;
    progress: number;
    stepLabel: string;
    error?: string;
  }

  let fileUploads = $state<FileUploadItem[]>([]);
  let uploading = $state(false);
  let categoryId = $state('');
  let fileInput = $state<HTMLInputElement | null>(null);
  let dragActive = $state(false);

  let doneCount = $derived(fileUploads.filter(f => f.status === 'done').length);
  let errorCount = $derived(fileUploads.filter(f => f.status === 'error').length);
  let totalCount = $derived(fileUploads.length);
  let overallDone = $derived(totalCount > 0 && fileUploads.every(f => f.status === 'done' || f.status === 'error'));

  const ACCEPTED_TYPES = '.jpg,.jpeg,.png,.webp,.heic,.heif';
  const MAX_SIZE = 50 * 1024 * 1024;

  function handleDrop(e: DragEvent) {
    if (uploading) return;
    dragActive = false;
    if (!e.dataTransfer?.files) return;
    addFiles(Array.from(e.dataTransfer.files));
  }

  function handleFileSelect(e: Event) {
    if (uploading) return;
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    addFiles(Array.from(input.files));
    input.value = '';
  }

  function addFiles(files: File[]) {
    if (uploading) return;
    const valid = files.filter((f) => {
      const ext = f.name.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext ?? '') && f.size <= MAX_SIZE;
    });

    const newUploads = valid.map(f => ({
      file: f,
      status: 'pending' as UploadStatus,
      progress: 0,
      stepLabel: ''
    }));

    fileUploads = [...fileUploads, ...newUploads];
  }

  function removeFile(index: number) {
    if (uploading) return;
    fileUploads = fileUploads.filter((_, i) => i !== index);
  }

  function clearFiles() {
    if (uploading) return;
    fileUploads = [];
  }

  function formatBytes(bytes: number) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function isHeic(name: string) {
    const ext = name.toLowerCase().split('.').pop();
    return ext === 'heic' || ext === 'heif';
  }

  async function readProcessStream(response: Response, item: FileUploadItem): Promise<void> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const match = line.match(/^data:\s*(.+)$/m);
        if (!match) continue;

        const event = JSON.parse(match[1]);

        if (event.step === 'done') {
          if (event.error) {
            throw new Error(event.error);
          }
          item.progress = 100;
          item.stepLabel = '';
          return;
        }

        item.progress = STEP_PROGRESS[event.step] ?? item.progress;
        item.stepLabel = STEP_LABELS[event.step] ?? '';
      }
    }
  }

  async function uploadFile(index: number) {
    const item = fileUploads[index];
    item.status = 'uploading';
    item.progress = 0;
    item.stepLabel = 'Uploading…';

    try {
      const blob = await upload(item.file.name, item.file, {
        access: 'public',
        handleUploadUrl: '/admin/gallery/upload/api',
        multipart: item.file.size > 4 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => {
          item.progress = Math.round(percentage * 0.7);
          item.stepLabel = `Uploading… ${Math.round(percentage)}%`;
        }
      });

      item.status = 'processing';
      item.progress = 70;
      item.stepLabel = 'Starting processing…';

      const processResponse = await fetch('/admin/gallery/upload/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blobUrl: blob.url,
          originalName: item.file.name,
          categoryId: Number(categoryId)
        })
      });

      if (!processResponse.ok) {
        const errData = await processResponse.json().catch(() => null);
        throw new Error(errData?.message || `Processing failed (${processResponse.status})`);
      }

      await readProcessStream(processResponse, item);

      item.status = 'done';
      item.progress = 100;
      item.stepLabel = '';
    } catch (err) {
      item.status = 'error';
      item.error = err instanceof Error ? err.message : 'Upload failed';
      item.stepLabel = '';
    }
  }

  async function startUpload() {
    if (uploading || fileUploads.length === 0 || !categoryId) return;

    uploading = true;
    let index = 0;

    async function processNext() {
      while (index < fileUploads.length) {
        const currentIndex = index++;
        if (fileUploads[currentIndex].status === 'done') continue;
        await uploadFile(currentIndex);
      }
    }

    const workers = Array.from({ length: Math.min(3, fileUploads.length) }, () => processNext());
    await Promise.all(workers);
  }

  function resetUpload() {
    uploading = false;
    fileUploads = [];
  }
</script>

<div class="page">
  <header class="header">
    <div class="title-group">
      <h1>Upload Photos</h1>
      <a href="/admin/gallery" class="btn secondary small">← Back to Gallery</a>
    </div>
  </header>

  <!-- Overall Progress Banner -->
  {#if uploading || overallDone}
    <div class="results-panel">
      <div class="results-summary" class:all-success={doneCount === totalCount} class:has-errors={errorCount > 0} class:uploading={!overallDone}>
        {#if !overallDone}
           <span class="spinner summary-icon"></span>
           <span>Uploading {doneCount + errorCount + 1} of {totalCount}...</span>
        {:else if errorCount === 0}
           <span class="summary-icon">✓</span>
           <span>All {totalCount} photos uploaded successfully</span>
        {:else}
           <span class="summary-icon">!</span>
           <span>{doneCount} of {totalCount} uploaded, {errorCount} failed</span>
        {/if}
        
        {#if overallDone}
           <button class="btn secondary small reset-btn" onclick={resetUpload}>
              Upload more
           </button>
        {/if}
      </div>
    </div>
  {/if}

  <div class="upload-container">
    <div class="form-section">
      <label for="categoryId" class="field-label">Category</label>
      <select 
        id="categoryId" 
        bind:value={categoryId} 
        disabled={uploading}
        class:error={!categoryId && fileUploads.length > 0}
      >
        <option value="">Select a category...</option>
        {#each data.categories as category}
          <option value={category.id}>{category.name}</option>
        {/each}
      </select>
      {#if data.categories.length === 0}
        <p class="hint">No categories yet. <a href="/admin/gallery/categories">Create one first</a>.</p>
      {/if}
    </div>

    <div
      class="drop-zone"
      class:active={dragActive}
      class:has-files={fileUploads.length > 0}
      class:disabled={uploading}
      role="button"
      tabindex="0"
      ondragenter={(e) => { e.preventDefault(); dragActive = true; }}
      ondragover={(e) => { e.preventDefault(); dragActive = true; }}
      ondragleave={() => { dragActive = false; }}
      ondrop={(e) => { e.preventDefault(); handleDrop(e); }}
      onclick={() => !uploading && fileInput?.click()}
      onkeydown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !uploading) fileInput?.click(); }}
    >
      <input
        bind:this={fileInput}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        onchange={handleFileSelect}
        class="file-input"
        disabled={uploading}
      />

      <div class="drop-content">
        <div class="drop-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        </div>
        <p class="drop-text">
          {#if dragActive}
            Drop files here
          {:else}
            Drag & drop images here, or click to browse
          {/if}
        </p>
        <p class="drop-hint">JPEG, PNG, WebP, HEIC/HEIF — max 50MB per file</p>
      </div>
    </div>

    {#if fileUploads.length > 0}
      <div class="file-list">
        <div class="file-list-header">
          <span class="file-count">{fileUploads.length} file{fileUploads.length !== 1 ? 's' : ''} selected</span>
          <button 
            type="button" 
            class="btn text small" 
            onclick={clearFiles} 
            disabled={uploading}
          >
            Clear all
          </button>
        </div>

        <div class="file-items">
          {#each fileUploads as item, index}
            <div class="file-item" class:error={item.status === 'error'}>
              <div class="file-info">
                <div class="file-header">
                   <span class="file-name" title={item.file.name}>{item.file.name}</span>
                   <span class="file-meta">
                     {formatBytes(item.file.size)}
                     {#if isHeic(item.file.name)}
                       <span class="heic-badge">HEIC</span>
                     {/if}
                   </span>
                </div>
                
                <div class="progress-container">
                   <motion.div
                     class="progress-bar {item.status}"
                     animate={{ width: `${item.progress}%` }}
                     transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                   />
                </div>
                
                {#if item.stepLabel}
                   <div class="step-label">{item.stepLabel}</div>
                {/if}
                
                {#if item.status === 'error' && item.error}
                   <div class="error-message">{item.error}</div>
                {/if}
              </div>

              <div class="file-actions">
                 {#if item.status === 'pending'}
                    <button 
                      type="button" 
                      class="btn icon small" 
                      onclick={() => removeFile(index)} 
                      disabled={uploading} 
                      aria-label="Remove file"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                 {:else if item.status === 'uploading' || item.status === 'processing'}
                    <div class="status-spinner"></div>
                 {:else if item.status === 'done'}
                    <div class="status-icon success">✓</div>
                 {:else if item.status === 'error'}
                    <div class="status-icon error">✕</div>
                 {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="submit-area">
        <p class="processing-note">
          Each image will be converted to 3 WebP sizes (thumbnail, medium, full).
          {#if fileUploads.some((f) => isHeic(f.file.name))}
            HEIC files will be converted automatically.
          {/if}
        </p>

        {#if !uploading && !overallDone}
           <button 
             type="button" 
             class="btn primary" 
             onclick={startUpload}
             disabled={uploading || !categoryId || fileUploads.length === 0}
           >
             Upload {fileUploads.length} image{fileUploads.length !== 1 ? 's' : ''}
           </button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .page {
    padding: var(--space-6);
    max-width: 800px;
    margin: 0 auto;
    color: var(--color-text);
  }

  .header {
    margin-bottom: var(--space-8);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-4);
  }

  .title-group {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  h1 {
    font-size: var(--text-2xl);
    font-weight: 600;
    margin: 0;
  }

  /* Results Panel */
  .results-panel {
    margin-bottom: var(--space-6);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .results-summary {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .results-summary.uploading {
    background-color: var(--color-bg-secondary);
    color: var(--color-text);
  }

  .results-summary.all-success {
    background-color: rgba(34, 197, 94, 0.1);
    color: #166534;
  }

  .results-summary.has-errors {
    background-color: rgba(245, 158, 11, 0.1);
    color: #92400e;
  }

  .summary-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    font-weight: 700;
    font-size: var(--text-xs);
  }

  .all-success .summary-icon {
    background-color: rgba(34, 197, 94, 0.2);
  }

  .has-errors .summary-icon {
    background-color: rgba(245, 158, 11, 0.2);
  }

  /* Form & Drop Zone */
  .form-section {
    margin-bottom: var(--space-6);
  }

  .field-label {
    display: block;
    font-size: var(--text-xs);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-2);
  }

  select {
    width: 100%;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background-color: var(--color-surface);
    color: var(--color-text);
    font-size: var(--text-sm);
    font-family: var(--font-sans);
    cursor: pointer;
    transition: border-color var(--transition-fast);
  }

  select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-light);
  }

  select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  select.error {
    border-color: #ef4444;
  }

  .hint {
    margin-top: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .hint a {
    color: var(--color-primary);
    text-decoration: underline;
  }

  .drop-zone {
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-12) var(--space-6);
    text-align: center;
    cursor: pointer;
    transition: all var(--transition-base);
    background: var(--color-surface);
    margin-bottom: var(--space-6);
  }

  .drop-zone:hover,
  .drop-zone:focus-visible {
    border-color: var(--color-primary-light);
    background: var(--color-bg-secondary);
  }

  .drop-zone:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-primary-light);
  }

  .drop-zone.active {
    border-color: var(--color-primary);
    background: rgba(91, 94, 224, 0.05);
    border-style: solid;
  }

  .drop-zone.has-files {
    padding: var(--space-6);
    border-style: solid;
    border-color: var(--color-primary-light);
  }

  .drop-zone.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .file-input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }

  .drop-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  .drop-icon {
    color: var(--color-text-muted);
    transition: color var(--transition-fast);
  }

  .drop-zone:hover .drop-icon,
  .drop-zone.active .drop-icon {
    color: var(--color-primary);
  }

  .drop-text {
    margin: 0;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .drop-hint {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  /* File List */
  .file-list {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin-bottom: var(--space-6);
  }

  .file-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
  }

  .file-count {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .file-items {
    max-height: 400px;
    overflow-y: auto;
  }

  .file-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    transition: background var(--transition-fast);
  }

  .file-item:last-child {
    border-bottom: none;
  }

  .file-item:hover {
    background: var(--color-surface-hover);
  }

  .file-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
    flex: 1;
    margin-right: var(--space-4);
  }

  .file-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .file-name {
    font-size: var(--text-sm);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-meta {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .heic-badge {
    display: inline-block;
    padding: 1px 5px;
    background: rgba(91, 94, 224, 0.1);
    color: var(--color-primary);
    font-size: 10px;
    font-weight: 600;
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Progress Bar */
  .progress-container {
    height: 4px;
    background: var(--color-bg-secondary);
    border-radius: var(--radius-full);
    overflow: hidden;
    width: 100%;
  }

  :global(.progress-bar) {
    height: 100%;
    width: 0%;
    border-radius: var(--radius-full);
    background: var(--color-border);
  }

  :global(.progress-bar.uploading) {
    background: var(--color-primary);
  }

  :global(.progress-bar.processing) {
    background: var(--color-primary);
    position: relative;
    overflow: hidden;
  }

  :global(.progress-bar.processing)::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    animation: pulse-bar 1.5s infinite;
  }

  :global(.progress-bar.done) {
    background: #22c55e;
  }

  :global(.progress-bar.error) {
    background: #ef4444;
  }

  .step-label {
    font-size: 11px;
    color: var(--color-text-muted);
    margin-top: 2px;
  }
  
  .error-message {
    color: #ef4444;
    font-size: var(--text-xs);
    margin-top: 2px;
  }

  @keyframes pulse-bar {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  /* Status Icons & Buttons */
  .file-actions {
    flex-shrink: 0;
    width: 24px;
    display: flex;
    justify-content: center;
  }

  .status-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-primary-light);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .status-icon {
    font-weight: bold;
    font-size: var(--text-sm);
  }

  .status-icon.success { color: #22c55e; }
  .status-icon.error { color: #ef4444; }

  .submit-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
  }

  .processing-note {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-align: center;
    margin: 0;
  }

  /* Upload page btn overrides */
  .btn {
    padding: var(--space-3) var(--space-6);
  }

  .btn.primary {
    min-width: 200px;
  }

  .btn.primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .btn.icon {
    padding: var(--space-1);
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .btn.icon:hover:not(:disabled) {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    border-radius: var(--radius-sm);
  }

  .btn.small {
    padding: var(--space-2) var(--space-3);
  }

  .reset-btn {
    margin-left: auto;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  .summary-icon.spinner {
    border-color: rgba(0, 0, 0, 0.1);
    border-top-color: var(--color-primary);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
