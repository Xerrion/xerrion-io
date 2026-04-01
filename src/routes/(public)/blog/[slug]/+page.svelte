<script lang="ts">
  import SEOHead from '$lib/components/SEOHead.svelte'
  import { breadcrumbSchema, SITE_URL } from '$lib/seo'
  import { fadeInDown, fadeInUp } from '$lib/utils/animate'

  import type { BlogPost } from '$lib/types/blog'

  interface Props {
    data: { post: BlogPost }
  }

  let { data }: Props = $props()
  let post = $derived(data.post)

  let formattedDate = $derived(
    post.publishedAt
      ? new Date(post.publishedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : null
  )

  let isoDate = $derived(post.publishedAt ?? undefined)

  let readingLabel = $derived(
    post.readingTime ? `${post.readingTime} min read` : null
  )

  let articleJsonLd = $derived({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description ?? '',
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    url: `${SITE_URL}/blog/${post.slug}`,
    ...(post.coverUrl ? { image: post.coverUrl } : {}),
    author: {
      '@type': 'Person',
      name: 'Lasse Skovgaard Nielsen',
      url: SITE_URL
    }
  })
</script>

<SEOHead
  type="article"
  title={post.title}
  description={post.description ?? ''}
  image={post.coverUrl ?? undefined}
  jsonLd={[
    breadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: post.title, url: `/blog/${post.slug}` }
    ]),
    articleJsonLd
  ]}
/>

