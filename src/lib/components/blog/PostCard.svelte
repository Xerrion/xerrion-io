<script lang="ts">
  import type { BlogPostCard } from '$lib/types/blog'

  interface Props {
    post: BlogPostCard
  }

  let { post }: Props = $props()

  let formattedDate = $derived(
    post.publishedAt
      ? new Date(post.publishedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : null
  )

  let readingLabel = $derived(
    post.readingTime ? `${post.readingTime} min read` : null
  )
</script>

<article class="post-card hover-lift">
  <a href="/blog/{post.slug}" class="card-link">
    {#if post.coverUrl}
      <div class="card-cover">
        <img
          src={post.coverUrl}
          alt="Cover image for {post.title}"
          loading="lazy"
        />
      </div>
    {/if}

    <div class="card-body">
      <h2 class="card-title">{post.title}</h2>

      {#if post.tags.length > 0}
        <div class="card-tags">
          {#each post.tags as tag (tag.id)}
            <span class="tag-chip">{tag.name}</span>
          {/each}
        </div>
      {/if}

      {#if post.description}
        <p class="card-description">{post.description}</p>
      {/if}

      <div class="card-meta">
        {#if formattedDate}
          <time datetime={post.publishedAt ?? undefined}>{formattedDate}</time>
        {/if}
        {#if readingLabel}
          <span class="reading-time">{readingLabel}</span>
        {/if}
      </div>
    </div>
  </a>
</article>

<style>
  .post-card {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    overflow: hidden;
    transition:
      border-color var(--transition-fast),
      box-shadow var(--transition-base);
  }

  .post-card:hover {
    border-color: var(--color-border-hover);
  }

  .card-link {
    display: flex;
    flex-direction: column;
    color: inherit;
    text-decoration: none;
    height: 100%;
  }

  .card-cover {
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background-color: var(--color-bg-tertiary);
  }

  .card-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--transition-slow);
  }

  .post-card:hover .card-cover img {
    transform: scale(1.03);
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-6);
    flex: 1;
  }

  .card-title {
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--color-text);
    line-height: 1.3;
    margin: 0;
    transition: color var(--transition-fast);
  }

  .post-card:hover .card-title {
    color: var(--color-primary);
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .tag-chip {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--color-primary);
    background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-full);
  }

  .card-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-top: auto;
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .card-meta time {
    color: var(--color-text-secondary);
  }

  .reading-time::before {
    content: '\00b7';
    margin-right: var(--space-3);
  }

  @media (max-width: 768px) {
    .card-body {
      padding: var(--space-4);
    }

    .card-title {
      font-size: var(--text-lg);
    }
  }
</style>
