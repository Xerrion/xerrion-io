<script lang="ts">
  import { enhance } from '$app/forms';
  import { toastStore } from '$lib/stores/toast.svelte';

  let { data } = $props();

  let selectedCategoryId = $state<string>('all');

  let filteredPhotos = $derived(
    selectedCategoryId === 'all'
      ? data.photos
      : data.photos.filter((p) => p.categoryId.toString() === selectedCategoryId)
  );

  function formatBytes(bytes: number | null) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
</script>

<div class="page">
  <header class="header">
    <div class="title-group">
      <h1>Gallery <span class="count">({filteredPhotos.length})</span></h1>
      <a href="/admin/gallery/upload" class="btn primary small">Upload New</a>
    </div>

    <div class="filter-group">
      <label for="category-filter">Filter by Category:</label>
      <select id="category-filter" bind:value={selectedCategoryId}>
        <option value="all">All Categories</option>
        {#each data.categories as category}
          <option value={category.id.toString()}>{category.name}</option>
        {/each}
      </select>
    </div>
  </header>

  {#if filteredPhotos.length === 0}
    <div class="empty-state">
      <p>No photos found.</p>
      {#if selectedCategoryId !== 'all'}
        <button class="btn link" onclick={() => (selectedCategoryId = 'all')}>Clear filter</button>
      {:else}
        <a href="/admin/gallery/upload" class="btn primary">Upload your first photo</a>
      {/if}
    </div>
  {:else}
    <div class="photo-grid">
      {#each filteredPhotos as photo (photo.id)}
        <div class="photo-card">
          <div class="thumbnail-wrapper">
            <img src={photo.thumbUrl} alt={photo.originalName} loading="lazy" />
          </div>
          
          <div class="details">
            <h3 class="filename" title={photo.originalName}>{photo.originalName}</h3>
            
            <div class="meta-row">
              <span class="badge">{photo.categoryName}</span>
              <span class="size">{formatBytes(photo.fileSize)}</span>
            </div>
            
            <div class="meta-row">
               <span class="date">{new Date(photo.uploadedAt).toLocaleDateString()}</span>
            </div>

            <div class="actions">
              <a href={photo.fullUrl} target="_blank" rel="noopener noreferrer" class="btn icon" title="View full size">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
              
              <form method="POST" action="?/delete" use:enhance={() => { return async ({ result, update }) => { if (result.type === 'success') { toastStore.success('Photo deleted successfully'); } else if (result.type === 'failure') { toastStore.error(result.data?.error as string || 'Failed to delete photo'); } await update(); }; }} onsubmit={(e) => !confirm('Delete this photo permanently?') && e.preventDefault()}>
                <input type="hidden" name="photoId" value={photo.id} />
                <button type="submit" class="btn icon danger" title="Delete photo">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page {
    padding: var(--space-6);
    max-width: 1400px;
    margin: 0 auto;
    color: var(--color-text);
  }

  .header {
    margin-bottom: var(--space-8);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-4);
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  h1 {
    font-size: var(--text-2xl);
    font-weight: 600;
    margin: 0;
  }

  .count {
    color: var(--color-text-secondary);
    font-size: var(--text-lg);
    font-weight: 400;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  label {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  select {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background-color: var(--color-surface);
    color: var(--color-text);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .empty-state {
    text-align: center;
    padding: var(--space-12);
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    border: 1px dashed var(--color-border);
    color: var(--color-text-secondary);
  }

  .photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: var(--space-6);
  }

  .photo-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    display: flex;
    flex-direction: column;
  }

  .photo-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: var(--color-primary-light);
  }

  .thumbnail-wrapper {
    aspect-ratio: 4/3;
    overflow: hidden;
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--transition-base);
  }

  .photo-card:hover img {
    transform: scale(1.05);
  }

  .details {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    flex: 1;
  }

  .filename {
    font-size: var(--text-sm);
    font-weight: 600;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--color-text);
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  .badge {
    background: var(--color-bg-secondary);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .actions {
    margin-top: auto;
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }

</style>
