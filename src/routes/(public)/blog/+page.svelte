<script lang="ts">
  import SEOHead from '$lib/components/SEOHead.svelte'
  import PostCard from '$lib/components/blog/PostCard.svelte'
  import { breadcrumbSchema } from '$lib/seo'
  import { fadeInDown, staggerReveal } from '$lib/utils/animate'

  import type { BlogPostCard } from '$lib/types/blog'

  interface Props {
    data: {
      posts: BlogPostCard[]
      activeTag: string | null
      error: string | null
    }
  }

  let { data }: Props = $props()

  let hasPosts = $derived(data.posts.length > 0)
</script>

<SEOHead
  title="Blog"
  description="Thoughts on software, photography, and building things on the web."
  isBlog={true}
  jsonLd={breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' }
  ])}
/>

<div class="blog-page">
  <div class="container">
    <header
      class="blog-header"
      use:fadeInDown={{
        duration: 500,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <h1>Blog</h1>
      <p class="subtitle">
        Thoughts on software, photography, and building things on the web.
      </p>
    </header>

    {#if data.activeTag}
      <div class="active-filter">
        <span class="filter-label">
          Filtered by: <strong>{data.activeTag}</strong>
        </span>
        <a href="/blog" class="clear-filter">Clear filter</a>
      </div>
    {/if}

    {#if data.error}
      <div class="blog-error">
        <p>Blog is temporarily unavailable. Please try again later.</p>
      </div>
    {:else if !hasPosts}
      <div class="blog-empty">
        <p>No posts yet. Check back soon.</p>
      </div>
    {:else}
      <div
        class="posts-grid"
        use:staggerReveal={{ staggerDelay: 80, type: 'fadeInUp' }}
      >
        {#each data.posts as post (post.id)}
          <PostCard {post} />
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .blog-page {
    padding: var(--space-16) 0 var(--space-24);
    min-height: calc(100vh - var(--header-height) - 200px);
  }

  .blog-header {
    margin-bottom: var(--space-10);
  }

  .blog-header h1 {
    font-size: var(--text-4xl);
    margin-bottom: var(--space-2);
    letter-spacing: -0.03em;
  }

  .subtitle {
    font-size: var(--text-lg);
    color: var(--color-text-muted);
    margin: 0;
  }

  .active-filter {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-8);
    padding: var(--space-3) var(--space-4);
    background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
    border-radius: var(--radius-lg);
    font-size: var(--text-sm);
  }

  .filter-label {
    color: var(--color-text-secondary);
  }

  .filter-label strong {
    color: var(--color-primary);
  }

  .clear-filter {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 500;
    margin-left: auto;
    transition: color var(--transition-fast);
  }

  .clear-filter:hover {
    color: var(--color-primary-hover);
  }

  .posts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-8);
  }

  .blog-error,
  .blog-empty {
    text-align: center;
    padding: var(--space-16) var(--space-4);
    color: var(--color-text-muted);
    font-size: var(--text-lg);
  }

  @media (max-width: 768px) {
    .blog-page {
      padding: var(--space-8) 0 var(--space-16);
    }

    .blog-header h1 {
      font-size: var(--text-3xl);
    }

    .posts-grid {
      grid-template-columns: 1fr;
      gap: var(--space-6);
    }
  }
</style>
