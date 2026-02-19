<script lang="ts">
	import { page } from '$app/stores';
	import { motion } from '@humanspeak/svelte-motion';
	import Toast from '$lib/components/Toast.svelte';
	import '$lib/styles/admin.css';

	interface Props {
		children: import('svelte').Snippet;
		data: { user: { id: number; username: string } | null };
	}

	let { children, data }: Props = $props();

	const isLoggedIn = $derived(!!data.user);
	const pathname = $derived($page.url.pathname);

	const isGalleryRoute = $derived(pathname.startsWith('/admin/gallery'));
	let galleryExpanded = $state(true);

	// Auto-expand gallery section when navigating to a gallery route
	$effect(() => {
		if (isGalleryRoute) {
			galleryExpanded = true;
		}
	});

	function isActive(href: string, exact = false): boolean {
		if (exact) return pathname === href;
		return pathname === href || pathname.startsWith(href + '/');
	}
</script>

{#if isLoggedIn}
	<Toast />
	<div class="admin-shell">
		<aside class="admin-sidebar">
			<div class="sidebar-header">
				<a href="/admin" class="logo">
					<span class="logo-icon">X</span>
					<span class="logo-text">Admin</span>
				</a>
			</div>

			<nav class="sidebar-nav">
				<motion.a
					href="/admin"
					class="nav-item {isActive('/admin', true) ? 'active' : ''}"
					whileHover={{ x: 4, transition: { duration: 0.12 } }}
					whileTap={{ scale: 0.97 }}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
					Dashboard
				</motion.a>
				<div class="nav-section" class:expanded={galleryExpanded}>
					<button
						class="nav-section-header"
						class:section-active={isGalleryRoute}
						onclick={() => (galleryExpanded = !galleryExpanded)}
						aria-expanded={galleryExpanded}
					>
						<span class="nav-section-label">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
							Gallery
						</span>
						<svg
							class="chevron"
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</button>

					{#if galleryExpanded}
						<div class="nav-section-items">
							<motion.a
								href="/admin/gallery"
								class="nav-item sub-item {isActive('/admin/gallery', true) ? 'active' : ''}"
								whileHover={{ x: 4, transition: { duration: 0.12 } }}
								whileTap={{ scale: 0.97 }}
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
								Photos
							</motion.a>
							<motion.a
								href="/admin/gallery/categories"
								class="nav-item sub-item {isActive('/admin/gallery/categories') ? 'active' : ''}"
								whileHover={{ x: 4, transition: { duration: 0.12 } }}
								whileTap={{ scale: 0.97 }}
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
								Categories
							</motion.a>
							<motion.a
								href="/admin/gallery/upload"
								class="nav-item sub-item {isActive('/admin/gallery/upload') ? 'active' : ''}"
								whileHover={{ x: 4, transition: { duration: 0.12 } }}
								whileTap={{ scale: 0.97 }}
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
								Upload
							</motion.a>
						</div>
					{/if}
				</div>
			</nav>

			<div class="sidebar-footer">
				<span class="user-badge">{data.user?.username}</span>
				<form method="POST" action="/admin/login?/logout">
					<button type="submit" class="logout-btn" aria-label="Logout">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2 2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
					</button>
				</form>
			</div>
		</aside>

		<main class="admin-main">
			{@render children()}
		</main>
	</div>
{:else}
	{@render children()}
{/if}

<style>
	.admin-shell {
		display: flex;
		min-height: 100vh;
	}

	.admin-sidebar {
		width: 240px;
		background: var(--color-bg-secondary);
		border-right: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		z-index: 100;
	}

	.sidebar-header {
		padding: var(--space-6) var(--space-5);
		border-bottom: 1px solid var(--color-border);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		text-decoration: none;
		color: var(--color-text);
		font-weight: 700;
		font-size: var(--text-lg);
	}

	.logo-icon {
		width: 32px;
		height: 32px;
		background: var(--color-primary);
		color: white;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		font-weight: 800;
	}

	.sidebar-nav {
		flex: 1;
		padding: var(--space-4) var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	:global(.nav-item) {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		text-decoration: none;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		font-weight: 500;
	}

	:global(.nav-item:hover) {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	:global(.nav-item.active) {
		background: var(--color-primary);
		color: white;
	}

	:global(.nav-item.active:hover) {
		background: var(--color-primary-hover);
		color: white;
	}

	.nav-section {
		display: flex;
		flex-direction: column;
	}

	.nav-section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		border: none;
		background: none;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		font-weight: 500;
		cursor: pointer;
		width: 100%;
		text-align: left;
		transition: all var(--transition-fast);
	}

	.nav-section-header:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.nav-section-header.section-active {
		color: var(--color-primary);
	}

	.nav-section-label {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.chevron {
		transition: transform var(--transition-fast);
		flex-shrink: 0;
	}

	.nav-section.expanded .chevron {
		transform: rotate(180deg);
	}

	.nav-section-items {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding-left: var(--space-4);
		margin-top: var(--space-1);
	}

	:global(.nav-item.sub-item) {
		font-size: var(--text-xs);
		padding: var(--space-2) var(--space-3);
	}

	.sidebar-footer {
		padding: var(--space-4) var(--space-5);
		border-top: 1px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.user-badge {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.logout-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: var(--space-2);
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		transition: color var(--transition-fast);
	}

	.logout-btn:hover {
		color: var(--color-text);
	}

	.admin-main {
		flex: 1;
		margin-left: 240px;
		padding: var(--space-8);
		background: var(--color-bg);
		min-height: 100vh;
	}
</style>
