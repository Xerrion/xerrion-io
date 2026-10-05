<script lang="ts">
  import type { PageData } from './$types'

  import Icon from '$lib/components/Icon.svelte'
  import SEOHead from '$lib/components/SEOHead.svelte'
  import { websiteSchema, personSchema } from '$lib/seo'
  import { fadeInUp, fadeIn, reveal } from '$lib/utils/animate'

  interface Props { data: PageData }
  let { data }: Props = $props()
  const charlieSource = $derived(data.charliePhoto?.mediumUrl ?? data.charliePhoto?.thumbUrl ?? data.charliePhoto?.fullUrl)
  const gallerySource = $derived(data.galleryPhoto?.mediumUrl ?? data.galleryPhoto?.thumbUrl ?? data.galleryPhoto?.fullUrl)
</script>

<SEOHead title="Xerrion - Lasse's Corner of the Internet" description="I'm Lasse Skovgaard Nielsen, a software developer in Odense, Denmark. I build internal tools at TV 2 Danmark and explore ideas through personal projects." jsonLd={[websiteSchema(), personSchema()]} />

<div class="container">
      <section class="hero" class:hero-without-photo={!charlieSource} aria-labelledby="intro-heading">
        <div class="hero-content">
          <p class="hero-eyebrow eyebrow" use:fadeInUp={{ duration: 500 }}><Icon name="code" size="sm" /> Software developer · Odense, Denmark</p>
          <h1 id="intro-heading" use:fadeInUp={{ duration: 650, delay: 60 }}>I'm Lasse.<span>I build software.</span></h1>
          <p class="hero-description" use:fadeInUp={{ duration: 600, delay: 120 }}>I'm <strong>Lasse Skovgaard Nielsen</strong>, online as Xerrion. I build internal tools at TV 2 Danmark and explore ideas through personal projects.</p>
          <div class="hero-actions" use:fadeInUp={{ duration: 550, delay: 180 }}><a class="button" href="/projects">See my projects <Icon name="arrow-right" size="sm" /></a><a class="text-link" href="/about">A little about me <Icon name="arrow-right" size="sm" /></a></div>
        </div>
        {#if charlieSource && data.charliePhoto}
          <aside class="charlie-aside" use:fadeIn={{ duration: 650, delay: 200 }} aria-label="Charlie, my golden retriever">
            <a class="charlie-link" href="/gallery?category=charlie"><img class="charlie-photo" src={charlieSource} alt="Charlie, my golden retriever" width={data.charliePhoto.width ?? 408} height={data.charliePhoto.height ?? 434}><span class="charlie-caption"><span class="charlie-name"><Icon name="paw" size="sm" /> Meet Charlie</span><Icon name="arrow-right" size="sm" /></span></a>
            <p>My golden retriever.</p>
          </aside>
        {/if}
      </section>
      <section class="projects" id="projects" aria-labelledby="projects-heading">
        <div class="section-top"><p class="eyebrow" id="projects-heading"><Icon name="folder" size="sm" /> Selected work</p><a class="text-link" href="/projects">All projects <Icon name="arrow-up-right" size="sm" /></a></div>
        <article class="project">
          <div class="project-copy" use:reveal={{ duration: 650 }}><h2>Particle Foundry</h2><p>A browser sandbox where particles fall, liquids flow, and heat changes materials.</p><a class="text-link" href="https://github.com/Xerrion/particle-foundry" target="_blank" rel="noopener noreferrer" aria-label="Particle Foundry source on GitHub, opens in a new tab">View the source <Icon name="arrow-up-right" size="sm" /></a></div>
          <figure class="project-art" use:reveal={{ duration: 700, delay: 80, type: 'scaleIn' }}>
            <a class="project-preview-link" href="https://github.com/Xerrion/particle-foundry" target="_blank" rel="noopener noreferrer" aria-label="Particle Foundry source on GitHub, opens in a new tab"><img class="project-preview" src="/images/particle-foundry-preview.jpg" alt="Particle Foundry sandbox with water, sand and oil, alongside the material controls" width="1280" height="720"></a>
            <figcaption class="project-caption"><span>Particle Foundry</span><span>Falling-sand sandbox</span></figcaption>
          </figure>
        </article>
      </section>
      <section class="editorial-row" use:reveal={{ duration: 600, threshold: 0.05 }} id="about" aria-labelledby="about-heading">
        <p class="row-label eyebrow"><Icon name="code" size="sm" /> About</p>
        <div><h2 class="row-heading" id="about-heading">Curious about software.</h2><p class="row-copy">I like practical software that makes everyday tasks easier. TypeScript is my daily driver, and I'm learning more Rust through personal projects. Before TV 2, I worked in satellite communications, where I learned a lot about building reliable systems.</p><p class="row-copy">Away from the keyboard, I'm usually walking Charlie with a podcast on or gaming with friends. Charlie is my golden retriever. He gets me outside and turns up in far too many of the photos here.</p></div>
        <div class="row-aside"><p>You can find my code on GitHub and my professional profile on LinkedIn.</p><a class="text-link" href="https://www.linkedin.com/in/lasse-skovgaard-nielsen/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile, opens in a new tab">Find me on LinkedIn <Icon name="arrow-up-right" size="sm" /></a></div>
      </section>
      <section class="editorial-row" use:reveal={{ duration: 600, threshold: 0.05 }} id="blog" aria-labelledby="blog-heading">
        <p class="row-label eyebrow"><Icon name="book-open" size="sm" /> Blog</p>
        <div><h2 class="row-heading" id="blog-heading">Notes on what I'm learning.</h2><p class="row-copy">A place for software, personal projects, and the things I learn along the way.</p>
          {#if data.latestPosts.length > 0}
            <ul class="recent-posts" aria-label="Latest posts">
              {#each data.latestPosts as post (post.id)}
                <li><a href={`/blog/${post.slug}`}>{post.title}<Icon name="arrow-up-right" size="sm" /></a></li>
              {/each}
            </ul>
          {/if}</div>
        <div class="row-aside"><a class="text-link" href="/blog">Read the blog <Icon name="arrow-right" size="sm" /></a></div>
      </section>
      <section class="editorial-row" use:reveal={{ duration: 600, threshold: 0.05 }} id="gallery" aria-labelledby="gallery-heading">
        <p class="row-label eyebrow"><Icon name="camera" size="sm" /> Gallery</p>
        <div><h2 class="row-heading" id="gallery-heading">Away from the keyboard.</h2><p class="row-copy">Photos from life outside software. Charlie, my golden retriever, makes regular appearances.</p><a class="text-link" href="/gallery">Browse the gallery <Icon name="arrow-right" size="sm" /></a></div>
        <div class="row-aside">
          {#if gallerySource && data.galleryPhoto}
            <a class="gallery-image-link" href={`/gallery?category=${encodeURIComponent(data.galleryPhoto.category)}`}><img class="gallery-preview" src={gallerySource} alt={data.galleryPhoto.name} loading="lazy" width={data.galleryPhoto.width ?? 600} height={data.galleryPhoto.height ?? 420}></a>
          {:else}
            <p class="gallery-status">{data.galleryError ?? 'No photos yet.'}</p>
          {/if}
        </div>
      </section>
    </div>

<style>
  .hero-eyebrow, .section-top .eyebrow, .row-label, .charlie-name { display: inline-flex; align-items: center; gap: var(--space-2); }
  .eyebrow :global(.icon), .charlie-name :global(.icon) { color: var(--color-accent); }
  .charlie-link { transition: transform 480ms var(--motion-easing); }
  .charlie-link:is(:hover, :focus-visible) { transform: translateY(-3px) rotate(-1deg); }
  .project-art { transition: border-color var(--transition-base), box-shadow var(--transition-base); }
  .project-art:has(a:is(:hover, :focus-visible)) { border-color: var(--color-accent); box-shadow: var(--shadow-md); }
  .editorial-row { transition: border-color 320ms var(--motion-easing); }
  .editorial-row:focus-within, .editorial-row:hover { border-top-color: var(--color-accent); }
  @media (prefers-reduced-motion: reduce) { .charlie-link:is(:hover, :focus-visible) { transform: none; } }

    .eyebrow { font-size: var(--text-xs); font-weight: 400; letter-spacing: .075em; text-transform: uppercase; color: var(--color-muted); }
    .hero { display: grid; grid-template-columns: minmax(0, 1fr) 204px; gap: var(--space-16); padding-block: var(--space-16) var(--space-12); align-items: end; }
    .hero.hero-without-photo { grid-template-columns: minmax(0, 1fr); }
    .hero-without-photo .hero-actions { grid-column: 1 / -1; }
    .hero h1 { margin-top: var(--space-6); font-size: clamp(3.2rem, 6.7vw, 6.15rem); line-height: 1.04; letter-spacing: -.043em; font-weight: 500; }
    .hero h1 span { display: block; color: var(--color-accent); }
    .hero-description { color: var(--color-muted); max-width: 58ch; margin-top: var(--space-6); font-size: var(--text-lg); line-height: 1.6; }
    .hero-description strong { font-weight: 400; color: var(--color-text); }
    .hero-actions { margin-top: var(--space-8); display: flex; flex-wrap: wrap; gap: var(--space-6); align-items: center; }
    .button { display: inline-flex; align-items: center; justify-content: space-between; gap: var(--space-6); min-height: 48px; background: var(--color-accent); color: var(--color-background); padding: var(--space-3) var(--space-5); font-size: var(--text-sm); font-weight: 600; border-radius: var(--radius-sm); }
    .button:hover { color: var(--color-background); background: var(--color-accent-hover); }
    .text-link { display: inline-flex; align-items: center; gap: var(--space-3); min-height: 44px; font-size: var(--text-sm); }
    .charlie-aside { padding-bottom: var(--space-1); }
    .charlie-link { display: block; }
    .charlie-photo { width: 100%; height: 217px; object-fit: cover; object-position: center 42%; border-radius: var(--radius-sm); }
    .charlie-caption { display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; padding-top: var(--space-3); font-size: var(--text-sm); color: var(--color-muted); }
    .charlie-caption span:first-child { color: var(--color-text); }
    .charlie-aside p { font-size: var(--text-xs); color: var(--color-muted); margin-top: var(--space-1); }
    .projects { padding-top: var(--space-8); padding-bottom: var(--space-16); }
    .section-top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-6); padding-block: var(--space-5); border-top: 1px solid var(--color-border); }
    .section-top .text-link { color: var(--color-muted); }
    .section-top .text-link:hover { color: var(--color-accent); }
    .project { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.4fr); gap: var(--space-10); align-items: center; }
    .project-copy { padding-block: var(--space-8); }
    .project-copy h2 { font-size: clamp(2.2rem, 3.6vw, 3.5rem); line-height: 1.08; letter-spacing: -.035em; font-weight: 500; }
    .project-copy p { color: var(--color-muted); margin-top: var(--space-5); max-width: 32ch; }
    .project-copy .text-link { color: var(--color-accent); margin-top: var(--space-6); }
    .project-art { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-sm); overflow: hidden; }
    .project-preview-link { display: block; }
    .project-preview { display: block; width: 100%; height: auto; object-fit: contain; }
    .project-caption { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); min-height: 58px; padding: var(--space-3) var(--space-5); border-top: 1px solid var(--color-border); font-size: var(--text-xs); }
    .project-caption span:last-child { color: var(--color-muted); }
    .editorial-row { display: grid; grid-template-columns: minmax(0, .6fr) minmax(0, 1.1fr) minmax(0, .7fr); gap: var(--space-12); align-items: start; border-top: 1px solid var(--color-border); padding-block: var(--space-10); }
    .row-label { padding-top: var(--space-1); }
    .row-heading { font-size: clamp(1.65rem, 2.2vw, 2.3rem); line-height: 1.15; letter-spacing: -.025em; font-weight: 400; }
    .row-copy { color: var(--color-muted); max-width: 50ch; margin-top: var(--space-5); }
    .row-aside { color: var(--color-muted); font-size: var(--text-sm); padding-top: var(--space-2); }
    .row-aside .text-link { color: var(--color-accent); }
    .row-aside p { margin-bottom: var(--space-4); }
    .gallery-preview { margin-top: var(--space-6); width: 100%; height: 210px; object-fit: cover; object-position: center 48%; border-radius: var(--radius-sm); }
    .gallery-image-link { display: block; }
    .gallery-status { margin-top: var(--space-6); }
    @media (min-width: 1500px) { .hero h1 { font-size: 6.15rem; } }
    @media (max-width: 1000px) {




      .hero { grid-template-columns: minmax(0, 1fr) 164px; gap: var(--space-8); padding-top: var(--space-12); }
      .hero h1 { font-size: clamp(3rem, 6.4vw, 5rem); }
      .hero-description { font-size: var(--text-base); }
      .charlie-photo { height: 189px; }
      .project { gap: var(--space-8); grid-template-columns: minmax(0, .9fr) minmax(0, 1.25fr); }
      .project-copy h2 { font-size: 2.55rem; }
      .editorial-row { grid-template-columns: minmax(0, .42fr) minmax(0, 1fr) minmax(0, .7fr); gap: var(--space-8); }
      .gallery-preview { height: 160px; }
    }
    @media (max-width: 740px) {







      .hero { grid-template-columns: minmax(0, 1fr) 112px; gap: var(--space-6); padding-block: var(--space-10) var(--space-8); align-items: end; }
      .hero-content { display: contents; }
      .hero-eyebrow, .hero h1 { grid-column: 1 / -1; }
      .hero h1 { font-size: clamp(2.75rem, 9.8vw, 4.4rem); margin-top: 0; line-height: 1.08; letter-spacing: -.038em; }
      .hero h1 span { margin-top: var(--space-1); }
      .hero-description { grid-column: 1 / -1; margin-top: 0; max-width: 48ch; }
      .hero-actions { grid-column: 1; margin-top: 0; gap: var(--space-2); flex-direction: column; align-items: flex-start; }
      .button { gap: var(--space-3); padding-inline: var(--space-4); }
      .charlie-aside { grid-column: 2; grid-row: 4; padding-bottom: 0; }
      .charlie-photo { height: 112px; }
      .charlie-caption { font-size: var(--text-xs); padding-top: var(--space-2); }
      .charlie-aside p { display: none; }
      .projects { padding-top: var(--space-6); padding-bottom: var(--space-10); }
      .section-top { padding-block: var(--space-3); gap: var(--space-3); }
      .section-top .text-link { font-size: var(--text-xs); }
      .project { display: block; }
      .project-copy { padding-top: var(--space-5); padding-bottom: var(--space-6); }
      .project-copy h2 { font-size: 2.55rem; }
      .project-copy p { max-width: 38ch; margin-top: var(--space-4); }
      .project-copy .text-link { margin-top: var(--space-3); }
      .editorial-row { grid-template-columns: 1fr; padding-block: var(--space-8); gap: var(--space-5); }
      .row-label { padding-top: 0; }
      .row-heading { font-size: 2rem; }
      .row-copy { margin-top: var(--space-4); }
      .row-aside { padding-top: 0; }
      .row-aside p { margin-bottom: var(--space-2); }
      .gallery-preview { height: 225px; margin-top: 0; }


    }
    @media (max-width: 350px) {

      .hero { grid-template-columns: minmax(0, 1fr) 96px; gap: var(--space-5); }
      .hero h1 { font-size: 2.55rem; }
      .hero-eyebrow { font-size: .6875rem; letter-spacing: .035em; }
      .charlie-photo { height: 100px; }
      .button { font-size: .8125rem; padding-inline: var(--space-3); gap: var(--space-3); }
      .project-copy h2 { font-size: 2.3rem; }
    }


  p, figure { margin: 0; }
  .button { transition: transform 240ms var(--motion-easing), background-color var(--transition-base); }
  .button:hover { transform: translateY(-2px); }
  .button:active { transform: translateY(0); }
  .charlie-photo, .gallery-preview, .project-preview { transition: transform 600ms var(--motion-easing); }
  .charlie-link:hover .charlie-photo, .gallery-image-link:hover .gallery-preview { transform: translateY(-3px); }
  .project-preview-link { overflow: hidden; }
  .project-preview-link:hover .project-preview { transform: scale(1.025); }
  .recent-posts { list-style: none; margin-top: var(--space-6); }
  .recent-posts li { border-top: 1px solid var(--color-border); }
  .recent-posts a { display: flex; justify-content: space-between; gap: var(--space-4); min-height: 44px; padding-block: var(--space-3); font-size: var(--text-sm); }
  .recent-posts :global(.icon) { color: var(--color-accent); }
  @media (prefers-reduced-motion: reduce) {
    .button:hover, .charlie-link:hover .charlie-photo, .gallery-image-link:hover .gallery-preview, .project-preview-link:hover .project-preview { transform: none; }
  }

</style>
