<script lang="ts">
  import { socialLinks } from '$lib/config/navigation'
</script>

<footer class="container footer">
  <p class="footer-name">Lasse Skovgaard Nielsen<span>Xerrion · Odense, Denmark</span></p>
  <nav class="footer-links" aria-label="Social links">
    <a href="mailto:lasse@xerrion.dk">Say hi <span aria-hidden="true">↗</span></a>
    {#each socialLinks.filter(link => link.icon !== 'email') as link}
      <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label="{link.name} profile, opens in a new tab">{link.name} <span aria-hidden="true">↗</span></a>
    {/each}
    <a href="#top">Back to top <span aria-hidden="true">↑</span></a>
  </nav>
</footer>

<style>
  .footer { border-top: 1px solid var(--color-border); padding-block: var(--space-10); margin-top: var(--space-6); display: flex; justify-content: space-between; align-items: center; gap: var(--space-8); }
  .footer-name { font-size: var(--text-sm); margin: 0; color: var(--color-text); }
  .footer-name span { display: block; color: var(--color-muted); font-size: var(--text-xs); margin-top: var(--space-1); }
  .footer-links { display: flex; flex-wrap: wrap; gap: var(--space-6); }
  .footer-links a { display: inline-flex; align-items: center; gap: var(--space-2); min-height: 44px; font-size: var(--text-sm); color: var(--color-muted); }
  .footer-links a:hover { color: var(--color-accent); }
  @media (max-width: 740px) { .footer { flex-direction: column; align-items: flex-start; gap: var(--space-4); margin-top: var(--space-2); padding-block: var(--space-8); } .footer-links { gap: var(--space-5); } }
</style>
