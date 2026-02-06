<script lang="ts">
	interface Props {
		count?: number;
	}

	let { count = 6 }: Props = $props();
</script>

<div class="skeleton-grid">
	{#each Array(count) as _, i}
		<div class="skeleton-card">
			<div class="skeleton-header">
				<div class="skeleton-title"></div>
			</div>
			<div class="skeleton-description"></div>
			<div class="skeleton-description short"></div>
			<div class="skeleton-footer">
				<div class="skeleton-meta"></div>
				<div class="skeleton-meta short"></div>
			</div>
		</div>
	{/each}
</div>

<style>
	.skeleton-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--space-6);
	}

	.skeleton-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-6);
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
	}

	.skeleton-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.skeleton-title {
		width: 60%;
		height: 24px;
		background: linear-gradient(
			90deg,
			var(--color-bg-tertiary) 25%,
			var(--color-bg-secondary) 50%,
			var(--color-bg-tertiary) 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
		border-radius: var(--radius-md);
	}

	.skeleton-description {
		width: 100%;
		height: 16px;
		background: linear-gradient(
			90deg,
			var(--color-bg-tertiary) 25%,
			var(--color-bg-secondary) 50%,
			var(--color-bg-tertiary) 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
		border-radius: var(--radius-sm);
	}

	.skeleton-description.short {
		width: 75%;
	}

	.skeleton-footer {
		display: flex;
		gap: var(--space-4);
		margin-top: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-border);
	}

	.skeleton-meta {
		width: 80px;
		height: 14px;
		background: linear-gradient(
			90deg,
			var(--color-bg-tertiary) 25%,
			var(--color-bg-secondary) 50%,
			var(--color-bg-tertiary) 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
		border-radius: var(--radius-sm);
	}

	.skeleton-meta.short {
		width: 50px;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	@media (max-width: 768px) {
		.skeleton-grid {
			grid-template-columns: 1fr;
		}

		.skeleton-card {
			padding: var(--space-4);
		}
	}
</style>
