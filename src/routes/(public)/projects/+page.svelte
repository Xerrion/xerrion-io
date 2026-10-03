<script lang="ts">
  import type { PageData } from './$types'

  import ProjectCard from '$lib/components/ProjectCard.svelte'
  import SEOHead from '$lib/components/SEOHead.svelte'
  import { breadcrumbSchema } from '$lib/seo'
  import { fadeInUp, reveal } from '$lib/utils/animate'

  interface Props { data: PageData }
  let { data }: Props = $props()
  let searchQuery = $state('')
  let selectedLanguage = $state('')
  let searchInput = $state<HTMLInputElement | undefined>()
  const languages = $derived([...new Set(data.projects.flatMap((repo) => repo.language ? [repo.language] : []))].sort())
  const hasUnspecifiedLanguage = $derived(data.projects.some((repo) => repo.language === null))
  const featuredProject = $derived(data.projects.find((repo) => repo.name === 'particle-foundry'))
  const filteredProjects = $derived.by(() => {
    const term = searchQuery.trim().toLowerCase()
    return data.projects.filter((repo) => {
      const matchesSearch = [repo.name, repo.description ?? '', ...repo.topics].some((text) => text.toLowerCase().includes(term))
      const matchesLanguage = selectedLanguage === '' || (selectedLanguage === 'unspecified' ? repo.language === null : repo.language === selectedLanguage)
      return matchesSearch && matchesLanguage
    })
  })
  function clearFilters(): void { searchQuery = ''; selectedLanguage = ''; searchInput?.focus() }
</script>

