<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Admin Dashboard | Xerrion</title>
</svelte:head>

<div class="dashboard">
	<header class="dashboard-header">
		<h1>Dashboard</h1>
		<p class="greeting">Welcome back, {data.user?.username}</p>
	</header>

	<div class="quick-actions">
		<a href="/admin/gallery/upload" class="action-card">
			<div class="action-icon upload">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
			</div>
			<h2>Upload Photos</h2>
			<p>Add new photos to the gallery</p>
		</a>

		<a href="/admin/gallery" class="action-card">
			<div class="action-icon gallery">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
			</div>
			<h2>Manage Gallery</h2>
			<p>View and manage uploaded photos</p>
		</a>

		<a href="/admin/gallery/categories" class="action-card">
			<div class="action-icon categories">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
			</div>
			<h2>Categories</h2>
			<p>Create and organize categories</p>
		</a>

		<a href="/" class="action-card" target="_blank" rel="noopener">
			<div class="action-icon site">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
			</div>
			<h2>View Site</h2>
			<p>Open the public website</p>
		</a>
	</div>
</div>

<style>
	.dashboard-header {
		margin-bottom: var(--space-8);
	}

	.dashboard-header h1 {
		font-size: var(--text-3xl);
		font-weight: 700;
		color: var(--color-text);
		margin: 0;
	}

	.greeting {
		color: var(--color-text-muted);
		margin-top: var(--space-2);
		font-size: var(--text-base);
	}

	.quick-actions {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: var(--space-5);
	}

	.action-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: var(--space-6);
		text-decoration: none;
		color: var(--color-text);
		transition: all var(--transition-base);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.action-card:hover {
		border-color: var(--color-border-hover);
		box-shadow: var(--shadow-md);
		transform: translateY(-2px);
	}

	.action-icon {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-lg);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.action-icon.upload {
		background: rgba(99, 102, 241, 0.1);
		color: var(--color-primary);
	}

	.action-icon.gallery {
		background: rgba(245, 158, 11, 0.1);
		color: var(--color-accent);
	}

	.action-icon.categories {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
	}

	.action-icon.site {
		background: rgba(99, 102, 241, 0.1);
		color: var(--color-primary-light);
	}

	.action-card h2 {
		font-size: var(--text-base);
		font-weight: 600;
		margin: 0;
	}

	.action-card p {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		margin: 0;
	}
</style>
