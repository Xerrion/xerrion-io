<script lang="ts">
	import SocialLinks from '$lib/components/SocialLinks.svelte';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { personSchema, breadcrumbSchema } from '$lib/seo';
	import { fadeInUp, fadeIn, staggerReveal } from '$lib/utils/animate';
</script>

<SEOHead
	title="About"
	description="About Lasse Skovgaard Nielsen (Xerrion) - software developer from Odense, Denmark with 10+ years of experience in TypeScript, Rust, Python, and enterprise integrations."
	type="profile"
	jsonLd={[
		personSchema(),
		breadcrumbSchema([
			{ name: 'Home', url: '/' },
			{ name: 'About', url: '/about' }
		])
	]}
/>

<article class="about">
	<div class="container">
		<header class="about-header" use:fadeInUp={{ duration: 500 }}>
			<h1>About Me</h1>
			<p class="subtitle">The longer version</p>
		</header>

		<div class="about-content" use:staggerReveal={{ staggerDelay: 100, duration: 500, selector: '.about-section', rootMargin: '0px 0px -60px 0px' }}>
			<section class="about-section">
				<h2>👋 The basics</h2>
				<p>
					I'm <strong>Lasse Skovgaard Nielsen</strong>, but you'll find me as <strong>Xerrion</strong> 
					pretty much everywhere online. I'm a software developer based in <strong>Odense, Denmark</strong> 
					with 10+ years of experience building things with code.
				</p>
				<p>
					I'm not chasing the latest framework hype. I believe in <em>pragmatic solutions</em> — 
					picking the right tool for the job, even if it's not the shiniest one. Sometimes that's 
					Rust, sometimes it's a bash script, sometimes it's just a well-structured spreadsheet.
				</p>
			</section>

			<section class="about-section">
				<h2>💼 Work stuff</h2>
				<p>
					Currently I'm at <strong>TV 2 Danmark</strong> — Denmark's biggest TV station and streaming 
					service. I build internal tools that help people do their jobs better. It's the kind of 
					work where you don't get much glory, but you know you're making a difference when someone 
					says "that used to take me 2 hours, now it takes 5 minutes."
				</p>
				<p>
					Before TV 2, I worked in <strong>satellite communications</strong>. Yes, actual satellites 
					in space. It was as cool as it sounds, and it taught me a lot about building systems that 
					absolutely cannot fail.
				</p>
			</section>

			<section class="about-section">
				<h2>🛠️ Tech I like</h2>
				<div class="tech-grid">
					<div class="tech-item">
						<span class="tech-name">TypeScript</span>
						<span class="tech-note">Daily driver</span>
					</div>
					<div class="tech-item">
						<span class="tech-name">Rust</span>
						<span class="tech-note">For the fun stuff</span>
					</div>
					<div class="tech-item">
						<span class="tech-name">Python</span>
						<span class="tech-note">When I need it done fast</span>
					</div>
					<div class="tech-item">
						<span class="tech-name">Svelte</span>
						<span class="tech-note">This site runs on it</span>
					</div>
					<div class="tech-item">
						<span class="tech-name">ServiceNow</span>
						<span class="tech-note">Enterprise stuff</span>
					</div>
					<div class="tech-item">
						<span class="tech-name">APIs</span>
						<span class="tech-note">Connecting all the things</span>
					</div>
				</div>
			</section>

			<section class="about-section">
				<h2>🐕 Charlie</h2>
				<p>
					The real star of this website. Charlie is my <strong>Golden Retriever</strong> and 
					the best co-worker I've ever had. He's excellent at reminding me to take breaks 
					(read: demanding walks) and provides moral support during debugging sessions.
				</p>
				<p>
					Check out the <a href="/gallery">gallery</a> for way too many photos of him.
				</p>
			</section>

			<section class="about-section">
				<h2>🎮 Outside of work</h2>
				<p>
					When I'm not writing code, you'll find me:
				</p>
				<ul>
					<li><strong>Gaming</strong> — mostly to unwind and hang out with friends online</li>
					<li><strong>Walking Charlie</strong> — always with a podcast in my ears</li>
					<li><strong>Listening to podcasts</strong> — tech, true crime, random rabbit holes</li>
					<li><strong>Tinkering with side projects</strong> — some even get finished</li>
				</ul>
			</section>

			<section class="about-section contact">
				<h2>📬 Say hi</h2>
				<p>
					Want to chat? I'm always happy to talk about code, dogs, or whatever. 
					Best way to reach me is probably email.
				</p>
				<SocialLinks size="md" />
			</section>
		</div>
	</div>
</article>

<style>
	.about {
		padding: var(--space-16) 0;
	}

	.about-header {
		margin-bottom: var(--space-12);
	}

	.about-header h1 {
		font-size: var(--text-4xl);
		margin-bottom: var(--space-2);
	}

	.subtitle {
		font-size: var(--text-lg);
		color: var(--color-text-muted);
		margin: 0;
	}

	.about-content {
		max-width: 700px;
	}

	.about-section {
		margin-bottom: var(--space-12);
	}

	.about-section:last-child {
		margin-bottom: 0;
	}

	.about-section h2 {
		font-size: var(--text-xl);
		margin-bottom: var(--space-4);
	}

	.about-section p {
		font-size: var(--text-lg);
		line-height: 1.8;
	}

	.about-section ul {
		list-style: none;
		padding: 0;
	}

	.about-section li {
		font-size: var(--text-lg);
		line-height: 1.8;
		color: var(--color-text-secondary);
		padding-left: var(--space-6);
		position: relative;
	}

	.about-section li::before {
		content: '→';
		position: absolute;
		left: 0;
		color: var(--color-text-muted);
	}

	.about-section a {
		color: var(--color-primary);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
		text-underline-offset: 2px;
	}

	.about-section a:hover {
		text-decoration-color: var(--color-primary);
	}

	/* Tech Grid */
	.tech-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: var(--space-3);
		margin-top: var(--space-4);
	}

	.tech-item {
		display: flex;
		flex-direction: column;
		padding: var(--space-4);
		background-color: var(--color-bg-secondary);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
	}

	.tech-name {
		font-weight: 600;
		color: var(--color-text);
	}

	.tech-note {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}

	/* Contact Section */
	.contact {
		padding-top: var(--space-8);
		border-top: 1px solid var(--color-border);
	}

	@media (max-width: 768px) {
		.about-header h1 {
			font-size: var(--text-3xl);
		}

		.about-section p,
		.about-section li {
			font-size: var(--text-base);
		}

		.tech-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
