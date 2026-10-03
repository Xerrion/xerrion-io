<script lang="ts">
  import { onMount } from 'svelte'
  import { afterNavigate } from '$app/navigation'
  import { page } from '$app/state'

  import { navigation, socialLinks } from '$lib/config/navigation'
  import Brand from '$lib/components/Brand.svelte'

  let dialog: HTMLDialogElement
  let closeButton: HTMLButtonElement
  let mobileMenuOpen = $state(false)
  let closeAnimation: Animation | null = null

  function isActive(href: string): boolean {
    return href === '/' ? page.url.pathname === '/' : page.url.pathname === href || page.url.pathname.startsWith(`${href}/`)
  }

  function finishClose(): void {
    closeAnimation?.cancel()
    closeAnimation = null
    dialog?.close()
    mobileMenuOpen = false
    document.body.classList.remove('navigation-open')
  }

  function openMenu(): void {
    if (!window.matchMedia('(max-width: 740px)').matches || dialog.open) return
    dialog.showModal()
    closeButton.focus({ preventScroll: true })
    mobileMenuOpen = true
    document.body.classList.add('navigation-open')
  }

  function closeMenu(immediate = false): void {
    if (!dialog?.open) return
    if (immediate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishClose()
      return
    }
    if (closeAnimation) return
    closeAnimation = dialog.animate(
      [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-6px)' }],
      { duration: 140, easing: 'ease-in', fill: 'forwards' }
    )
    closeAnimation.onfinish = finishClose
  }

  function handleCancel(event: Event): void {
    event.preventDefault()
    closeMenu()
  }

  function handleClose(): void {
    // Ignore a queued native close event if the dialog has reopened.
    if (dialog.open) return
    mobileMenuOpen = false
    document.body.classList.remove('navigation-open')
  }

  afterNavigate(() => {
    if (dialog?.open) finishClose()
  })

  onMount(() => {
    const mobile = window.matchMedia('(max-width: 740px)')
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleResize = (): void => { if (!mobile.matches && dialog.open) finishClose() }
    const handleMotion = (): void => { if (motion.matches && closeAnimation) finishClose() }
    mobile.addEventListener('change', handleResize)
    motion.addEventListener('change', handleMotion)
    return () => {
      mobile.removeEventListener('change', handleResize)
      motion.removeEventListener('change', handleMotion)
      closeAnimation?.cancel()
      document.body.classList.remove('navigation-open')
    }
  })
</script>

