<script lang="ts">
  import SEOHead from '$lib/components/SEOHead.svelte'
  import PostCard from '$lib/components/blog/PostCard.svelte'
  import { breadcrumbSchema } from '$lib/seo'
  import { fadeInUp } from '$lib/utils/animate'
  import type { BlogPostCard, BlogTag } from '$lib/types/blog'

  interface Props {
    data: {
      posts: BlogPostCard[]
      tags: BlogTag[]
      activeTag: string | null
      error: string | null
    }
  }
  let { data }: Props = $props()
  let activeTagName = $derived(
    data.tags.find((tag) => tag.slug === data.activeTag)?.name ?? data.activeTag
  )
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
    <header class="reading-header" use:fadeInUp={{ duration: 500 }}>
      <p class="eyebrow">Blog</p>
      <h1>Notes on what<span>I'm learning.</span></h1>
      <p class="reading-lead">
        Thoughts on software, photography, and building things on the web.
      </p>
    </header>

    <div class="blog-toolbar">
      <nav class="blog-filters" aria-label="Filter posts by tag">
        <a
          class="filter-link"
          href="/blog"
          aria-current={!data.activeTag ? 'true' : undefined}>All posts</a
        >
        {#each data.tags as tag (tag.id)}
          <a
            class="filter-link"
            href="/blog?tag={encodeURIComponent(tag.slug)}"
            aria-current={data.activeTag === tag.slug ? 'true' : undefined}
            >{tag.name}</a
          >
        {/each}
      </nav>
      <a class="text-link blog-rss" href="/blog/rss.xml"
        >RSS feed <span aria-hidden="true">→</span></a
      >
    </div>
    <div class="blog-filter-status" aria-live="polite">
      <p>{data.activeTag ? `Posts tagged ${activeTagName}` : 'All posts'}</p>
      {#if data.activeTag}<a class="text-link" href="/blog"
          >Clear filter <span aria-hidden="true">→</span></a
        >{/if}
    </div>

    {#if data.error}
      <section class="blog-state blog-error" aria-labelledby="blog-error-title">
        <p class="eyebrow">Blog unavailable</p>
        <h2 id="blog-error-title">The posts could not load.</h2>
        <p>Please try again later.</p>
        <a class="text-link" href="/blog" data-sveltekit-reload
          >Try again <span aria-hidden="true">→</span></a
        >
      </section>
    {:else if data.posts.length === 0}
      <section class="blog-state blog-empty" aria-labelledby="blog-empty-title">
        <p class="eyebrow">
          {data.activeTag ? 'No matching posts' : 'The blog'}
        </p>
        <h2 id="blog-empty-title">
          {data.activeTag ? 'Nothing with this tag yet.' : 'No posts yet.'}
        </h2>
        <p>
          {data.activeTag
            ? 'Try another tag or return to all posts.'
            : 'New posts will appear here.'}
        </p>
        {#if data.activeTag}<a class="text-link" href="/blog"
            >See all posts <span aria-hidden="true">→</span></a
          >{/if}
      </section>
    {:else}
      <section class="posts-list" aria-label="Blog posts">
        {#each data.posts as post (post.id)}<PostCard {post} />{/each}
      </section>
    {/if}

    <aside class="blog-feed-note">
      <p>Prefer a feed reader?</p>
      <a class="text-link" href="/blog/atom.xml"
        >Atom feed <span aria-hidden="true">→</span></a
      >
    </aside>
  </div>
</div>

<style>
  .blog-page {
    padding-block: var(--space-16) var(--space-12);
  }
  .reading-header {
    padding-bottom: var(--space-16);
  }
  .eyebrow {
    margin: 0;
    color: var(--color-muted);
    font-size: var(--text-xs);
    font-weight: 400;
    letter-spacing: 0.075em;
    text-transform: uppercase;
  }
  .reading-header h1 {
    margin: var(--space-6) 0 0;
    font-size: clamp(3rem, 7vw, 6.15rem);
    line-height: 1.04;
    letter-spacing: -0.043em;
    font-weight: 500;
  }
  .reading-header h1 span {
    display: block;
    color: var(--color-accent);
  }
  .reading-lead {
    margin: var(--space-6) 0 0;
    max-width: 55ch;
    color: var(--color-muted);
    font-size: var(--text-lg);
    line-height: 1.65;
  }
  .blog-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
    padding-block: var(--space-4);
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
  }
  .blog-filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .filter-link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-muted);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    text-decoration: none;
  }
  .filter-link:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }
  .filter-link[aria-current='true'] {
    color: var(--color-background);
    background: var(--color-accent);
    border-color: var(--color-accent);
  }
  .text-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 44px;
    color: var(--color-accent);
    font-size: var(--text-sm);
    text-decoration: none;
  }
  .text-link:hover {
    color: var(--color-accent-hover);
  }
  .blog-rss {
    flex-shrink: 0;
  }
  .blog-filter-status {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    min-height: 44px;
    padding-top: var(--space-5);
    color: var(--color-muted);
    font-size: var(--text-xs);
  }
  .blog-filter-status p {
    margin: 0;
  }
  .blog-filter-status .text-link {
    font-size: var(--text-xs);
  }
  .blog-state {
    padding-block: var(--space-20);
    border-bottom: 1px solid var(--color-border);
  }
  .blog-state h2 {
    margin: var(--space-4) 0 0;
    font-size: 2rem;
    font-weight: 400;
    letter-spacing: -0.025em;
  }
  .blog-state p:not(.eyebrow) {
    margin: var(--space-4) 0 0;
    color: var(--color-muted);
  }
  .blog-state .text-link {
    margin-top: var(--space-5);
  }
  .blog-feed-note {
    display: flex;
    gap: var(--space-6);
    align-items: center;
    padding-top: var(--space-8);
    color: var(--color-muted);
    font-size: var(--text-sm);
  }
  .blog-feed-note p {
    margin: 0;
  }
  @media (max-width: 740px) {
    .blog-page {
      padding-block: var(--space-10) var(--space-8);
    }
    .reading-header {
      padding-bottom: var(--space-10);
    }
    .reading-header h1 {
      font-size: clamp(2.75rem, 9.8vw, 4.4rem);
      margin-top: var(--space-5);
      line-height: 1.08;
      letter-spacing: -0.038em;
    }
    .reading-header h1 span {
      margin-top: var(--space-1);
    }
    .reading-lead {
      font-size: var(--text-base);
      margin-top: var(--space-5);
    }
    .blog-toolbar {
      gap: var(--space-3);
      flex-wrap: wrap;
    }
    .filter-link {
      padding-inline: var(--space-3);
      font-size: var(--text-xs);
    }
    .blog-rss {
      font-size: var(--text-xs);
    }
    .blog-filter-status {
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-4);
    }
    .blog-state {
      padding-block: var(--space-12);
    }
    .blog-feed-note {
      flex-wrap: wrap;
      gap: var(--space-3);
      padding-top: var(--space-6);
    }
  }
  @media (max-width: 350px) {
    .reading-header h1 {
      font-size: 2.55rem;
    }
  }
</style>