<SEOHead title="Projects" description="Personal projects and open source tools by Lasse Skovgaard Nielsen, with source code on GitHub." jsonLd={breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Projects', url: '/projects' }])} />

<div class="projects-page container">
  <header class="projects-header" use:fadeInUp={{ duration: 500 }}><p class="eyebrow">Projects</p><h1>Things I <span>build.</span></h1><p class="intro-description">Personal projects and tools I work on. The source lives on GitHub.</p></header>
  {#if data.error}
    <div class="error-message"><h2>Projects could not load.</h2><p>Please try again later, or browse my repositories on GitHub.</p><a class="text-link" href="https://github.com/Xerrion" target="_blank" rel="noopener noreferrer">Browse GitHub <span aria-hidden="true">↗</span></a></div>
  {:else}
    {#if featuredProject}
      <section class="project-feature" aria-labelledby="featured-project-title" use:reveal={{ duration: 450 }}>
        <div class="feature-copy"><p class="eyebrow">Selected project</p><h2 id="featured-project-title">Particle Foundry</h2><p>A browser sandbox where particles fall, liquids flow, and heat changes materials.</p><a class="text-link" href={featuredProject.url} target="_blank" rel="noopener noreferrer" aria-label="Particle Foundry source on GitHub, opens in a new tab">View the source <span aria-hidden="true">↗</span></a></div>
        <figure class="feature-image"><a href={featuredProject.url} target="_blank" rel="noopener noreferrer" aria-label="Particle Foundry source on GitHub, opens in a new tab"><img src="/images/particle-foundry-preview.jpg" alt="Particle Foundry browser sandbox with falling sand and water" width="1280" height="720" /></a><figcaption><span>Particle Foundry</span><span>Falling-sand sandbox</span></figcaption></figure>
      </section>
    {/if}
    <section class="project-directory" aria-labelledby="project-directory-heading">
      <div class="directory-heading"><h2 id="project-directory-heading">Repositories</h2><p class="results-count" aria-live="polite">{filteredProjects.length} project{filteredProjects.length === 1 ? '' : 's'}{#if searchQuery || selectedLanguage}<span class="filtered-note"> (filtered)</span>{/if}</p></div>
      <form class="filters" role="search" aria-label="Filter projects" onsubmit={(event) => event.preventDefault()}>
        <div class="search-box"><label for="project-search">Search projects</label><input id="project-search" type="search" class="search-input" aria-label="Search projects" placeholder="Name, description, or topic" bind:value={searchQuery} bind:this={searchInput} /></div>
        <div class="language-filter"><label for="project-language">Language</label><select id="project-language" class="language-select" aria-label="Filter by programming language" bind:value={selectedLanguage}><option value="">All languages</option>{#each languages as language}<option value={language}>{language}</option>{/each}{#if hasUnspecifiedLanguage}<option value="unspecified">Other</option>{/if}</select></div>
        <button class="clear-btn" type="button" onclick={clearFilters}>Clear filters</button>
      </form>
      {#if filteredProjects.length > 0}<div class="projects-list">{#each filteredProjects as repo (repo.id)}<ProjectCard {repo} />{/each}</div>
      {:else}<div class="empty-state"><h2>Nothing found.</h2><p>Try another search or clear the filters.</p><button class="btn-reset" type="button" onclick={clearFilters}>Clear filters</button></div>{/if}
    </section>
  {/if}
  <div class="next-page"><p>Notes from things I'm working on.</p><a class="text-link" href="/blog">Read the blog <span aria-hidden="true">→</span></a></div>
</div>

<style>
  .projects-header { padding-block: var(--space-16) var(--space-12); }
  .eyebrow { font-size: var(--text-xs); font-weight: 400; letter-spacing: .075em; text-transform: uppercase; color: var(--color-text-muted); }
  h1 { margin-top: var(--space-6); font-size: clamp(3.2rem, 6.7vw, 6.15rem); line-height: 1.04; letter-spacing: -.043em; font-weight: 500; }
  h1 span { color: var(--color-accent); }
  .intro-description { margin-top: var(--space-6); color: var(--color-text-muted); max-width: 52ch; font-size: var(--text-lg); line-height: 1.6; }
  .project-feature { display: grid; grid-template-columns: minmax(0, .75fr) minmax(0, 1.4fr); gap: var(--space-12); padding-block: var(--space-10) var(--space-16); border-top: 1px solid var(--color-border); align-items: center; }
  .feature-copy h2 { font-size: clamp(2.2rem, 3.6vw, 3.5rem); line-height: 1.08; letter-spacing: -.035em; font-weight: 500; margin-top: var(--space-6); }
  .feature-copy > p:not(.eyebrow) { color: var(--color-text-muted); margin-top: var(--space-5); max-width: 32ch; }
  .feature-copy .text-link { margin-top: var(--space-6); }
  .feature-image { border: 1px solid var(--color-border); background: var(--color-surface); border-radius: var(--radius-sm); overflow: hidden; margin: 0; }
  .feature-image a { display: block; }
  .feature-image img { display: block; width: 100%; height: auto; object-fit: contain; }
  .feature-image figcaption { min-height: 58px; display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-3) var(--space-5); border-top: 1px solid var(--color-border); font-size: var(--text-xs); }
  .feature-image figcaption span:last-child { color: var(--color-text-muted); }
  .project-directory { border-top: 1px solid var(--color-border); padding-top: var(--space-8); }
  .directory-heading { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-4); margin-bottom: var(--space-6); }
  .directory-heading h2 { font-size: 2rem; line-height: 1.2; font-weight: 400; letter-spacing: -.025em; }
  .results-count { color: var(--color-text-muted); font-size: var(--text-sm); }
  .filters { display: grid; grid-template-columns: minmax(0, 1fr) minmax(170px, .32fr) auto; gap: var(--space-5); align-items: end; margin-bottom: var(--space-8); }
  .filters label { display: block; color: var(--color-text-muted); font-size: var(--text-sm); margin-bottom: var(--space-2); }
  .filters input, .filters select { display: block; width: 100%; min-height: 48px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text); padding: var(--space-3) var(--space-4); font: inherit; font-size: var(--text-sm); }
  .filters input::placeholder { color: var(--color-text-muted); opacity: 1; }
  .filters input:focus-visible, .filters select:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }
  .clear-btn, .btn-reset { min-height: 48px; border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text); padding: var(--space-3) var(--space-5); font-size: var(--text-sm); border-radius: var(--radius-sm); cursor: pointer; }
  .clear-btn:hover, .btn-reset:hover { color: var(--color-accent); border-color: var(--color-accent); }
  .empty-state, .error-message { padding-block: var(--space-10); border-top: 1px solid var(--color-border); }
  .empty-state h2, .error-message h2 { font-size: var(--text-xl); font-weight: 400; }
  .empty-state p, .error-message p { margin-top: var(--space-3); color: var(--color-text-muted); }
  .btn-reset, .error-message .text-link { margin-top: var(--space-4); }
  .text-link { display: inline-flex; align-items: center; gap: var(--space-3); min-height: 44px; font-size: var(--text-sm); color: var(--color-accent); text-decoration: none; }
  .next-page { display: flex; justify-content: space-between; align-items: center; gap: var(--space-6); padding-block: var(--space-8); margin-top: var(--space-10); border-top: 1px solid var(--color-border); }
  .next-page p { color: var(--color-text-muted); }
  @media (max-width: 1000px) { h1 { font-size: clamp(3rem, 6.4vw, 5rem); } .project-feature { gap: var(--space-8); grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); } .feature-copy h2 { font-size: 2.55rem; } }
  @media (max-width: 740px) { .projects-header { padding-block: var(--space-10) var(--space-8); } h1 { font-size: clamp(2.75rem, 9.8vw, 4.4rem); line-height: 1.08; letter-spacing: -.038em; margin-top: var(--space-5); } .intro-description { font-size: var(--text-base); margin-top: var(--space-5); } .project-feature { display: block; padding-block: var(--space-6) var(--space-10); } .feature-copy h2 { font-size: 2.55rem; margin-top: var(--space-5); } .feature-copy .text-link { margin-top: var(--space-4); } .feature-image { margin-top: var(--space-6); } .feature-image figcaption { padding-inline: var(--space-3); font-size: .6875rem; gap: var(--space-3); } .project-directory { padding-top: var(--space-6); } .directory-heading h2 { font-size: 1.7rem; } .filters { grid-template-columns: minmax(0, 1fr) auto; gap: var(--space-4); } .search-box { grid-column: 1 / -1; } .clear-btn { padding-inline: var(--space-3); } .next-page { align-items: flex-start; flex-direction: column; gap: var(--space-2); margin-top: var(--space-8); padding-block: var(--space-6); } }
  @media (max-width: 350px) { h1 { font-size: 2.55rem; } .feature-copy h2 { font-size: 2.3rem; } .directory-heading { align-items: flex-start; flex-direction: column; gap: var(--space-2); } .filters { grid-template-columns: minmax(0, 1fr); } .search-box { grid-column: auto; } .clear-btn { justify-self: start; } }
</style>