<header class="container site-header">
  <Brand />
  <nav class="desktop-navigation" aria-label="Main navigation">
    {#each navigation as item}
      <a href={item.href} aria-current={isActive(item.href) ? 'page' : undefined}>{item.label}</a>
    {/each}
    <a class="say-hi" href="mailto:lasse@xerrion.dk">Say hi <span aria-hidden="true">↗</span></a>
  </nav>
  <button class="menu-trigger" onclick={openMenu} aria-label="Open navigation menu" aria-expanded={mobileMenuOpen} aria-controls="mobile-menu" aria-haspopup="dialog">
    Menu <span class="menu-symbol" aria-hidden="true"><span></span><span></span></span>
  </button>
</header>

<dialog bind:this={dialog} id="mobile-menu" class="menu-dialog" aria-label="Navigation menu" oncancel={handleCancel} onclose={handleClose}>
  <div class="menu-inner">
    <div class="menu-top">
      <Brand onNavigate={() => closeMenu(true)} />
      <button bind:this={closeButton} class="menu-close" onclick={() => closeMenu()} aria-label="Close navigation menu">
        Close <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </div>
    <p class="menu-overline">Explore</p>
    <nav class="mobile-navigation" aria-label="Mobile navigation">
      {#each navigation as item, index}
        <a href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} onclick={() => closeMenu(true)}>
          <span class="nav-index" aria-hidden="true">0{index + 1}</span><span class="nav-label">{item.label}</span><span class="nav-arrow" aria-hidden="true">↗</span>
        </a>
      {/each}
    </nav>
    <div class="menu-bottom">
      <a class="menu-contact" href="mailto:lasse@xerrion.dk">Say hi <span aria-hidden="true">↗</span></a>
      <div class="menu-socials">
        {#each socialLinks.filter(link => link.icon !== 'email') as link}
          <a href={link.url} target="_blank" rel="noopener noreferrer">{link.name}</a>
        {/each}
        <span class="menu-location">Odense, Denmark</span>
      </div>
    </div>
  </div>
</dialog>

<style>

.site-header { display: flex; justify-content: space-between; align-items: center; gap: var(--space-8); min-height: 98px; border-bottom: 1px solid var(--color-border); }
.desktop-navigation { display: flex; align-items: center; gap: var(--space-6); }
.desktop-navigation a { min-height: 44px; display: inline-flex; align-items: center; font-size: var(--text-sm); color: var(--color-muted); }
.desktop-navigation a:hover, .desktop-navigation a[aria-current="page"], .desktop-navigation .say-hi { color: var(--color-accent); }
.desktop-navigation .say-hi { margin-left: var(--space-3); }
.menu-trigger { display: none; align-items: center; justify-content: center; gap: 13px; height: 46px; padding: 0 17px; border: 1px solid var(--color-border); border-radius: 999px; color: var(--color-text); background: var(--color-menu-surface); cursor: pointer; font-size: var(--text-sm); }
.menu-symbol { display: flex; flex-direction: column; gap: 6px; width: 19px; }
.menu-symbol span { display: block; height: 1.5px; width: 19px; background: var(--color-accent); }
.menu-symbol span:last-child { width: 13px; align-self: flex-end; }
.menu-trigger:hover { border-color: var(--color-accent); }
.menu-dialog { position: fixed; inset: 0; width: 100%; max-width: none; height: 100dvh; max-height: none; margin: 0; padding: 0; border: 0; background: var(--color-background); color: var(--color-text); overflow: auto; overscroll-behavior: contain; }
.menu-dialog::backdrop { background: var(--color-backdrop); }
.menu-dialog[open] { animation: menu-arrive 180ms ease-out both; }
.menu-inner { min-height: 100%; width: min(calc(100% - 40px), 620px); margin-inline: auto; display: flex; flex-direction: column; padding-bottom: max(28px, env(safe-area-inset-bottom)); }
.menu-top { display: flex; align-items: center; justify-content: space-between; min-height: 82px; border-bottom: 1px solid var(--color-border); }
.menu-close { display: flex; align-items: center; justify-content: center; gap: 10px; background: var(--color-menu-surface); border: 1px solid var(--color-border); color: var(--color-text); border-radius: 999px; height: 46px; padding: 0 15px; font-size: var(--text-sm); cursor: pointer; }
.menu-close svg { width: 18px; height: 18px; stroke: var(--color-accent); stroke-width: 1.5; fill: none; }
.menu-overline { color: var(--color-muted); text-transform: uppercase; font-size: 11px; letter-spacing: .11em; margin: 35px 0 14px; }
.mobile-navigation { display: flex; flex-direction: column; }
.mobile-navigation a { display: grid; grid-template-columns: 30px minmax(0, 1fr) 24px; gap: 12px; align-items: center; padding: 12px 4px; min-height: 71px; border-bottom: 1px solid var(--color-border); }
.nav-index { font-size: 11px; color: var(--color-muted); font-variant-numeric: tabular-nums; align-self: center; }
.nav-label { font-size: clamp(2rem, 8.5vw, 2.8rem); line-height: 1.2; font-weight: 400; letter-spacing: -.035em; }
.nav-arrow { color: var(--color-muted); font-size: 23px; font-weight: 400; }
.mobile-navigation a[aria-current="page"] .nav-label, .mobile-navigation a[aria-current="page"] .nav-arrow { color: var(--color-accent); }
.mobile-navigation a[aria-current="page"] .nav-index { font-size: 0; }
.mobile-navigation a[aria-current="page"] .nav-index::before { content: ''; display: block; width: 7px; height: 7px; border-radius: 100%; background: var(--color-accent); }
.mobile-navigation a:hover { color: var(--color-accent); background: var(--color-menu-surface); }
.menu-bottom { margin-top: auto; padding-top: 30px; }
.menu-contact { display: flex; justify-content: space-between; align-items: center; min-height: 60px; padding: 16px 20px; border-radius: 12px; color: var(--color-background); background: var(--color-accent); font-size: 18px; letter-spacing: -.015em; }
.menu-contact:hover { color: var(--color-background); background: var(--color-accent-hover); }
.menu-socials { display: flex; align-items: center; gap: 24px; padding-top: 12px; }
.menu-socials a { display: inline-flex; align-items: center; min-height: 44px; color: var(--color-muted); font-size: 13px; }
.menu-socials a:hover { color: var(--color-accent); }
.menu-location { margin-left: auto; color: var(--color-muted); font-size: 11px; }

@keyframes menu-arrive { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 1000px) { .desktop-navigation { gap: var(--space-4); } .desktop-navigation .say-hi { margin-left: 0; } }
@media (max-width: 740px) { .site-header { min-height: 82px; } .desktop-navigation { display: none; } .menu-trigger { display: inline-flex; } }
@media (max-width: 350px) { .menu-inner { width: calc(100% - 32px); } .mobile-navigation a { min-height: 65px; padding-block: 9px; } .menu-socials { gap: 18px; } .menu-location { font-size: 10px; } }
@media (max-height: 650px) { .menu-overline { margin-top: 18px; } .mobile-navigation a { min-height: 57px; padding-block: 8px; } .nav-label { font-size: 30px; } .menu-bottom { padding-top: 22px; } }
@media (prefers-reduced-motion: reduce) { .menu-dialog[open] { animation: none; } }

.desktop-navigation a { gap: var(--space-2); position: relative; }
.desktop-navigation a::after { content: ''; position: absolute; bottom: var(--space-2); left: 0; right: 0; height: 1px; background: var(--color-accent); transform: scaleX(0); transform-origin: left; transition: transform 220ms var(--motion-easing); }
.desktop-navigation a:hover::after { transform: scaleX(1); }
.mobile-navigation a { transition: background-color var(--transition-fast), padding-inline var(--transition-base); }
.mobile-navigation a:hover { padding-inline: var(--space-2); }
.menu-close:hover { border-color: var(--color-accent); }
.menu-dialog[open] .mobile-navigation a { animation: nav-arrive 360ms var(--motion-easing) both; animation-delay: 40ms; }
.menu-dialog[open] .mobile-navigation a:nth-child(2) { animation-delay: 75ms; }
.menu-dialog[open] .mobile-navigation a:nth-child(3) { animation-delay: 110ms; }
.menu-dialog[open] .mobile-navigation a:nth-child(4) { animation-delay: 145ms; }
.menu-dialog[open] .mobile-navigation a:nth-child(5) { animation-delay: 180ms; }
@keyframes nav-arrive { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .menu-dialog[open] .mobile-navigation a { animation: none; } }

</style>
