<script lang="ts">
  import { toastStore } from '$lib/stores/toast.svelte'

  interface Props {
    slug: string
    previewUrl: string | null
    onupload: (result: {
      previewUrl: string
      r2Key: string
      r2KeyFull: string
    }) => void
    onremove: () => void
  }
  let { slug, previewUrl, onupload, onremove }: Props = $props()

  let isCoverUploading = $state(false)

  async function handleCoverUpload(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    if (!slug) {
      toastStore.error('Please enter a slug before uploading a cover image')
      return
    }

    isCoverUploading = true
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('postSlug', slug)
      const res = await fetch('/admin/blog/upload-cover', {
        method: 'POST',
        body: fd
      })
      if (!res.ok) throw new Error('Upload failed')
      const result = await res.json()
      onupload({
        previewUrl: result.mediumUrl,
        r2Key: result.mediumKey,
        r2KeyFull: result.fullKey
      })
      toastStore.success('Cover image uploaded')
    } catch {
      toastStore.error('Failed to upload cover image')
    } finally {
      isCoverUploading = false
    }
  }
</script>

<div class="sidebar-card">
  <h3>Cover Image</h3>
  {#if previewUrl}
    <img src={previewUrl} alt="Cover preview" class="cover-preview" />
    <button
      type="button"
      class="btn text small"
      onclick={onremove}
      aria-label="Remove cover image">Remove</button
    >
  {:else}
    <label class="upload-area" class:uploading={isCoverUploading}>
      <input
        type="file"
        accept="image/*"
        class="sr-only"
        onchange={handleCoverUpload}
        disabled={isCoverUploading}
      />
      {#if isCoverUploading}
        <span>Uploading...</span>
      {:else}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
            points="17 8 12 3 7 8"
          /><line x1="12" y1="3" x2="12" y2="15" /></svg
        >
        <span>Upload cover image</span>
      {/if}
    </label>
  {/if}
</div>

<style>
  .sidebar-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .sidebar-card h3 {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .cover-preview {
    width: 100%;
    border-radius: var(--radius-md);
    aspect-ratio: 16/9;
    object-fit: cover;
  }

  .upload-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-6);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    transition: all var(--transition-fast);
  }

  .upload-area:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .upload-area.uploading {
    opacity: 0.6;
    pointer-events: none;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
