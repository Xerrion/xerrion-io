<script lang="ts">
  interface Props { onNavigate?: () => void }
  let { onNavigate }: Props = $props()
</script>

<a href="/" class="brand" aria-label="Xerrion home" onclick={onNavigate}>
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path class="x-mark" d="M4 4l16 16" />
    <path class="x-cut" d="M20 4L4 20" />
    <path class="x-mark" d="M20 4L4 20" />
  </svg>
  <span>Xerrion</span>
</a>

<style>
  .brand { display: inline-flex; align-items: center; gap: var(--space-3); min-height: 44px; font-size: 1.375rem; font-weight: 700; letter-spacing: -0.025em; }
  .x-mark { fill: none; stroke: var(--color-accent); stroke-width: 3.5; stroke-linecap: square; }
  .x-cut { fill: none; stroke: var(--color-background); stroke-width: 7; }
  @media (max-width: 740px) { .brand { font-size: 1.25rem; } }
</style>
