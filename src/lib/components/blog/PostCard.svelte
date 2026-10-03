<script lang="ts">
  import type { BlogPostCard } from '$lib/types/blog'
  import { reveal } from '$lib/utils/animate'

  interface Props {
    post: BlogPostCard
  }
  let { post }: Props = $props()
  let formattedDate = $derived(
    post.publishedAt
      ? new Date(post.publishedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC'
        })
      : null
  )
  let readingLabel = $derived(
    post.readingTime ? `${post.readingTime} min read` : null
  )
</script>

<article
  class="post-card"
  class:has-cover={Boolean(post.coverUrl)}
  use:reveal={{ duration: 450 }}
>
  <div class="card-meta">
    {#if formattedDate}<time datetime={post.publishedAt ?? undefined}
        >{formattedDate}</time
      >{/if}
    {#if readingLabel}<span>{readingLabel}</span>{/if}
  </div>
  <div class="card-body">
    <h2 class="card-title"><a href="/blog/{post.slug}">{post.title}</a></h2>
    {#if post.description}<p class="card-description">
        {post.description}
      </p>{/if}
    {#if post.tags.length > 0}
      <ul class="card-tags" aria-label="Post tags">
        {#each post.tags as tag (tag.id)}<li>{tag.name}</li>{/each}
      </ul>
    {/if}
    <a class="read-link" href="/blog/{post.slug}"
      >Read the post <span aria-hidden="true">→</span></a
    >
  </div>
  {#if post.coverUrl}
    <a
      class="card-cover"
      href="/blog/{post.slug}"
      aria-label="Read {post.title}"
    >
      <img
        src={post.coverUrl}
        alt="Cover image for {post.title}"
        loading="lazy"
        width="600"
        height="420"
      />
    </a>
  {/if}
</article>

<style>
  .post-card {
    display: grid;
    grid-template-columns: 150px minmax(0, 1fr);
    gap: var(--space-12);
    padding-block: var(--space-10) var(--space-12);
    border-bottom: 1px solid var(--color-border);
    align-items: start;
  }
  .post-card.has-cover {
    grid-template-columns: 150px minmax(0, 1fr) 228px;
  }
  .card-meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-top: var(--space-1);
    color: var(--color-muted);
    font-size: var(--text-xs);
  }
  .card-title {
    margin: 0;
    max-width: 40ch;
    font-size: clamp(1.5rem, 2.3vw, 2rem);
    line-height: 1.32;
    letter-spacing: -0.025em;
    font-weight: 400;
    overflow-wrap: anywhere;
  }
  .card-title a {
    display: block;
    min-height: 44px;
    color: var(--color-text);
    text-decoration: none;
  }
  .card-title a:hover {
    color: var(--color-accent);
  }
  .card-description {
    margin: var(--space-4) 0 0;
    color: var(--color-muted);
    max-width: 65ch;
    line-height: 1.75;
  }
  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    margin: var(--space-5) 0 0;
    padding: 0;
    list-style: none;
    color: var(--color-muted);
    font-size: var(--text-xs);
  }
  .read-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 44px;
    margin-top: var(--space-4);
    color: var(--color-accent);
    font-size: var(--text-sm);
    text-decoration: none;
  }
  .read-link:hover {
    color: var(--color-accent-hover);
  }
  .card-cover {
    display: block;
    margin-top: var(--space-1);
  }
  .card-cover img {
    display: block;
    width: 100%;
    height: 220px;
    object-fit: cover;
    border-radius: var(--radius-sm);
  }
  @media (max-width: 1000px) {
    .post-card {
      grid-template-columns: 115px minmax(0, 1fr);
      gap: var(--space-8);
    }
    .post-card.has-cover {
      grid-template-columns: 115px minmax(0, 1fr) 170px;
    }
    .card-cover img {
      height: 185px;
    }
  }
  @media (max-width: 740px) {
    .post-card,
    .post-card.has-cover {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-5);
      padding-block: var(--space-8);
    }
    .card-meta {
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--space-4);
      padding-top: 0;
    }
    .card-title {
      font-size: 1.65rem;
      line-height: 1.35;
    }
    .card-cover {
      max-width: 440px;
    }
    .card-cover img {
      height: 235px;
    }
  }
</style>
