<script lang="ts">
	import SocialLinks from './SocialLinks.svelte';
</script>

<footer class="footer">
	<div class="footer-content container">
		<div class="footer-main">
			<p class="footer-text">
				Built with Svelte by Lasse. Say hi sometime.
			</p>
			<SocialLinks size="sm" />
		</div>
		<p class="copyright">
			&copy; {new Date().getFullYear()} · Odense, Denmark
		</p>
	</div>
</footer>

<style>
	.footer {
		margin-top: auto;
		padding: var(--space-8) 0;
		border-top: 1px solid var(--color-border);
	}

	.footer-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.footer-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-4);
	}

	.footer-text {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		margin: 0;
	}

	.copyright {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		margin: 0;
	}

	@media (max-width: 600px) {
		.footer-main {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
