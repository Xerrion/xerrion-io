<script module lang="ts">
  export type IconName =
    | 'arrow-right' | 'arrow-up-right' | 'arrow-up' | 'code' | 'terminal'
    | 'layers' | 'workflow' | 'globe' | 'map-pin' | 'paw' | 'headphones'
    | 'gamepad' | 'mail' | 'github' | 'linkedin' | 'camera' | 'grid'
    | 'search' | 'filter' | 'folder' | 'book-open' | 'calendar' | 'clock'
    | 'rss' | 'check' | 'copy' | 'hash' | 'chevron-down' | 'chevron-right'
    | 'x' | 'sparkles' | 'cpu' | 'external-link'

  const paths: Record<IconName, string[]> = {
    'arrow-right': ['M4 12h16m-6-6 6 6-6 6'],
    'arrow-up-right': ['M6 18 18 6M6 6h12v12'],
    'arrow-up': ['M12 20V4m-6 6 6-6 6 6'],
    code: ['m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16'],
    terminal: ['M4 4h16v16H4z', 'm7 8 4 4-4 4m7 0h3'],
    layers: ['m12 3 10 6-10 6L2 9zM2 13l10 6 10-6M2 17l10 6 10-6'],
    workflow: ['M3 3h6v6H3zM15 15h6v6h-6zM9 6h7a2 2 0 0 1 2 2v7M6 9v7a2 2 0 0 0 2 2h7'],
    globe: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M2 12h20M12 2c6 6 6 14 0 20-6-6-6-14 0-20'],
    'map-pin': ['M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z', 'M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
    paw: ['M8 15c2-4 6-4 8 0l2 3c1 3-3 4-6 2-3 2-7 1-6-2Z', 'M8 7a2 3 0 1 1-4 0 2 3 0 0 1 4 0M14 5a2 3 0 1 1-4 0 2 3 0 0 1 4 0M20 7a2 3 0 1 1-4 0 2 3 0 0 1 4 0'],
    headphones: ['M3 14v-2a9 9 0 0 1 18 0v2M3 12h3v8H3a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1ZM21 12h-3v8h3a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1Z'],
    gamepad: ['M7 6h10c3 0 4 4 5 11 .4 3-2 4-4 1l-2-2H8l-2 2c-2 3-4.4 2-4-1 1-7 2-11 5-11Z', 'M6 9v6m-3-3h6m7-2h.01M19 13h.01'],
    mail: ['M3 5h18v14H3zM3 6l9 7 9-7'],
    github: ['M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.45 11.45 0 0 1 6.009 0c2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.797 24 17.301 24 12c0-6.627-5.373-12-12-12Z'],
    linkedin: ['M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.064 2.064 0 1 1 0-4.128 2.064 2.064 0 0 1 0 4.128ZM7.119 20.452H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0Z'],
    camera: ['M9 4h6l2 3h4v13H3V7h4z', 'M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
    grid: ['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
    search: ['M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0m-2 5 6 6'],
    filter: ['M3 4h18l-7 8v7l-4 2v-9z'],
    folder: ['M3 5h6l2 3h10v12H3z'],
    'book-open': ['M12 5v16M12 5c-3-3-7-3-10-2v16c3-1 7-1 10 2 3-3 7-3 10-2V3c-3-1-7-1-10 2Z'],
    calendar: ['M3 5h18v16H3zM7 2v6m10-6v6M3 11h18'],
    clock: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v6l4 2'],
    rss: ['M4 10a10 10 0 0 1 10 10M4 3a17 17 0 0 1 17 17M5 19a1 1 0 1 1-2 0 1 1 0 0 1 2 0'],
    check: ['m4 12 5 5L20 6'],
    copy: ['M9 9h12v12H9zM5 15H3V3h12v2'],
    hash: ['M9 3 7 21M17 3l-2 18M3 8h18M2 16h18'],
    'chevron-down': ['m6 9 6 6 6-6'],
    'chevron-right': ['m9 6 6 6-6 6'],
    x: ['m6 6 12 12M18 6 6 18'],
    sparkles: ['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z', 'M20 2v4m-2-2h4'],
    cpu: ['M6 6h12v12H6zM9 9h6v6H9zM9 2v4m6-4v4m-6 12v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4'],
    'external-link': ['M14 3h7v7m0-7L11 13M10 3H3v18h18v-7']
  }
</script>

<script lang="ts">
  interface Props {
    name: IconName
    size?: 'sm' | 'md' | 'lg'
  }

  let { name, size = 'md' }: Props = $props()
  let isBrand = $derived(name === 'github' || name === 'linkedin')
</script>

<svg class="icon icon-{size}" class:brand={isBrand} data-icon={name} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  {#each paths[name] as path}
    <path d={path} />
  {/each}
</svg>

<style>
  .icon { display: block; width: var(--space-5); height: var(--space-5); flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
  .icon-sm { width: var(--space-4); height: var(--space-4); }
  .icon-lg { width: var(--space-6); height: var(--space-6); }
  .brand { fill: currentColor; stroke: none; }
</style>