<div class="post-page">
  <div class="container">
    <nav class="back-link" aria-label="Breadcrumb">
      <a href="/blog">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
        Back to Blog
      </a>
    </nav>

    <article class="post-article">
      {#if post.coverUrl}
        <div class="post-cover" use:fadeInDown={{ duration: 600 }}>
          <img src={post.coverUrl} alt="Cover image for {post.title}" />
        </div>
      {/if}

      <header class="post-header" use:fadeInUp={{ duration: 500, delay: 100 }}>
        <h1>{post.title}</h1>

        <div class="post-meta">
          {#if formattedDate}
            <time datetime={isoDate}>{formattedDate}</time>
          {/if}
          {#if readingLabel}
            <span class="meta-separator" aria-hidden="true">&middot;</span>
            <span>{readingLabel}</span>
          {/if}
        </div>

        {#if post.tags.length > 0}
          <div class="post-tags">
            {#each post.tags as tag (tag.id)}
              <a href="/blog?tag={tag.slug}" class="tag-chip">{tag.name}</a>
            {/each}
          </div>
        {/if}
      </header>

      <div class="post-content" use:fadeInUp={{ duration: 500, delay: 200 }}>
        {@html post.renderedContent}
      </div>

      {#if post.prevPost || post.nextPost}
        <nav class="post-nav" aria-label="Post navigation">
          {#if post.prevPost}
            <a href="/blog/{post.prevPost.slug}" class="nav-link nav-prev">
              <span class="nav-label">Previous</span>
              <span class="nav-title">{post.prevPost.title}</span>
            </a>
          {:else}
            <div></div>
          {/if}

          {#if post.nextPost}
            <a href="/blog/{post.nextPost.slug}" class="nav-link nav-next">
              <span class="nav-label">Next</span>
              <span class="nav-title">{post.nextPost.title}</span>
            </a>
          {/if}
        </nav>
      {/if}
    </article>
  </div>
</div>

<style>
  .post-page {
    padding: var(--space-8) 0 var(--space-24);
    min-height: calc(100vh - var(--header-height) - 200px);
  }

  /* Back link */
  .back-link {
    margin-bottom: var(--space-8);
  }

  .back-link a {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color var(--transition-fast);
  }

  .back-link a:hover {
    color: var(--color-primary);
  }

  /* Cover image */
  .post-cover {
    border-radius: var(--radius-xl);
    overflow: hidden;
    margin-bottom: var(--space-10);
    aspect-ratio: 21 / 9;
    background-color: var(--color-bg-tertiary);
  }

  .post-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Header */
  .post-header {
    margin-bottom: var(--space-10);
  }

  .post-header h1 {
    font-size: var(--text-4xl);
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.03em;
    margin: 0 0 var(--space-4);
  }

  .post-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
  }

  .meta-separator {
    color: var(--color-border-hover);
  }

  .post-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .tag-chip {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--color-primary);
    background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    text-decoration: none;
    transition:
      background-color var(--transition-fast),
      color var(--transition-fast);
  }

  .tag-chip:hover {
    background-color: color-mix(in srgb, var(--color-primary) 20%, transparent);
    color: var(--color-primary-hover);
  }

  /* Post content - prose styling via descendant selectors */
  .post-content {
    max-width: 72ch;
    font-size: var(--text-base);
    line-height: 1.8;
    color: var(--color-text);
  }

  .post-content :global(h2) {
    font-size: var(--text-2xl);
    font-weight: 700;
    margin: var(--space-12) 0 var(--space-4);
    letter-spacing: -0.02em;
    line-height: 1.3;
  }

  .post-content :global(h3) {
    font-size: var(--text-xl);
    font-weight: 600;
    margin: var(--space-10) 0 var(--space-3);
    line-height: 1.35;
  }

  .post-content :global(h4) {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: var(--space-8) 0 var(--space-3);
  }

  .post-content :global(p) {
    margin: 0 0 var(--space-5);
    color: var(--color-text-secondary);
  }

  .post-content :global(a) {
    color: var(--color-primary);
    text-decoration: underline;
    text-decoration-color: color-mix(
      in srgb,
      var(--color-primary) 40%,
      transparent
    );
    text-underline-offset: 2px;
    transition:
      color var(--transition-fast),
      text-decoration-color var(--transition-fast);
  }

  .post-content :global(a:hover) {
    color: var(--color-primary-hover);
    text-decoration-color: var(--color-primary-hover);
  }

  .post-content :global(strong) {
    font-weight: 600;
    color: var(--color-text);
  }

  .post-content :global(ul),
  .post-content :global(ol) {
    margin: 0 0 var(--space-5);
    padding-left: var(--space-6);
    color: var(--color-text-secondary);
  }

  .post-content :global(li) {
    margin-bottom: var(--space-2);
  }

  .post-content :global(li::marker) {
    color: var(--color-text-muted);
  }

  .post-content :global(blockquote) {
    margin: var(--space-6) 0;
    padding: var(--space-4) var(--space-6);
    border-left: 3px solid var(--color-primary);
    background-color: color-mix(in srgb, var(--color-primary) 5%, transparent);
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
  }

  .post-content :global(blockquote p) {
    margin: 0;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .post-content :global(code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
    background-color: var(--color-bg-tertiary);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
  }

  .post-content :global(pre) {
    margin: var(--space-6) 0;
    padding: var(--space-5);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow-x: auto;
    line-height: 1.6;
  }

  .post-content :global(pre code) {
    background-color: transparent;
    padding: 0;
    font-size: var(--text-sm);
  }

  .post-content :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius-lg);
    margin: var(--space-6) 0;
  }

  .post-content :global(hr) {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: var(--space-10) 0;
  }

  .post-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: var(--space-6) 0;
    font-size: var(--text-sm);
  }

  .post-content :global(th),
  .post-content :global(td) {
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border);
    text-align: left;
  }

  .post-content :global(th) {
    background-color: var(--color-bg-tertiary);
    font-weight: 600;
    color: var(--color-text);
  }

  .post-content :global(td) {
    color: var(--color-text-secondary);
  }

  /* Post navigation */
  .post-nav {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
    margin-top: var(--space-16);
    padding-top: var(--space-8);
    border-top: 1px solid var(--color-border);
  }

  .nav-link {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-4) var(--space-5);
    text-decoration: none;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    transition:
      border-color var(--transition-fast),
      background-color var(--transition-fast);
  }

  .nav-link:hover {
    border-color: var(--color-primary);
    background-color: color-mix(in srgb, var(--color-primary) 5%, transparent);
  }

  .nav-prev {
    text-align: left;
  }

  .nav-next {
    text-align: right;
  }

  .nav-label {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .nav-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text);
    line-height: 1.4;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .post-page {
      padding: var(--space-4) 0 var(--space-16);
    }

    .post-header h1 {
      font-size: var(--text-3xl);
    }

    .post-cover {
      border-radius: var(--radius-lg);
      aspect-ratio: 16 / 9;
      margin-bottom: var(--space-6);
    }

    .post-header {
      margin-bottom: var(--space-6);
    }

    .post-nav {
      grid-template-columns: 1fr;
      margin-top: var(--space-10);
    }
  }
</style>
