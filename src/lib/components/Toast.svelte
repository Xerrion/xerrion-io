<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';
	import { slideInRight, animateOut } from '$lib/utils/animate';

	function animateToastIn(el: HTMLElement) {
		slideInRight(el, { duration: 250 });
	}

	async function dismissWithAnimation(el: HTMLElement, id: number) {
		await animateOut(el, [
			{ opacity: 1, transform: 'translateX(0)' },
			{ opacity: 0, transform: 'translateX(30px)' }
		], { duration: 200, easing: 'ease-in' });
		toastStore.dismiss(id);
	}
</script>

{#if toastStore.items.length > 0}
	<div class="toast-container" aria-live="polite">
		{#each toastStore.items as toast (toast.id)}
			<div class="toast toast-{toast.type}" role="alert" use:animateToastIn>
				<span class="toast-icon">
					{#if toast.type === 'success'}
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
					{:else if toast.type === 'error'}
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
					{/if}
				</span>
				<span class="toast-message">{toast.message}</span>
				<button class="toast-dismiss" onclick={(e) => { const toastEl = (e.currentTarget as HTMLElement).closest('.toast') as HTMLElement; dismissWithAnimation(toastEl, toast.id); }} aria-label="Dismiss">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
				</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		top: var(--space-6);
		right: var(--space-6);
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		max-width: 420px;
		pointer-events: none;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-lg);
		font-size: var(--text-sm);
		font-family: var(--font-sans);
		box-shadow: var(--shadow-lg);
		pointer-events: auto;
		border: 1px solid transparent;
	}

	.toast-success {
		background: #0d542b;
		color: #bbf7d0;
		border-color: #166534;
	}

	.toast-error {
		background: #7f1d1d;
		color: #fecaca;
		border-color: #991b1b;
	}

	.toast-info {
		background: #1e3a5f;
		color: #bfdbfe;
		border-color: #1e40af;
	}

	:root:not([data-theme="dark"]) .toast-success {
		background: #dcfce7;
		color: #14532d;
		border-color: #bbf7d0;
	}

	:root:not([data-theme="dark"]) .toast-error {
		background: #fee2e2;
		color: #7f1d1d;
		border-color: #fecaca;
	}

	:root:not([data-theme="dark"]) .toast-info {
		background: #dbeafe;
		color: #1e3a5f;
		border-color: #bfdbfe;
	}

	.toast-icon {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.toast-message {
		flex: 1;
		line-height: 1.4;
	}

	.toast-dismiss {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: inherit;
		opacity: 0.5;
		cursor: pointer;
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		flex-shrink: 0;
		transition: opacity var(--transition-fast);
	}

	.toast-dismiss:hover {
		opacity: 1;
	}
</style>
