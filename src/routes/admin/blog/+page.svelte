<script lang="ts">
  import { enhance } from '$app/forms'
  import { motion } from '@humanspeak/svelte-motion'
  import { toastStore } from '$lib/stores/toast.svelte'

  let { data } = $props()
</script>

<svelte:head>
  <title>Blog Posts | Admin</title>
</svelte:head>

<div class="page">
  <motion.header
    class="page-header"
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div class="header-title">
      <h1>Blog Posts <span class="count">({data.posts.length})</span></h1>
    </div>
    <a href="/admin/blog/new" class="btn primary">New Post</a>
  </motion.header>

  {#if data.posts.length === 0}
    <div class="empty-state">
      <p>No posts yet.</p>
      <a href="/admin/blog/new" class="btn primary">Write your first post</a>
    </div>
  {:else}
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Tags</th>
            <th>Reading Time</th>
            <th>Published</th>
            <th>Created</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each data.posts as post (post.id)}
            <tr>
              <td>
                <a href="/admin/blog/{post.id}" class="post-title-link"
                  >{post.title}</a
                >
                <span class="post-slug">/{post.slug}</span>
              </td>
              <td>
                <span class="badge {post.status}">{post.status}</span>
              </td>
              <td>{post.tagCount}</td>
              <td>{post.readingTime ? `${post.readingTime} min` : '-'}</td>
              <td
                >{post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString()
                  : '-'}</td
              >
              <td>{new Date(post.createdAt).toLocaleDateString()}</td>
              <td class="row-actions">
                <a href="/admin/blog/{post.id}" class="btn icon" title="Edit">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    ><path
                      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                    /><path
                      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                    /></svg
                  >
                </a>

                {#if post.status === 'draft'}
                  <form
                    method="POST"
                    action="?/publish"
                    use:enhance={() => {
                      return async ({ result, update }) => {
                        if (result.type === 'success')
                          toastStore.success('Post published')
                        else toastStore.error('Failed to publish')
                        await update()
                      }
                    }}
                  >
                    <input type="hidden" name="id" value={post.id} />
                    <button
                      type="submit"
                      class="btn icon"
                      title="Publish"
                      aria-label="Publish post"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><circle cx="12" cy="12" r="10" /><polyline
                          points="12 6 12 12 16 14"
                        /></svg
                      >
                    </button>
                  </form>
                {:else}
                  <form
                    method="POST"
                    action="?/unpublish"
                    use:enhance={() => {
                      return async ({ result, update }) => {
                        if (result.type === 'success')
                          toastStore.success('Post unpublished')
                        else toastStore.error('Failed to unpublish')
                        await update()
                      }
                    }}
                  >
                    <input type="hidden" name="id" value={post.id} />
                    <button
                      type="submit"
                      class="btn icon"
                      title="Unpublish"
                      aria-label="Unpublish post"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><circle cx="12" cy="12" r="10" /><line
                          x1="4.93"
                          y1="4.93"
                          x2="19.07"
                          y2="19.07"
                        /></svg
                      >
                    </button>
                  </form>
                {/if}

                <form
                  method="POST"
                  action="?/delete"
                  use:enhance={() => {
                    return async ({ result, update }) => {
                      if (result.type === 'success')
                        toastStore.success('Post deleted')
                      else if (result.type === 'failure')
                        toastStore.error(
                          (result.data?.error as string) || 'Failed to delete'
                        )
                      await update()
                    }
                  }}
                  onsubmit={(e) =>
                    !confirm('Delete this post permanently?') &&
                    e.preventDefault()}
                >
                  <input type="hidden" name="id" value={post.id} />
                  <button
                    type="submit"
                    class="btn icon danger"
                    title="Delete"
                    aria-label="Delete post"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><polyline points="3 6 5 6 21 6" /><path
                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      /></svg
                    >
                  </button>
                </form>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 1200px;
    margin: 0 auto;
  }

  :global(.page-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-8);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .header-title h1 {
    font-size: var(--text-2xl);
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
  }

  .count {
    color: var(--color-text-secondary);
    font-weight: 400;
    font-size: var(--text-lg);
  }

  .empty-state {
    text-align: center;
    padding: var(--space-16);
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    border: 1px dashed var(--color-border);
    color: var(--color-text-secondary);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
  }

  .table-container {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  thead tr {
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
  }

  th {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    font-weight: 600;
    color: var(--color-text-secondary);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
    vertical-align: middle;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover {
    background: var(--color-surface-hover);
  }

  .post-title-link {
    font-weight: 600;
    color: var(--color-text);
    text-decoration: none;
    display: block;
  }

  .post-title-link:hover {
    color: var(--color-primary);
  }

  .post-slug {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    display: block;
    margin-top: 2px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .badge.draft {
    background: color-mix(in oklch, var(--color-text-muted) 15%, transparent);
    color: var(--color-text-secondary);
  }

  .badge.published {
    background: color-mix(in oklch, var(--color-success) 15%, transparent);
    color: var(--color-success-muted);
  }

  .actions-col {
    width: 120px;
  }

  .row-actions {
    display: flex;
    gap: var(--space-1);
    align-items: center;
  }

  .row-actions form {
    display: contents;
  }
</style>
