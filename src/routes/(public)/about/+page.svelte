<script lang="ts">
  import SEOHead from '$lib/components/SEOHead.svelte'
  import { personSchema, breadcrumbSchema } from '$lib/seo'
  import { fadeInUp, staggerReveal } from '$lib/utils/animate'
</script>

<SEOHead
  title="About"
  description="About Lasse Skovgaard Nielsen, known online as Xerrion. Software developer in Odense, Denmark, building internal tools and personal projects."
  type="profile"
  jsonLd={[
    personSchema(),
    breadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'About', url: '/about' }
    ])
  ]}
/>

<article class="about about-page">
  <div class="container">
    <header class="reading-header" use:fadeInUp={{ duration: 500 }}>
      <p class="eyebrow">About</p>
      <h1>The longer<span>version.</span></h1>
      <p class="reading-lead">
        I'm Lasse Skovgaard Nielsen, online as Xerrion. A software developer
        based in Odense, Denmark.
      </p>
    </header>

    <div use:staggerReveal={{ staggerDelay: 80, selector: '.about-row' }}>
      <section class="about-row" aria-labelledby="about-work-title">
        <p class="eyebrow row-label">Software</p>
        <div class="about-prose">
          <h2 id="about-work-title">Curious about software.</h2>
          <p>
            I like practical software that makes everyday tasks easier. At TV 2
            Danmark, I build internal tools that help people do their jobs.
          </p>
          <p>
            TypeScript is my daily driver, and I'm learning more Rust through
            personal projects. Before TV 2, I worked in satellite
            communications, where I learned a lot about building reliable
            systems.
          </p>
          <a class="text-link" href="/projects"
            >See my projects <span aria-hidden="true">→</span></a
          >
        </div>
        <aside class="about-tools" aria-labelledby="about-tools-title">
          <h3 class="eyebrow" id="about-tools-title">
            Tools I spend time with
          </h3>
          <dl>
            <div>
              <dt>TypeScript</dt>
              <dd>Everyday development</dd>
            </div>
            <div>
              <dt>Rust</dt>
              <dd>Personal projects and learning</dd>
            </div>
            <div>
              <dt>Svelte</dt>
              <dd>This website</dd>
            </div>
            <div>
              <dt>ServiceNow</dt>
              <dd>Internal tools and integrations</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section class="about-row" aria-labelledby="about-life-title">
        <p class="eyebrow row-label">Outside work</p>
        <div class="about-prose">
          <h2 id="about-life-title">Away from the keyboard.</h2>
          <p>
            I'm usually walking Charlie with a podcast on or gaming with
            friends. Charlie is my golden retriever. He gets me outside and
            turns up in far too many of the photos here.
          </p>
          <p>
            The podcasts range from tech to true crime, with a few random topics
            in between. There are also the side projects. Some even get
            finished.
          </p>
          <a class="text-link" href="/gallery"
            >Browse the gallery <span aria-hidden="true">→</span></a
          >
        </div>
        <figure class="about-charlie">
          <img
            src="https://pub-371d85115c2944799b7b432c262540fb.r2.dev/gallery/charlie/img_20230813_112407-289s9y-medium.webp"
            alt="Charlie, my golden retriever"
            width="600"
            height="420"
            loading="lazy"
          />
          <figcaption>Charlie. A good reason to take a break.</figcaption>
        </figure>
      </section>

      <section class="about-row" aria-labelledby="about-contact-title">
        <p class="eyebrow row-label">Contact</p>
        <div class="about-prose">
          <h2 id="about-contact-title">Say hi.</h2>
          <p>
            I'm happy to talk about code, dogs, or whatever. Email is the
            easiest way to get in touch.
          </p>
          <a class="button" href="mailto:lasse@xerrion.dk"
            >Send an email <span aria-hidden="true">↗</span></a
          >
        </div>
        <aside class="about-social" aria-label="Find me elsewhere">
          <a
            class="text-link"
            href="https://github.com/Xerrion"
            target="_blank"
            rel="noopener noreferrer"
            >GitHub <span aria-hidden="true">↗</span></a
          >
          <a
            class="text-link"
            href="https://www.linkedin.com/in/lasse-skovgaard-nielsen/"
            target="_blank"
            rel="noopener noreferrer"
            >LinkedIn <span aria-hidden="true">↗</span></a
          >
        </aside>
      </section>
    </div>
  </div>
</article>

<style>
  .about-page {
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
  .about-row {
    display: grid;
    grid-template-columns: minmax(0, 0.48fr) minmax(0, 1.2fr) minmax(0, 0.64fr);
    gap: var(--space-12);
    padding-block: var(--space-12);
    border-top: 1px solid var(--color-border);
    align-items: start;
  }
  .row-label {
    padding-top: var(--space-1);
  }
  .about-prose h2 {
    margin: 0;
    font-size: clamp(1.65rem, 2.2vw, 2.3rem);
    line-height: 1.15;
    letter-spacing: -0.025em;
    font-weight: 400;
  }
  .about-prose p {
    margin: var(--space-5) 0 0;
    color: var(--color-muted);
    font-size: var(--text-base);
    line-height: 1.85;
  }
  .text-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 44px;
    font-size: var(--text-sm);
    color: var(--color-accent);
    text-decoration: none;
  }
  .text-link:hover {
    color: var(--color-accent-hover);
  }
  .about-prose .text-link {
    margin-top: var(--space-4);
  }
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    min-height: 48px;
    margin-top: var(--space-6);
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
  .about-tools dl {
    margin: var(--space-4) 0 0;
  }
  .about-tools dl div {
    border-bottom: 1px solid var(--color-border);
    padding-block: var(--space-3);
  }
  .about-tools dt {
    font-size: var(--text-sm);
    color: var(--color-text);
  }
  .about-tools dd {
    margin: var(--space-1) 0 0;
    font-size: var(--text-xs);
    color: var(--color-muted);
    line-height: 1.65;
  }
  .about-charlie {
    margin: 0;
  }
  .about-charlie img {
    display: block;
    width: 100%;
    height: 232px;
    object-fit: cover;
    border-radius: var(--radius-sm);
  }
  .about-charlie figcaption {
    padding-top: var(--space-3);
    color: var(--color-muted);
    font-size: var(--text-xs);
  }
  .about-social {
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: var(--space-1);
  }
  @media (max-width: 1000px) {
    .about-row {
      grid-template-columns: minmax(0, 0.38fr) minmax(0, 1.15fr) minmax(
          0,
          0.65fr
        );
      gap: var(--space-8);
    }
    .about-charlie img {
      height: 190px;
    }
  }
  @media (max-width: 740px) {
    .about-page {
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
    .about-row {
      grid-template-columns: minmax(0, 1fr);
      padding-block: var(--space-8);
      gap: var(--space-5);
    }
    .about-prose h2 {
      font-size: 2rem;
    }
    .about-prose p {
      margin-top: var(--space-4);
    }
    .about-tools {
      padding-top: var(--space-4);
    }
    .about-tools dl {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 0 var(--space-5);
      margin-top: var(--space-3);
    }
    .about-charlie {
      max-width: 440px;
    }
    .about-charlie img {
      height: 250px;
    }
    .about-social {
      flex-direction: row;
      gap: var(--space-6);
    }
  }
  @media (max-width: 350px) {
    .reading-header h1 {
      font-size: 2.55rem;
    }
    .about-tools dl {
      gap: 0 var(--space-4);
    }
  }
</style>
