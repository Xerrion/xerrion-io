<script lang="ts">
  import { enhance as deleteEnhance } from '$app/forms'
  import { superForm } from 'sveltekit-superforms'
  import { zod4Client } from 'sveltekit-superforms/adapters'
  import { toastStore } from '$lib/stores/toast.svelte'
  import { postUpdateSchema } from '$lib/schemas/blog'
  import { toSlug } from '$lib/utils/slug'
  import MarkdownEditor from '$lib/components/blog/MarkdownEditor.svelte'
  import TagSelector from '$lib/components/blog/TagSelector.svelte'
  import CoverUpload from '$lib/components/blog/CoverUpload.svelte'

  let { data } = $props()

  // svelte-ignore state_referenced_locally
  const { form, enhance, submitting, errors } = superForm(data.form, {
    dataType: 'json',
    validators: zod4Client(postUpdateSchema),
    resetForm: false,
    onResult({ result }) {
      if (result.type === 'success') {
        toastStore.success('Post updated successfully')
      } else if (result.type === 'failure') {
        toastStore.error('Please fix the errors and try again')
      }
    }
  })

  // Reading time estimate (client-side for live feedback)
  let readingTimeMinutes = $derived.by(() => {
    const trimmed = $form.content.trim()
    if (!trimmed) return 0
    return Math.max(1, Math.round(trimmed.split(/\s+/).length / 200))
  })

  // Tag selection - initialize from existing post data
  // svelte-ignore state_referenced_locally
  let selectedTagIds = $state<Set<number>>(new Set(data.post.tagIds))

  // Cover image preview URL (UI-only, not submitted)
  // svelte-ignore state_referenced_locally
  let coverPreviewUrl = $state<string | null>(data.post.coverUrl)

  // Delete confirmation two-step flow
  let isDeleteConfirming = $state(false)

  // AI description suggestion
  let isDescriptionLoading = $state(false)

  async function getAiDescription() {
    if (!$form.title) return
    isDescriptionLoading = true
    try {
      const res = await fetch('/api/blog/suggest-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: $form.title, content: $form.content })
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const json = await res.json()
      if (json.description) {
        $form.description = json.description
      }
    } catch {
      toastStore.error('Failed to generate description')
    } finally {
      isDescriptionLoading = false
    }
  }
</script>

<svelte:head>
  <title>Edit Post | Admin</title>
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
    <h1>Edit Post</h1>
  </header>

  <form method="POST" action="?/update" use:enhance class="post-form">
    <div class="form-layout">
      <div class="form-main">
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
          <div class="slug-input-row">
            <input
              id="slug"
              type="text"
              name="slug"
              placeholder="post-slug"
              bind:value={$form.slug}
              oninput={() => {
                $errors.slug = undefined
              }}
              disabled={$submitting}
              class:error={$errors.slug}
            />
            <button
              type="button"
              class="slug-regenerate-btn"
              title="Regenerate slug from title"
              disabled={$submitting || !$form.title}
              onclick={() => {
                $form.slug = toSlug($form.title)
                $errors.slug = undefined
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><polyline points="23 4 23 10 17 10" /><polyline
                  points="1 20 1 14 7 14"
                /><path
                  d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
                /></svg
              >
              Regenerate
            </button>
          </div>
          {#if $errors.slug}<span class="field-error">{$errors.slug}</span>{/if}
          <span class="field-hint">URL: /blog/{$form.slug || 'your-slug'}</span>
        </div>

        <!-- Description -->
        <div class="field">
          <div class="description-label-row">
            <label for="description"
              >Description <span class="optional">(optional)</span></label
            >
            <button
              type="button"
              class="ai-suggest-btn"
              disabled={$submitting || isDescriptionLoading || !$form.title}
              onclick={getAiDescription}
            >
              {#if isDescriptionLoading}
                <span class="ai-spinner"></span> Generating...
              {:else}
                ✨ AI Suggest
              {/if}
            </button>
          </div>
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
            <span class="field-label">Content</span>
            {#if readingTimeMinutes > 0}
              <span class="reading-time-badge"
                >{readingTimeMinutes} min read</span
              >
            {/if}
          </div>

          <MarkdownEditor
            content={$form.content}
            onchange={(v) => ($form.content = v)}
            disabled={$submitting}
            ariaLabel="Blog post content editor"
          />
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
          {#if data.post.publishedAt}
            <span class="meta-info"
              >Published {new Date(
                data.post.publishedAt
              ).toLocaleDateString()}</span
            >
          {/if}
        </div>

        <!-- Cover image -->
        <CoverUpload
          slug={$form.slug}
          previewUrl={coverPreviewUrl}
          onupload={(result) => {
            coverPreviewUrl = result.previewUrl
            $form.coverR2Key = result.r2Key
            $form.coverR2KeyFull = result.r2KeyFull
          }}
          onremove={() => {
            coverPreviewUrl = null
            $form.coverR2Key = ''
            $form.coverR2KeyFull = ''
          }}
        />

        <!-- Tags -->
        <TagSelector
          tags={data.tags}
          selectedIds={selectedTagIds}
          onchange={(ids) => {
            selectedTagIds = ids
            $form.tagIds = [...ids]
          }}
          formTitle={$form.title}
          formContent={$form.content}
        />

        <!-- Actions -->
        <button
          type="submit"
          class="btn primary full-width"
          disabled={$submitting}
        >
          {$submitting ? 'Saving...' : 'Update Post'}
        </button>
      </aside>
    </div>
  </form>

  <!-- Delete section - outside update form to avoid nesting -->
  <div class="delete-section">
    {#if isDeleteConfirming}
      <p class="danger-warning">
        This will permanently delete this post. Are you sure?
      </p>
      <div class="danger-actions">
        <form
          method="POST"
          action="?/delete"
          use:deleteEnhance={() => {
            return async ({ result, update }) => {
              if (result.type === 'redirect') {
                toastStore.success('Post deleted')
                await update()
              } else if (result.type === 'failure') {
                toastStore.error('Failed to delete post')
                isDeleteConfirming = false
              } else {
                await update()
              }
            }
          }}
        >
          <input type="hidden" name="id" value={data.post.id} />
          <button type="submit" class="btn danger full-width"
            >Delete Permanently</button
          >
        </form>
        <button
          type="button"
          class="btn text small full-width"
          onclick={() => (isDeleteConfirming = false)}>Cancel</button
        >
      </div>
    {:else}
      <button
        type="button"
        class="btn text danger-text full-width"
        onclick={() => (isDeleteConfirming = true)}>Delete Post</button
      >
    {/if}
  </div>
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

  /* Slug field */
  .slug-input-row {
    display: flex;
    gap: var(--space-2);
    align-items: stretch;
  }

  .slug-input-row input {
    flex: 1;
    min-width: 0;
  }

  .slug-regenerate-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    font-size: var(--text-xs);
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all var(--transition-fast);
  }

  .slug-regenerate-btn:hover:not(:disabled) {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: color-mix(
      in oklch,
      var(--color-primary) 8%,
      var(--color-bg-secondary)
    );
  }

  .slug-regenerate-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Description AI suggest */
  .description-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .ai-suggest-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    font-size: var(--text-xs);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .ai-suggest-btn:hover:not(:disabled) {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: color-mix(
      in oklch,
      var(--color-primary) 8%,
      var(--color-bg-secondary)
    );
  }

  .ai-suggest-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .ai-spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ai-spinner {
      animation: none;
      border-top-color: var(--color-text-muted);
    }
  }

  /* Editor area */
  .editor-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .field-label {
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

  .meta-info {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .full-width {
    width: 100%;
    justify-content: center;
  }

  /* Delete section */
  .delete-section {
    max-width: 300px;
    margin-left: auto;
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
  }

  .danger-warning {
    font-size: var(--text-sm);
    color: var(--color-danger);
    margin: 0 0 var(--space-3);
    text-align: center;
  }

  .danger-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .danger-text {
    color: var(--color-danger);
  }

  .danger-text:hover {
    background: color-mix(in oklch, var(--color-danger) 10%, transparent);
  }

  /* Responsive */
  @media (max-width: 900px) {
    .form-layout {
      grid-template-columns: 1fr;
    }

    .form-sidebar {
      position: static;
    }

    .delete-section {
      max-width: none;
      margin-left: 0;
    }
  }
</style>
