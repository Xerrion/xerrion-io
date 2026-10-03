<script lang="ts">
  import SEOHead from '$lib/components/SEOHead.svelte'
  import { breadcrumbSchema, SITE_URL } from '$lib/seo'
  import { fadeInUp } from '$lib/utils/animate'
  import type { BlogPost } from '$lib/types/blog'

  interface Props {
    data: { post: BlogPost }
  }
  interface TableOfContentsEntry {
    id: string
    title: string
    level: 2 | 3
  }

  let { data }: Props = $props()
  let post = $derived(data.post)
  let contentElement: HTMLDivElement | undefined = $state()
  let tableOfContents: TableOfContentsEntry[] = $state([])
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

  function focusHeading(event: MouseEvent, id: string): void {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    document.getElementById(id)?.focus({ preventScroll: true })
  }

  $effect(() => {
    const renderedContent = post.renderedContent
    const element = contentElement
    if (!element || !renderedContent) {
      tableOfContents = []
      return
    }

    const usedIds = new Set<string>()
    const headings = Array.from(
      element.querySelectorAll<HTMLHeadingElement>('h2, h3')
    )
    const entries: TableOfContentsEntry[] = []
    for (const [index, heading] of headings.entries()) {
      const title = heading.textContent?.trim() ?? ''
      if (!title) continue
      const slug = title
        .normalize('NFKD')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      const base = heading.id || `section-${slug || index + 1}`
      let id = base
      let suffix = 2
      while (usedIds.has(id)) id = `${base}-${suffix++}`
      usedIds.add(id)
      heading.id = id
      heading.tabIndex = -1
      entries.push({ id, title, level: heading.tagName === 'H3' ? 3 : 2 })
    }
    tableOfContents = entries

    const cleanups: Array<() => void> = []
    const codeExamples = element.querySelectorAll<HTMLPreElement>('pre')
    for (const [index, pre] of Array.from(codeExamples).entries()) {
      const code = pre.querySelector('code')
      if (!code) continue
      const previousTabIndex = pre.getAttribute('tabindex')
      const previousLabel = pre.getAttribute('aria-label')
      pre.tabIndex = 0
      pre.setAttribute(
        'aria-label',
        'Code example. Scroll horizontally to read longer lines.'
      )
      const wrapper = document.createElement('figure')
      wrapper.className = 'code-block'
      const caption = document.createElement('figcaption')
      caption.className = 'code-header'
      const language = document.createElement('span')
      language.textContent =
        pre.dataset.language ||
        code.className.match(/language-([a-z0-9-]+)/i)?.[1] ||
        'Code'
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'code-copy'
      button.textContent = 'Copy code'
      button.setAttribute('aria-label', `Copy code example ${index + 1}`)
      const status = document.createElement('p')
      status.className = 'code-copy-status'
      status.setAttribute('role', 'status')
      caption.append(language, button)
      pre.before(wrapper)
      wrapper.append(caption, pre, status)

      async function copyCode(): Promise<void> {
        status.textContent = ''
        try {
          if (!navigator.clipboard?.writeText)
            throw new Error('Clipboard access is unavailable')
          await navigator.clipboard.writeText(code?.textContent ?? '')
          status.textContent = 'Code copied to the clipboard.'
        } catch {
          const selection = window.getSelection()
          if (selection && code) {
            const range = document.createRange()
            range.selectNodeContents(code)
            selection.removeAllRanges()
            selection.addRange(range)
            pre.focus({ preventScroll: true })
            status.textContent =
              'The code is selected. Copy it with your keyboard or browser menu.'
          } else {
            status.textContent =
              'Clipboard access is unavailable. Select the code to copy it.'
          }
        }
      }
      button.addEventListener('click', copyCode)
      cleanups.push(() => {
        button.removeEventListener('click', copyCode)
        if (wrapper.parentNode) {
          wrapper.before(pre)
          wrapper.remove()
        }
        if (previousTabIndex === null) pre.removeAttribute('tabindex')
        else pre.setAttribute('tabindex', previousTabIndex)
        if (previousLabel === null) pre.removeAttribute('aria-label')
        else pre.setAttribute('aria-label', previousLabel)
      })
    }
    return () => cleanups.forEach((cleanup) => cleanup())
  })
