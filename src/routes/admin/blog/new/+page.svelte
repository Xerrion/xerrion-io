<script lang="ts">
  import { browser } from '$app/environment'
  import { superForm } from 'sveltekit-superforms'
  import { zod4Client } from 'sveltekit-superforms/adapters'
  import { toastStore } from '$lib/stores/toast.svelte'
  import { postCreateSchema } from '$lib/schemas/blog'
  import { toSlug } from '$lib/utils/slug'

  let { data } = $props()

  // svelte-ignore state_referenced_locally
  const { form, enhance, submitting, errors } = superForm(data.form, {
    validators: zod4Client(postCreateSchema),
    onResult({ result }) {
      if (result.type === 'failure') {
        toastStore.error('Please fix the errors and try again')
      }
    }
  })

  // Slug auto-gen: track if user has manually edited the slug
  let isSlugManuallyEdited = $state(false)

  $effect(() => {
    if (!isSlugManuallyEdited && $form.title) {
      $form.slug = toSlug($form.title)
    }
  })

  // Reading time estimate (client-side for live feedback)
  let readingTimeMinutes = $derived.by(() => {
    const trimmed = $form.content.trim()
    if (!trimmed) return 0
    return Math.max(1, Math.round(trimmed.split(/\s+/).length / 200))
  })

  // Tag selection
  let selectedTagIds = $state<Set<number>>(new Set())
  let tagSuggestions = $state<string[]>([])
  let isSuggestionsLoading = $state(false)

  function toggleTag(id: number) {
    const next = new Set(selectedTagIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedTagIds = next
    $form.tagIds = [...selectedTagIds]
  }

  async function getAiSuggestions() {
    isSuggestionsLoading = true
    try {
      const res = await fetch('/api/blog/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: $form.title,
          content: $form.content,
          existingTags: data.tags.map((t) => t.name)
        })
      })
      const json = await res.json()
      tagSuggestions = json.suggestions ?? []
    } catch {
      toastStore.error('Failed to get tag suggestions')
    } finally {
      isSuggestionsLoading = false
    }
  }

  function acceptSuggestion(suggestion: string) {
    const existing = data.tags.find(
      (t) => t.name.toLowerCase() === suggestion.toLowerCase()
    )
    if (existing) {
      toggleTag(existing.id)
    }
    tagSuggestions = tagSuggestions.filter((s) => s !== suggestion)
  }

  function dismissSuggestion(suggestion: string) {
    tagSuggestions = tagSuggestions.filter((s) => s !== suggestion)
  }

  // Cover image upload
  let coverPreviewUrl = $state<string | null>(null)
  let isCoverUploading = $state(false)
  let coverR2Key = $state<string | null>(null)
  let coverR2KeyFull = $state<string | null>(null)

  async function handleCoverUpload(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    if (!$form.slug) {
      toastStore.error('Please enter a slug before uploading a cover image')
      return
    }

    isCoverUploading = true
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('postSlug', $form.slug)
      const res = await fetch('/admin/blog/upload-cover', {
        method: 'POST',
        body: fd
      })
      if (!res.ok) throw new Error('Upload failed')
      const result = await res.json()
      coverPreviewUrl = result.mediumUrl
      coverR2Key = result.mediumKey
      coverR2KeyFull = result.fullKey
      toastStore.success('Cover image uploaded')
    } catch {
      toastStore.error('Failed to upload cover image')
    } finally {
      isCoverUploading = false
    }
  }

  function removeCoverImage() {
    coverPreviewUrl = null
    coverR2Key = null
    coverR2KeyFull = null
  }

  // TipTap editor
  let editorEl = $state<HTMLElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tiptapEditor = $state<any>(null)

  $effect(() => {
    if (!browser || $form.editorMode !== 'tiptap' || !editorEl || tiptapEditor)
      return

    let isDestroyed = false

    import('@tiptap/core').then(({ Editor }) =>
      Promise.all([
        import('@tiptap/starter-kit'),
        import('@tiptap/extension-link'),
        import('tiptap-markdown')
      ]).then(([{ default: StarterKit }, { default: Link }, { Markdown }]) => {
        if (isDestroyed || !editorEl) return
        tiptapEditor = new Editor({
          element: editorEl,
          extensions: [StarterKit, Link, Markdown],
          content: $form.content || '',
          onUpdate({ editor }) {
            // @ts-ignore - tiptap-markdown storage access
            $form.content = editor.storage.markdown.getMarkdown()
          }
        })
      })
    )

    return () => {
      isDestroyed = true
      if (tiptapEditor) {
        tiptapEditor.destroy()
        tiptapEditor = null
      }
    }
  })

  function setEditorMode(mode: 'markdown' | 'tiptap') {
    if (tiptapEditor && mode === 'markdown') {
      // @ts-ignore - tiptap-markdown storage access
      $form.content = tiptapEditor.storage.markdown.getMarkdown()
      tiptapEditor.destroy()
      tiptapEditor = null
    }
    $form.editorMode = mode
  }
