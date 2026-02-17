<script lang="ts">
	import { page } from '$app/stores';
	import { navigation } from '$lib/types/navigation';
	import ThemeToggle from './ThemeToggle.svelte';

	let mobileMenuOpen = $state(false);

	function toggleMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMenu() {
		mobileMenuOpen = false;
	}
</script>

<header class="header">
	<nav class="nav container">
		<a href="/" class="logo" onclick={closeMenu}>
			<span class="logo-text">Xerrion</span>
		</a>

		<button
			class="mobile-toggle"
			onclick={toggleMenu}
			aria-label="Toggle navigation menu"
			aria-expanded={mobileMenuOpen}
		>
			<span class="hamburger" class:open={mobileMenuOpen}></span>
		</button>

		<div class="nav-content" class:open={mobileMenuOpen}>
			<ul class="nav-links">
				{#each navigation as item}
					<li>
						<a
							href={item.href}
							class="nav-link"
							class:active={$page.url.pathname === item.href}
							onclick={closeMenu}
						>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>

			<ThemeToggle />
		</div>
	</nav>
</header>

<style>
	.header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: var(--header-height);
		background-color: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
		z-index: 100;
		transition: background-color var(--transition-base), border-color var(--transition-base);
	}

	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 100%;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: 700;
		font-size: var(--text-xl);
		color: var(--color-text);
		text-decoration: none;
	}

	.logo:hover {
		color: var(--color-primary);
	}

	.logo-text {
		background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.nav-content {
		display: flex;
		align-items: center;
		gap: var(--space-8);
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: var(--space-6);
		list-style: none;
	}

	.nav-link {
		color: var(--color-text-secondary);
		font-weight: 500;
		font-size: var(--text-sm);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		transition: color var(--transition-fast), background-color var(--transition-fast);
	}

	.nav-link:hover {
		color: var(--color-text);
		background-color: var(--color-bg-tertiary);
	}

	.nav-link.active {
		color: var(--color-primary-hover);
	}

	.mobile-toggle {
		display: none;
		padding: var(--space-2);
		background: none;
		border: none;
		cursor: pointer;
	}

	.hamburger {
		display: block;
		width: 24px;
		height: 2px;
		background-color: var(--color-text);
		position: relative;
		transition: background-color var(--transition-fast);
	}

	.hamburger::before,
	.hamburger::after {
		content: '';
		position: absolute;
		left: 0;
		width: 100%;
		height: 2px;
		background-color: var(--color-text);
		transition: transform var(--transition-fast);
	}

	.hamburger::before {
		top: -7px;
	}

	.hamburger::after {
		bottom: -7px;
	}

	.hamburger.open {
		background-color: transparent;
	}

	.hamburger.open::before {
		transform: translateY(7px) rotate(45deg);
	}

	.hamburger.open::after {
		transform: translateY(-7px) rotate(-45deg);
	}

	@media (max-width: 768px) {
		.mobile-toggle {
			display: block;
		}

		.nav-content {
			position: fixed;
			top: var(--header-height);
			left: 0;
			right: 0;
			bottom: 0;
			flex-direction: column;
			justify-content: flex-start;
			padding: var(--space-8);
			background-color: var(--color-bg);
			transform: translateX(100%);
			transition: transform var(--transition-base);
		}

		.nav-content.open {
			transform: translateX(0);
		}

		.nav-links {
			flex-direction: column;
			width: 100%;
			gap: var(--space-2);
		}

		.nav-link {
			display: block;
			width: 100%;
			padding: var(--space-4);
			font-size: var(--text-lg);
			text-align: center;
		}
	}
</style>