</script>

<SEOHead
  type="article"
  title={post.title}
  description={post.description ?? ''}
  image={post.coverUrl ?? undefined}
  isBlog={true}
  jsonLd={[
    breadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: post.title, url: `/blog/${post.slug}` }
    ]),
    articleJsonLd
  ]}
/>

<div class="post-page article-page">
  <div class="container">
    <nav class="back-link" aria-label="Breadcrumb">
      <a class="text-link" href="/blog"
        ><span aria-hidden="true">←</span> Back to the blog</a
      >
    </nav>
    <article class="post-article" aria-labelledby="post-heading">
      {#if post.coverUrl}
        <figure class="post-cover">
          <img src={post.coverUrl} alt="Cover image for {post.title}" />
        </figure>
      {/if}
      <header class="post-header" use:fadeInUp={{ duration: 450 }}>
        <p class="eyebrow">Blog</p>
        <h1 id="post-heading">{post.title}</h1>
        <div class="post-meta">
          {#if formattedDate}<time datetime={post.publishedAt ?? undefined}
              >{formattedDate}</time
            >{/if}
          {#if readingLabel}<span>{readingLabel}</span>{/if}
        </div>
        {#if post.tags.length > 0}
          <nav class="post-tags" aria-label="Post tags">
            {#each post.tags as tag (tag.id)}<a
                href="/blog?tag={encodeURIComponent(tag.slug)}"
                class="tag-chip">{tag.name}</a
              >{/each}
          </nav>
        {/if}
      </header>
      <div class="article-layout">
        <div class="article-toc">
          {#if tableOfContents.length > 1}
            <nav aria-label="On this page">
              <p class="eyebrow">On this page</p>
              {#each tableOfContents as entry (entry.id)}
                <a
                  class:subsection={entry.level === 3}
                  href="#{entry.id}"
                  onclick={(event) => focusHeading(event, entry.id)}
                  >{entry.title}</a
                >
              {/each}
            </nav>
          {/if}
        </div>
        <div class="article-reading">
          <div class="post-content" bind:this={contentElement}>
            {@html post.renderedContent}
          </div>
          {#if post.prevPost || post.nextPost}
            <nav class="post-nav" aria-label="Post navigation">
              {#if post.prevPost}<a
                  href="/blog/{post.prevPost.slug}"
                  class="nav-link nav-prev"
                  ><span class="eyebrow">Previous post</span><span
                    >{post.prevPost.title}</span
                  ><span aria-hidden="true">←</span></a
                >{/if}
              {#if post.nextPost}<a
                  href="/blog/{post.nextPost.slug}"
                  class="nav-link nav-next"
                  ><span class="eyebrow">Next post</span><span
                    >{post.nextPost.title}</span
                  ><span aria-hidden="true">→</span></a
                >{/if}
            </nav>
          {/if}
        </div>
      </div>
    </article>
  </div>
</div>

<style>
  .article-page {
    padding-block: var(--space-8) var(--space-12);
  }
  .eyebrow {
    margin: 0;
    color: var(--color-muted);
    font-size: var(--text-xs);
    font-weight: 400;
    letter-spacing: 0.075em;
    text-transform: uppercase;
  }
  .back-link {
    margin-bottom: var(--space-10);
  }
  .text-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 44px;
    color: var(--color-muted);
    font-size: var(--text-sm);
    text-decoration: none;
  }
  .text-link:hover {
    color: var(--color-accent);
  }
  .post-cover {
    margin: 0 0 var(--space-10);
    aspect-ratio: 21 / 9;
    overflow: hidden;
    border-radius: var(--radius-sm);
    background: var(--color-surface);
  }
  .post-cover img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .post-header {
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-8);
  }
  .post-header h1 {
    margin: var(--space-5) 0 0;
    max-width: 29ch;
    font-size: clamp(2rem, 4.4vw, 3.75rem);
    line-height: 1.12;
    letter-spacing: -0.035em;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .post-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-6);
    margin-top: var(--space-6);
    color: var(--color-muted);
    font-size: var(--text-sm);
  }
  .post-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-4);
  }
  .tag-chip {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-accent);
    font-size: var(--text-xs);
    text-decoration: none;
  }
  .tag-chip:hover {
    border-color: var(--color-accent);
  }
  .article-layout {
    display: grid;
    grid-template-columns: 224px minmax(0, 720px);
    justify-content: space-between;
    gap: var(--space-20);
    padding-top: var(--space-12);
  }
  .article-toc {
    position: sticky;
    top: calc(var(--header-height) + var(--space-8));
    align-self: start;
    max-height: calc(100dvh - var(--header-height) - var(--space-16));
    overflow-y: auto;
  }
  .article-toc:empty {
    display: none;
  }
  .article-toc .eyebrow {
    margin-bottom: var(--space-4);
  }
  .article-toc a {
    display: flex;
    align-items: center;
    min-height: 44px;
    padding-block: var(--space-3);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-muted);
    font-size: var(--text-sm);
    line-height: 1.65;
    text-decoration: none;
    overflow-wrap: anywhere;
  }
  .article-toc a:hover {
    color: var(--color-accent);
  }
  .article-toc a.subsection {
    padding-left: var(--space-4);
    font-size: var(--text-xs);
  }
  .article-reading {
    grid-column: 2;
    min-width: 0;
  }
  .post-content {
    min-width: 0;
    color: var(--color-text);
    font-size: 18px;
    line-height: 1.85;
    overflow-wrap: anywhere;
  }
  .post-content :global(p) {
    margin: 0;
  }
  .post-content :global(p + p) {
    margin-top: var(--space-5);
  }
  .post-content :global(h2) {
    margin: var(--space-12) 0 var(--space-6);
    font-size: 1.8rem;
    line-height: 1.3;
    letter-spacing: -0.025em;
    font-weight: 500;
    scroll-margin-top: calc(var(--header-height) + var(--space-8));
  }
  .post-content :global(h3) {
    margin: var(--space-10) 0 var(--space-5);
    font-size: 1.45rem;
    line-height: 1.35;
    font-weight: 500;
    scroll-margin-top: calc(var(--header-height) + var(--space-8));
  }
  .post-content :global(h4) {
    margin: var(--space-8) 0 var(--space-4);
    font-size: 1.2rem;
    line-height: 1.4;
    font-weight: 500;
  }
  .post-content :global(a) {
    color: var(--color-accent);
    text-underline-offset: 4px;
  }
  .post-content :global(a:hover) {
    color: var(--color-accent-hover);
  }
  .post-content :global(ul),
  .post-content :global(ol) {
    padding-left: var(--space-6);
    margin-block: var(--space-6);
  }
  .post-content :global(li) {
    padding-left: var(--space-2);
  }
  .post-content :global(li + li) {
    margin-top: var(--space-3);
  }
  .post-content :global(code) {
    font-family: var(--font-mono);
    font-size: 0.88em;
  }
  .post-content :global(p code),
  .post-content :global(li code),
  .post-content :global(h2 code),
  .post-content :global(h3 code) {
    color: var(--color-accent);
  }
  .post-content :global(pre) {
    max-width: 100%;
    margin: var(--space-6) 0;
    padding: var(--space-5);
    overflow-x: auto;
    background: var(--color-surface) !important;
    color: var(--color-text) !important;
    font-size: 14px;
    line-height: 1.8;
    tab-size: 4;
  }
  .post-content :global(pre code) {
    display: block;
    font-size: 1em;
    white-space: pre;
    overflow-wrap: normal;
  }
  .post-content :global(pre code span) {
    color: var(--color-text) !important;
  }
  .post-content :global(pre:focus-visible),
  .post-content :global(a:focus-visible),
  .post-content :global(button:focus-visible) {
    outline: 2px solid var(--color-accent);
    outline-offset: 3px;
  }
  .post-content :global(img) {
    display: block;
    max-width: 100%;
    height: auto;
    margin-block: var(--space-6);
    border-radius: var(--radius-sm);
  }
  .post-content :global(blockquote) {
    margin: var(--space-6) 0;
    padding-left: var(--space-5);
    border-left: 2px solid var(--color-accent);
    color: var(--color-muted);
  }
  .post-content :global(hr) {
    margin-block: var(--space-10);
    border: 0;
    border-top: 1px solid var(--color-border);
  }
  .post-content :global(table) {
    display: block;
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    margin-block: var(--space-6);
    border-collapse: collapse;
    font-size: var(--text-sm);
  }
  .post-content :global(th),
  .post-content :global(td) {
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    text-align: left;
  }
  .post-content :global(th) {
    background: var(--color-surface);
    font-weight: 500;
  }
  .post-content :global(.code-block) {
    min-width: 0;
    margin: var(--space-6) 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
  }
  .post-content :global(.code-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-2) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-muted);
    font-size: var(--text-xs);
  }
  .post-content :global(.code-copy) {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-background);
    color: var(--color-accent);
    font-size: var(--text-xs);
    cursor: pointer;
  }
  .post-content :global(.code-copy:hover) {
    border-color: var(--color-accent);
  }
  .post-content :global(.code-block pre) {
    margin: 0;
  }
  .post-content :global(.code-copy-status) {
    padding: 0 var(--space-5) var(--space-4);
    color: var(--color-muted);
    font-size: var(--text-xs);
    line-height: 1.5;
  }
  .post-content :global(.code-copy-status:empty) {
    display: none;
  }
  .post-nav {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: var(--space-8);
    border-top: 1px solid var(--color-border);
    margin-top: var(--space-10);
    padding-top: var(--space-6);
  }
  .nav-link {
    display: grid;
    gap: var(--space-2);
    min-height: 44px;
    color: var(--color-accent);
    text-decoration: none;
  }
  .nav-link:hover {
    color: var(--color-accent-hover);
  }
  .nav-next {
    grid-column: 2;
  }
  @media (max-width: 1000px) {
    .article-layout {
      grid-template-columns: 180px minmax(0, 1fr);
      gap: var(--space-10);
    }
    .post-content {
      font-size: 17px;
    }
  }
  @media (max-width: 740px) {
    .article-page {
      padding-block: var(--space-10) var(--space-8);
    }
    .back-link {
      margin-bottom: var(--space-6);
    }
    .post-cover {
      margin-bottom: var(--space-6);
      aspect-ratio: 16 / 9;
    }
    .post-header h1 {
      font-size: clamp(2rem, 6.3vw, 2.7rem);
      line-height: 1.16;
    }
    .post-meta {
      gap: var(--space-2) var(--space-4);
      font-size: var(--text-xs);
    }
    .article-layout {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-8);
      padding-top: var(--space-8);
    }
    .article-toc {
      position: static;
      max-height: none;
      overflow-y: visible;
    }
    .article-toc .eyebrow {
      margin-bottom: var(--space-2);
    }
    .article-reading {
      grid-column: 1;
    }
    .post-content {
      font-size: 16px;
    }
    .post-content :global(h2) {
      font-size: 1.55rem;
      margin-block: var(--space-8) var(--space-5);
    }
    .post-content :global(h3) {
      font-size: 1.3rem;
    }
    .post-content :global(pre) {
      font-size: 13px;
      padding: var(--space-4);
    }
    .post-content :global(.code-header) {
      padding-inline: var(--space-4);
    }
    .post-content :global(.code-copy-status) {
      padding-inline: var(--space-4);
    }
    .post-nav {
      grid-template-columns: minmax(0, 1fr);
    }
    .nav-next {
      grid-column: 1;
    }
  }
  @media (max-width: 350px) {
    .post-header h1 {
      font-size: 1.9rem;
    }
  }
</style>