</script>

<svelte:head>
  <title>New Post | Admin</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <a href="/admin/blog" class="back-link">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg
      >
      All Posts
    </a>
    <h1>New Post</h1>
  </header>

  <form method="POST" use:enhance class="post-form">
    <!-- Hidden fields for data not directly in form inputs -->
    <input type="hidden" name="editorMode" value={$form.editorMode} />
    <input type="hidden" name="content" value={$form.content} />
    {#each $form.tagIds as tagId}
      <input type="hidden" name="tagIds" value={tagId} />
    {/each}
    {#if coverR2Key}<input
        type="hidden"
        name="coverR2Key"
        value={coverR2Key}
      />{/if}
    {#if coverR2KeyFull}<input
        type="hidden"
        name="coverR2KeyFull"
        value={coverR2KeyFull}
      />{/if}

    <div class="form-layout">
      <div class="form-main">
        <!-- Editor mode toggle -->
        <div class="editor-mode-toggle">
          <button
            type="button"
            class="mode-btn"
            class:active={$form.editorMode === 'markdown'}
            onclick={() => setEditorMode('markdown')}>Markdown</button
          >
          <button
            type="button"
            class="mode-btn"
            class:active={$form.editorMode === 'tiptap'}
            onclick={() => setEditorMode('tiptap')}>Rich Text</button
          >
        </div>

        <!-- Title -->
        <div class="field">
          <label for="title">Title</label>
          <input
            id="title"
            type="text"
            name="title"
            placeholder="Post title"
            bind:value={$form.title}
            disabled={$submitting}
            class:error={$errors.title}
          />
          {#if $errors.title}<span class="field-error">{$errors.title}</span
            >{/if}
        </div>

        <!-- Slug -->
        <div class="field">
          <label for="slug">Slug</label>
          <input
            id="slug"
            type="text"
            name="slug"
            placeholder="post-slug"
            bind:value={$form.slug}
            oninput={() => (isSlugManuallyEdited = true)}
            disabled={$submitting}
            class:error={$errors.slug}
          />
          {#if $errors.slug}<span class="field-error">{$errors.slug}</span>{/if}
          <span class="field-hint">URL: /blog/{$form.slug || 'your-slug'}</span>
        </div>

        <!-- Description -->
        <div class="field">
          <label for="description"
            >Description <span class="optional">(optional)</span></label
          >
          <textarea
            id="description"
            name="description"
            rows="2"
            placeholder="Brief description for SEO and post cards"
            bind:value={$form.description}
            disabled={$submitting}
          ></textarea>
        </div>

        <!-- Content editor -->
        <div class="field editor-field">
          <div class="editor-label-row">
            <label for="content-editor">Content</label>
            {#if readingTimeMinutes > 0}
              <span class="reading-time-badge"
                >{readingTimeMinutes} min read</span
              >
            {/if}
          </div>

          {#if $form.editorMode === 'markdown'}
            <div class="markdown-editor">
              <textarea
                id="content-editor"
                class="markdown-textarea"
                rows="20"
                placeholder="Write your post in Markdown..."
                bind:value={$form.content}
                disabled={$submitting}
              ></textarea>
            </div>
          {:else}
            <div class="tiptap-wrapper" bind:this={editorEl}></div>
          {/if}
          {#if $errors.content}<span class="field-error">{$errors.content}</span
            >{/if}
        </div>
      </div>

      <aside class="form-sidebar">
        <!-- Status -->
        <div class="sidebar-card">
          <h3>Status</h3>
          <div class="status-toggle">
            <label class="radio-label">
              <input
                type="radio"
                name="status"
                value="draft"
                bind:group={$form.status}
              />
              Draft
            </label>
            <label class="radio-label">
              <input
                type="radio"
                name="status"
                value="published"
                bind:group={$form.status}
              />
              Published
            </label>
          </div>
        </div>

        <!-- Cover image -->
        <div class="sidebar-card">
          <h3>Cover Image</h3>
          {#if coverPreviewUrl}
            <img
              src={coverPreviewUrl}
              alt="Cover preview"
              class="cover-preview"
            />
            <button
              type="button"
              class="btn text small"
              onclick={removeCoverImage}>Remove</button
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
                  ><path
                    d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                  /><polyline points="17 8 12 3 7 8" /><line
                    x1="12"
                    y1="3"
                    x2="12"
                    y2="15"
                  /></svg
                >
                <span>Upload cover image</span>
              {/if}
            </label>
          {/if}
        </div>

        <!-- Tags -->
        <div class="sidebar-card">
          <div class="sidebar-card-header">
            <h3>Tags</h3>
            <button
              type="button"
              class="btn text small"
              onclick={getAiSuggestions}
              disabled={isSuggestionsLoading || !$form.title}
            >
              {isSuggestionsLoading ? 'Loading...' : 'AI Suggest'}
            </button>
          </div>

          {#if tagSuggestions.length > 0}
            <div class="suggestions">
              <p class="suggestions-label">Suggestions:</p>
              <div class="chip-group">
                {#each tagSuggestions as suggestion}
                  <div class="suggestion-chip">
                    <button
                      type="button"
                      class="chip accept"
                      onclick={() => acceptSuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                    <button
                      type="button"
                      class="chip-dismiss"
                      onclick={() => dismissSuggestion(suggestion)}
                      aria-label="Dismiss {suggestion}"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><line x1="18" y1="6" x2="6" y2="18" /><line
                          x1="6"
                          y1="6"
                          x2="18"
                          y2="18"
                        /></svg
                      >
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <div class="chip-group tags-group">
            {#each data.tags as tag}
              <button
                type="button"
                class="chip tag-chip"
                class:selected={selectedTagIds.has(tag.id)}
                onclick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </button>
            {/each}
            {#if data.tags.length === 0}
              <p class="no-tags">
                No tags yet. <a href="/admin/blog/tags">Create some</a>
              </p>
            {/if}
          </div>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          class="btn primary full-width"
          disabled={$submitting}
        >
          {$submitting ? 'Saving...' : 'Create Post'}
        </button>
      </aside>
    </div>
  </form>
</div>

<style>
  .page {
    max-width: 1200px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-8);
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: var(--text-sm);
    transition: color var(--transition-fast);
  }

  .back-link:hover {
    color: var(--color-text);
  }

  .page-header h1 {
    font-size: var(--text-2xl);
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
  }

  .post-form {
    width: 100%;
  }

  .form-layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: var(--space-8);
    align-items: start;
  }

  .form-main {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  /* Editor mode toggle */
  .editor-mode-toggle {
    display: inline-flex;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 2px;
    gap: 2px;
  }

  .mode-btn {
    padding: var(--space-2) var(--space-4);
    border: none;
    background: none;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .mode-btn.active {
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-sm);
  }

  /* Form fields */
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .field label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .optional {
    font-weight: 400;
    color: var(--color-text-muted);
  }

  .field input,
  .field textarea {
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: var(--text-sm);
    font-family: inherit;
    width: 100%;
    box-sizing: border-box;
    transition: border-color var(--transition-fast);
  }

  .field input:focus,
  .field textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px
      color-mix(in oklch, var(--color-primary) 20%, transparent);
  }

  .field input.error {
    border-color: var(--color-danger);
  }

  .field-error {
    font-size: var(--text-xs);
    color: var(--color-danger);
  }

  .field-hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  /* Editor area */
  .editor-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .editor-label-row label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .reading-time-badge {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    background: var(--color-bg-secondary);
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
  }

  .markdown-textarea {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 1.6;
    resize: vertical;
    min-height: 400px;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg);
    color: var(--color-text);
    width: 100%;
    box-sizing: border-box;
  }

  .markdown-textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px
      color-mix(in oklch, var(--color-primary) 20%, transparent);
  }

  :global(.tiptap-wrapper) {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    min-height: 400px;
    padding: var(--space-4);
    background: var(--color-bg);
    cursor: text;
  }

  :global(.tiptap-wrapper:focus-within) {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px
      color-mix(in oklch, var(--color-primary) 20%, transparent);
  }

  :global(.tiptap-wrapper .ProseMirror) {
    outline: none;
    min-height: 360px;
    color: var(--color-text);
    font-size: var(--text-sm);
    line-height: 1.7;
  }

  :global(.tiptap-wrapper .ProseMirror p.is-editor-empty:first-child::before) {
    content: 'Write your post...';
    color: var(--color-text-muted);
    pointer-events: none;
    float: left;
    height: 0;
  }

  /* Sidebar */
  .form-sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    position: sticky;
    top: var(--space-8);
  }

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

  .sidebar-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /* Status toggle */
  .status-toggle {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text);
    cursor: pointer;
  }

  /* Cover image */
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

  /* Tags and suggestions */
  .suggestions-label {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .chip {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    border: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    font-size: var(--text-xs);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .chip:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .chip.tag-chip.selected {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .chip.accept {
    background: color-mix(in oklch, var(--color-primary) 10%, transparent);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .suggestion-chip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .chip-dismiss {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    padding: 2px;
    display: flex;
    align-items: center;
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast);
  }

  .chip-dismiss:hover {
    color: var(--color-text);
  }

  .no-tags {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin: 0;
  }

  .no-tags a {
    color: var(--color-primary);
  }

  .full-width {
    width: 100%;
    justify-content: center;
  }

  /* Responsive */
  @media (max-width: 900px) {
    .form-layout {
      grid-template-columns: 1fr;
    }

    .form-sidebar {
      position: static;
    }
  }
</style>
