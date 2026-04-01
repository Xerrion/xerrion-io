<script lang="ts">
  import { toastStore } from '$lib/stores/toast.svelte'

  interface Props {
    tags: Array<{ id: number; name: string; slug?: string }>
    selectedIds: Set<number>
    onchange: (ids: Set<number>) => void
    formTitle: string
    formContent: string
  }
  let { tags, selectedIds, onchange, formTitle, formContent }: Props = $props()

  // Mutable local copy so we can append auto-created tags
  // svelte-ignore state_referenced_locally
  let localTags = $state([...tags])

  let tagSuggestions = $state<string[]>([])
  let isSuggestionsLoading = $state(false)

  function toggleTag(id: number) {
    const nextIds = new Set(selectedIds)
    if (nextIds.has(id)) nextIds.delete(id)
    else nextIds.add(id)
    onchange(nextIds)
  }

  async function getAiSuggestions() {
    if (!formTitle) return

    isSuggestionsLoading = true
    try {
      const res = await fetch('/api/blog/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          content: formContent,
          existingTags: localTags.map((t) => t.name)
        })
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const json = await res.json()
      tagSuggestions = json.suggestions ?? []
    } catch {
      toastStore.error('Failed to get tag suggestions')
    } finally {
      isSuggestionsLoading = false
    }
  }

  async function acceptSuggestion(suggestion: string) {
    const matchingTag = localTags.find(
      (t) => t.name.toLowerCase() === suggestion.toLowerCase()
    )
    if (matchingTag) {
      if (!selectedIds.has(matchingTag.id)) {
        toggleTag(matchingTag.id)
      }
    } else {
      // Auto-create the tag via API
      try {
        const res = await fetch('/api/blog/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: suggestion })
        })
        if (!res.ok) throw new Error(`Failed to create tag: ${res.status}`)
        const { tag } = await res.json()
        localTags = [...localTags, tag]
        toggleTag(tag.id)
        toastStore.success(`Tag "${suggestion}" created and added`)
      } catch (err) {
        console.error('[TagSelector] Failed to create tag:', err)
        toastStore.error(`Failed to create tag "${suggestion}"`)
      }
    }
    tagSuggestions = tagSuggestions.filter((s) => s !== suggestion)
  }

  function dismissSuggestion(suggestion: string) {
    tagSuggestions = tagSuggestions.filter((s) => s !== suggestion)
  }
</script>

<div class="sidebar-card">
  <div class="sidebar-card-header">
    <h3>Tags</h3>
    <button
      type="button"
      class="btn text small"
      onclick={getAiSuggestions}
      disabled={isSuggestionsLoading || !formTitle}
    >
      {#if isSuggestionsLoading}
        <span class="spinner"></span> Suggesting...
      {:else}
        ✨ AI Suggest
      {/if}
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
    {#each localTags as tag}
      <button
        type="button"
        class="chip tag-chip"
        class:selected={selectedIds.has(tag.id)}
        onclick={() => toggleTag(tag.id)}
      >
        {tag.name}
      </button>
    {/each}
    {#if localTags.length === 0}
      <p class="no-tags">
        No tags yet. <a href="/admin/blog/tags">Create some</a>
      </p>
    {/if}
  </div>
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

  .sidebar-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .suggestions-label {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .suggestions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
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

  .spinner {
    display: inline-block;
    width: 0.75em;
    height: 0.75em;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: var(--radius-full);
    animation: spin 0.6s linear infinite;
    vertical-align: middle;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
      border-right-color: currentColor;
      opacity: 0.5;
    }
  }
</style>
