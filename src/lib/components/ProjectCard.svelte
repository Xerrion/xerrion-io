<script lang="ts">
  import type { ProjectRepo } from '$lib/types/github'
  import { reveal } from '$lib/utils/animate'

  interface Props { repo: ProjectRepo }
  let { repo }: Props = $props()
</script>

<article class="project-card" use:reveal={{ duration: 400 }}>
  <div class="project-copy">
    <div class="card-header"><h3 class="card-title">{repo.name}</h3>{#if repo.isPinned}<span class="pinned-badge">Pinned</span>{/if}{#if repo.isArchived}<span class="archived-badge">Archived</span>{/if}</div>
    <p class="card-description">{repo.description ?? (repo.name === 'particle-foundry' ? 'A browser sandbox where particles fall, liquids flow, and heat changes materials.' : 'Project source and details on GitHub.')}</p>
  </div>
  <span class="language">{repo.language ?? 'Other'}</span>
  <a class="card-link" href={repo.url} target="_blank" rel="noopener noreferrer" aria-label="{repo.name} source on GitHub, opens in a new tab">View source <span aria-hidden="true">↗</span></a>
</article>

<style>
  .project-card { display: grid; grid-template-columns: minmax(0, 1fr) 100px 115px; gap: var(--space-8); align-items: start; padding-block: var(--space-8); border-top: 1px solid var(--color-border); }
  .card-header { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-3); }
  .card-title { margin: 0; font-size: 1.5rem; font-weight: 400; letter-spacing: -.02em; line-height: 1.3; overflow-wrap: anywhere; }
  .pinned-badge, .archived-badge { color: var(--color-text-muted); font-size: var(--text-xs); }
  .pinned-badge { color: var(--color-accent); }
  .card-description { max-width: 61ch; color: var(--color-text-muted); margin-top: var(--space-3); line-height: 1.6; }
  .language { color: var(--color-text-muted); font-size: var(--text-sm); padding-top: var(--space-1); }
  .card-link { display: inline-flex; align-items: center; gap: var(--space-3); min-height: 44px; color: var(--color-accent); font-size: var(--text-sm); margin-top: calc(-1 * var(--space-2)); text-decoration: none; }
  .card-link:hover { text-decoration: underline; text-underline-offset: .2em; }
  .card-link:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 4px; }
  @media (max-width: 1000px) { .project-card { gap: var(--space-6); grid-template-columns: minmax(0, 1fr) 80px 110px; } }
  @media (max-width: 740px) { .project-card { grid-template-columns: minmax(0, 1fr) auto; gap: var(--space-3) var(--space-5); padding-block: var(--space-6); } .project-copy { grid-column: 1 / -1; } .card-title { font-size: 1.35rem; } .language { padding-top: var(--space-2); } .card-link { margin-top: 0; } }
</style>
