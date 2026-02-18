<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';

  let { data } = $props();
  let uploading = $state(false);
  let dragActive = $state(false);
  let selectedFiles = $state<File[]>([]);
  let fileInput = $state<HTMLInputElement | null>(null);

  const ACCEPTED_TYPES = '.jpg,.jpeg,.png,.webp,.heic,.heif';
  const MAX_SIZE = 50 * 1024 * 1024;

  function handleDrop(e: DragEvent) {
    dragActive = false;
    if (!e.dataTransfer?.files) return;
    addFiles(Array.from(e.dataTransfer.files));
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    addFiles(Array.from(input.files));
    input.value = '';
  }

  function addFiles(files: File[]) {
    const valid = files.filter((f) => {
      const ext = f.name.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext ?? '') && f.size <= MAX_SIZE;
    });
    selectedFiles = [...selectedFiles, ...valid];
  }

  function removeFile(index: number) {
    selectedFiles = selectedFiles.filter((_, i) => i !== index);
  }

  function clearFiles() {
    selectedFiles = [];
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

  let results = $derived(page.form?.results as { name: string; success: boolean; error?: string }[] | undefined);
  let summary = $derived(page.form?.summary as { total: number; success: number; failed: number } | undefined);
</script>

<div class="page">
  <header class="header">
    <div class="title-group">
      <h1>Upload Photos</h1>
      <a href="/admin/gallery" class="btn secondary small">← Back to Gallery</a>
    </div>
  </header>

  {#if page.form?.error}
    <div class="message error">{page.form.error}</div>
  {/if}

  {#if results && summary}
    <div class="results-panel">
      <div class="results-summary" class:all-success={summary.failed === 0} class:has-errors={summary.failed > 0}>
        <span class="summary-icon">{summary.failed === 0 ? '✓' : '!'}</span>
        <span>{summary.success} of {summary.total} uploaded successfully</span>
        {#if summary.failed > 0}
          <span class="failed-count">({summary.failed} failed)</span>
        {/if}
      </div>
      <div class="results-list">
        {#each results as result}
          <div class="result-item" class:success={result.success} class:error={!result.success}>
            <span class="result-status">{result.success ? '✓' : '✕'}</span>
            <span class="result-name">{result.name}</span>
            {#if result.error}
              <span class="result-error">{result.error}</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <form
    method="POST"
    action="?/upload"
    enctype="multipart/form-data"
    use:enhance={({ formData, cancel }) => {
      if (selectedFiles.length === 0) {
        cancel();
        return;
      }
      formData.delete('files');
      for (const file of selectedFiles) {
        formData.append('files', file);
      }
      uploading = true;
      return async ({ update }) => {
        await update();
        uploading = false;
        selectedFiles = [];
      };
    }}
  >
    <div class="form-section">
      <label for="categoryId" class="field-label">Category</label>
      <select id="categoryId" name="categoryId" required disabled={uploading}>
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
      class:has-files={selectedFiles.length > 0}
      class:disabled={uploading}
      role="button"
      tabindex="0"
      ondragenter={(e) => { e.preventDefault(); dragActive = true; }}
      ondragover={(e) => { e.preventDefault(); dragActive = true; }}
      ondragleave={() => { dragActive = false; }}
      ondrop={(e) => { e.preventDefault(); handleDrop(e); }}
      onclick={() => fileInput?.click()}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInput?.click(); }}
    >
      <input
        bind:this={fileInput}
        type="file"
        name="files"
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

    {#if selectedFiles.length > 0}
      <div class="file-list">
        <div class="file-list-header">
          <span class="file-count">{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected</span>
          <button type="button" class="btn text small" onclick={clearFiles} disabled={uploading}>Clear all</button>
        </div>

        <div class="file-items">
          {#each selectedFiles as file, index}
            <div class="file-item">
              <div class="file-info">
                <span class="file-name" title={file.name}>{file.name}</span>
                <span class="file-meta">
                  {formatBytes(file.size)}
                  {#if isHeic(file.name)}
                    <span class="heic-badge">HEIC</span>
                  {/if}
                </span>
              </div>
              <button type="button" class="btn icon small" onclick={() => removeFile(index)} disabled={uploading} aria-label="Remove file">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          {/each}
        </div>
      </div>

      <div class="submit-area">
        <p class="processing-note">
          Each image will be converted to 3 WebP sizes (thumbnail, medium, full).
          {#if selectedFiles.some((f) => isHeic(f.name))}
            HEIC files will be converted automatically.
          {/if}
        </p>

        <button type="submit" class="btn primary" disabled={uploading || data.categories.length === 0}>
          {#if uploading}
            <span class="spinner"></span>
            Processing {selectedFiles.length} image{selectedFiles.length !== 1 ? 's' : ''}...
          {:else}
            Upload {selectedFiles.length} image{selectedFiles.length !== 1 ? 's' : ''}
          {/if}
        </button>
      </div>
    {/if}
  </form>
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

  .message {
    margin-bottom: var(--space-6);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }

  .message.error {
    background-color: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

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

  .failed-count {
    color: #ef4444;
  }

  .results-list {
    border-top: 1px solid var(--color-border);
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
    border-bottom: 1px solid var(--color-border);
  }

  .result-item:last-child {
    border-bottom: none;
  }

  .result-status {
    flex-shrink: 0;
    width: 18px;
    text-align: center;
    font-weight: 600;
  }

  .result-item.success .result-status {
    color: #22c55e;
  }

  .result-item.error .result-status {
    color: #ef4444;
  }

  .result-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .result-error {
    color: #ef4444;
    font-size: var(--text-xs);
    flex-shrink: 0;
  }

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
    max-height: 300px;
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
    gap: 2px;
    min-width: 0;
    flex: 1;
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

  .btn {
    padding: var(--space-3) var(--space-6);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    transition: all var(--transition-fast);
    border: none;
  }

  .btn.primary {
    background-color: var(--color-primary);
    color: white;
    min-width: 200px;
  }

  .btn.primary:hover:not(:disabled) {
    background-color: var(--color-primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .btn.primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn.secondary {
    background-color: var(--color-bg-secondary);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .btn.secondary:hover {
    background-color: var(--color-bg-tertiary);
  }

  .btn.text {
    background: none;
    color: var(--color-text-secondary);
    padding: var(--space-1) var(--space-2);
  }

  .btn.text:hover {
    color: var(--color-primary);
  }

  .btn.text:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn.icon {
    padding: var(--space-1);
    background: transparent;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .btn.icon:hover:not(:disabled) {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    border-radius: var(--radius-sm);
  }

  .btn.icon:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn.small {
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
