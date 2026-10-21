<script lang="ts">
  interface Props {
    original: string
    converted: string
    width: number
    height: number
  }
  let { original, converted, width, height }: Props = $props()
  const id = $props.id()
  let position = $state(50)
</script>

<div class="comparison">
  <div class="image-stage">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Original image on the left, converted image on the right">
      <defs><clipPath id={id}><rect width={`${position}%`} height="100%" /></clipPath></defs>
      <image href={converted} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
      <image href={original} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" clip-path={`url(#${id})`} />
      <line x1={`${position}%`} x2={`${position}%`} y1="0" y2="100%" vector-effect="non-scaling-stroke" />
    </svg>
    <div class="image-labels"><span>Original</span><span>Converted</span></div>
  </div>
  <div class="comparison-control">
    <label for={`${id}-slider`}>Compare images</label>
    <input id={`${id}-slider`} type="range" min="0" max="100" bind:value={position} aria-valuetext={`${position}% original image`} />
    <span aria-hidden="true">Drag to compare</span>
  </div>
</div>

<style>
  .image-stage { position: relative; display: grid; place-items: center; min-height: 220px; background-color: var(--color-bg-tertiary); background-image: conic-gradient(var(--color-border) 25%, transparent 0 50%, var(--color-border) 0 75%, transparent 0); background-size: 20px 20px; overflow: hidden; }
  svg { display: block; width: 100%; height: 350px; }
  line { stroke: var(--color-accent); stroke-width: 2; }
  .image-labels { position: absolute; inset: var(--space-4) var(--space-4) auto; display: flex; justify-content: space-between; pointer-events: none; }
  .image-labels span { padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); background: var(--color-overlay-heavy); color: var(--color-on-overlay); font-size: var(--text-xs); }
  .comparison-control { display: grid; grid-template-columns: auto minmax(60px, 1fr) auto; gap: var(--space-4); align-items: center; padding: var(--space-4); font-size: var(--text-xs); color: var(--color-muted); }
  input { width: 100%; min-height: 32px; accent-color: var(--color-accent); cursor: ew-resize; }
  @media (max-width: 580px) { svg { height: 260px; } .comparison-control { grid-template-columns: auto 1fr; } .comparison-control span { display: none; } }
</style>
