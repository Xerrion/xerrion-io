<script lang="ts">
	import { motion } from '@humanspeak/svelte-motion';

	let { data } = $props();
</script>

<svelte:head>
	<title>Admin Dashboard | Xerrion</title>
</svelte:head>

<div class="dashboard">
	<motion.header
		class="dashboard-header"
		initial={{ opacity: 0, y: -10 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.4 }}
	>
		<h1>Dashboard</h1>
		<p class="greeting">Welcome back, {data.user?.username}</p>
	</motion.header>

	<motion.section
		class="action-group"
		initial={{ opacity: 0, y: 10 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.35, delay: 0.05 }}
	>
		<h2 class="action-group-title">
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
			Gallery
		</h2>
		<div class="quick-actions">
			<motion.a
				href="/admin/gallery"
				class="action-card"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, delay: 0.1 }}
				whileHover={{ y: -4, transition: { duration: 0.15 } }}
				whileTap={{ scale: 0.98 }}
			>
				<div class="action-icon gallery">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
				</div>
				<h3>Photos</h3>
				<p>View and manage uploaded photos</p>
			</motion.a>

			<motion.a
				href="/admin/gallery/upload"
				class="action-card"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, delay: 0.2 }}
				whileHover={{ y: -4, transition: { duration: 0.15 } }}
				whileTap={{ scale: 0.98 }}
			>
				<div class="action-icon upload">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
				</div>
				<h3>Upload</h3>
				<p>Add new photos to the gallery</p>
			</motion.a>

			<motion.a
				href="/admin/gallery/categories"
				class="action-card"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, delay: 0.3 }}
				whileHover={{ y: -4, transition: { duration: 0.15 } }}
				whileTap={{ scale: 0.98 }}
			>
				<div class="action-icon categories">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
				</div>
				<h3>Categories</h3>
				<p>Create and organize categories</p>
			</motion.a>
		</div>
	</motion.section>

	<motion.section
		class="action-group"
		initial={{ opacity: 0, y: 10 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.35, delay: 0.35 }}
	>
		<h2 class="action-group-title">
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
			Quick Links
		</h2>
		<div class="quick-actions">
			<motion.a
				href="/"
				class="action-card"
				target="_blank"
				rel="noopener"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, delay: 0.4 }}
				whileHover={{ y: -4, transition: { duration: 0.15 } }}
				whileTap={{ scale: 0.98 }}
			>
				<div class="action-icon site">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
				</div>
				<h3>View Site</h3>
				<p>Open the public website</p>
			</motion.a>
		</div>
	</motion.section>
</div>

<style>
	:global(.dashboard-header) {
		margin-bottom: var(--space-8);
	}

	:global(.dashboard-header) h1 {
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

	:global(.action-group) {
		margin-bottom: var(--space-8);
	}

	.action-group-title {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 var(--space-4) 0;
	}

	:global(.action-card) {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: var(--space-6);
		text-decoration: none;
		color: var(--color-text);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	:global(.action-card:hover) {
		border-color: var(--color-border-hover);
		box-shadow: var(--shadow-md);
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

	:global(.action-card) h3 {
		font-size: var(--text-base);
		font-weight: 600;
		margin: 0;
	}

	:global(.action-card) p {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		margin: 0;
	}
</style>
