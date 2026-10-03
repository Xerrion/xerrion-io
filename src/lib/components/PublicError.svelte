<script lang="ts">
  import { page } from '$app/state'

  import SEOHead from '$lib/components/SEOHead.svelte'
  import { fadeInUp } from '$lib/utils/animate'

  let notFound = $derived(page.status === 404)
</script>

<SEOHead
  title={notFound ? 'Page Not Found' : 'Page Unavailable'}
  description={notFound
    ? 'This page is not here. Return home or browse the website.'
    : 'This page is temporarily unavailable. Please try again later.'}
  noindex={true}
/>

<div class="error-page container">
  <div class="error-copy" use:fadeInUp={{ duration: 450 }}>
    <p class="eyebrow">
      {page.status} / {notFound ? 'Page not found' : 'Page unavailable'}
    </p>
    <h1>
      {notFound ? 'This page' : 'Something'}<span
        >{notFound ? "isn't here." : 'went wrong.'}</span
      >
    </h1>
    <p class="error-message">
      {notFound
        ? 'The address may have changed, or the link may be incomplete.'
        : 'This page could not load. Please try again later.'}
    </p>
    <div class="error-actions">
      <a class="button" href="/"
        >Back to home <span aria-hidden="true">→</span></a
      >
      <a class="text-link" href="/projects"
        >Browse projects <span aria-hidden="true">↗</span></a
      >
    </div>
  </div>
  <aside class="error-routes" aria-label="Other places to go">
    <p class="eyebrow">A few places you can go</p>
    <a href="/about"><span>About</span><span aria-hidden="true">→</span></a>
    <a href="/blog"><span>Blog</span><span aria-hidden="true">→</span></a>
    <a href="/gallery"><span>Gallery</span><span aria-hidden="true">→</span></a>
  </aside>
</div>

<style>
  .error-page {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: var(--space-24);
    align-items: end;
    padding-block: var(--space-24);
    min-height: 610px;
  }
  .eyebrow {
    margin: 0;
    color: var(--color-muted);
    font-size: var(--text-xs);
    font-weight: 400;
    letter-spacing: 0.075em;
    text-transform: uppercase;
  }
  h1 {
    margin: var(--space-6) 0 0;
    font-size: clamp(3rem, 7vw, 6.15rem);
    line-height: 1.04;
    letter-spacing: -0.043em;
    font-weight: 500;
  }
  h1 span {
    display: block;
    color: var(--color-accent);
  }
  .error-message {
    max-width: 42ch;
    margin: var(--space-6) 0 0;
    color: var(--color-muted);
    font-size: var(--text-lg);
  }
  .error-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
    align-items: center;
    margin-top: var(--space-8);
  }
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    min-height: 48px;
    padding: var(--space-3) var(--space-5);
    background: var(--color-accent);
    color: var(--color-background);
    border-radius: var(--radius-sm);
    text-decoration: none;
    font-size: var(--text-sm);
    font-weight: 600;
  }
  .button:hover {
    background: var(--color-accent-hover);
  }
  .text-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 44px;
    color: var(--color-text);
    font-size: var(--text-sm);
    text-decoration: none;
  }
  .text-link:hover {
    color: var(--color-accent);
  }
  .error-routes .eyebrow {
    margin-bottom: var(--space-4);
  }
  .error-routes a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    min-height: 54px;
    padding-block: var(--space-3);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
    font-size: var(--text-sm);
    text-decoration: none;
  }
  .error-routes a:hover {
    color: var(--color-accent);
  }
  @media (max-width: 1000px) {
    .error-page {
      grid-template-columns: minmax(0, 1fr) 200px;
      gap: var(--space-12);
    }
  }
  @media (max-width: 740px) {
    .error-page {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-12);
      padding-block: var(--space-16) var(--space-10);
      min-height: 0;
    }
    h1 {
      font-size: clamp(2.75rem, 9.8vw, 4.4rem);
      line-height: 1.08;
    }
    .error-message {
      font-size: var(--text-base);
    }
    .error-actions {
      gap: var(--space-4);
    }
    .error-routes {
      max-width: 440px;
    }
  }
  @media (max-width: 350px) {
    h1 {
      font-size: 2.55rem;
    }
  }
</style>
