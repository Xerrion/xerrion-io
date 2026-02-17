<script lang="ts">
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { websiteSchema, personSchema } from '$lib/seo';
</script>

<SEOHead
	title="Xerrion - Lasse's Corner of the Internet"
	description="Hey, I'm Lasse (Xerrion online). Software dev from Denmark. I write code, take photos of my dog, and occasionally remember to touch grass."
	jsonLd={[websiteSchema(), personSchema()]}
/>

<section class="hero">
	<div class="container">
		<div class="hero-content">
			<span class="wave">👋</span>
			<h1>Hey, I'm <span class="highlight">Lasse</span></h1>
			<p class="tagline">
				Software dev from Odense, Denmark. I go by <strong>Xerrion</strong> online.
			</p>
			<p class="intro">
				I build things with code, take way too many photos of my golden retriever Charlie, 
				and have strong opinions about TypeScript. Currently making internal tools at TV 2 Danmark.
			</p>
			<div class="hero-links">
				<SocialLinks />
			</div>
		</div>
	</div>
</section>

<section class="quick-nav section">
	<div class="container">
		<div class="nav-cards">
			<a href="/about" class="nav-card">
				<span class="card-emoji">🧑‍💻</span>
				<h2>About Me</h2>
				<p>The slightly longer version of who I am and what I do.</p>
			</a>
			<a href="/projects" class="nav-card">
				<span class="card-emoji">🛠️</span>
				<h2>Projects</h2>
				<p>Stuff I've built, mostly on GitHub. Some of it even works.</p>
			</a>
			<a href="/gallery" class="nav-card">
				<span class="card-emoji">📸</span>
				<h2>Gallery</h2>
				<p>Photos of Charlie, food, and random life moments.</p>
			</a>
		</div>
	</div>
</section>

<section class="currently section">
	<div class="container">
		<h2>What I'm up to</h2>
		<ul class="status-list">
			<li>
				<span class="status-icon">💼</span>
				<span>Building internal tools at <strong>TV 2 Danmark</strong></span>
			</li>
			<li>
				<span class="status-icon">🦀</span>
				<span>Learning more Rust (it's fun, I promise)</span>
			</li>
			<li>
				<span class="status-icon">🐕</span>
				<span>Walking Charlie and listening to podcasts</span>
			</li>
			<li>
				<span class="status-icon">🎮</span>
				<span>Gaming when there's time</span>
			</li>
		</ul>
	</div>
</section>

<style>
	.hero {
		padding: var(--space-16) 0 var(--space-12);
	}

	.hero-content {
		max-width: 600px;
	}

	.wave {
		display: inline-block;
		font-size: 2.5rem;
		animation: wave 2.5s ease-in-out infinite;
		transform-origin: 70% 70%;
	}

	@keyframes wave {
		0%, 100% { transform: rotate(0deg); }
		10% { transform: rotate(14deg); }
		20% { transform: rotate(-8deg); }
		30% { transform: rotate(14deg); }
		40% { transform: rotate(-4deg); }
		50% { transform: rotate(10deg); }
		60%, 100% { transform: rotate(0deg); }
	}

	h1 {
		font-size: var(--text-4xl);
		margin: var(--space-4) 0;
	}

	.highlight {
		color: var(--color-primary);
	}

	.tagline {
		font-size: var(--text-xl);
		color: var(--color-text-secondary);
		margin-bottom: var(--space-4);
	}

	.intro {
		font-size: var(--text-lg);
		line-height: 1.7;
		color: var(--color-text-secondary);
	}

	.hero-links {
		margin-top: var(--space-8);
	}

	/* Quick Nav Cards */
	.quick-nav {
		background-color: var(--color-bg-secondary);
	}

	.nav-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-6);
	}

	.nav-card {
		display: block;
		padding: var(--space-6);
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		text-decoration: none;
		color: inherit;
		transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
	}

	.nav-card:hover {
		transform: translateY(-4px);
		box-shadow: var(--shadow-lg);
		border-color: var(--color-primary);
	}

	.card-emoji {
		font-size: 2rem;
		display: block;
		margin-bottom: var(--space-3);
	}

	.nav-card h2 {
		font-size: var(--text-xl);
		margin-bottom: var(--space-2);
		color: var(--color-text);
	}

	.nav-card p {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		margin: 0;
	}

	/* Currently Section */
	.currently h2 {
		font-size: var(--text-2xl);
		margin-bottom: var(--space-6);
	}

	.status-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.status-list li {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		font-size: var(--text-lg);
		color: var(--color-text-secondary);
	}

	.status-icon {
		font-size: 1.25rem;
	}

	@media (max-width: 768px) {
		h1 {
			font-size: var(--text-3xl);
		}

		.tagline {
			font-size: var(--text-lg);
		}

		.intro {
			font-size: var(--text-base);
		}
	}
</style>
