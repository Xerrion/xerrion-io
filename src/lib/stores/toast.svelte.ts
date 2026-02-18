export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
	id: number;
	type: ToastType;
	message: string;
}

let nextId = 0;
let toasts = $state<Toast[]>([]);

export const toastStore = {
	get items() {
		return toasts;
	},

	add(type: ToastType, message: string, duration = 4000) {
		const id = nextId++;
		toasts.push({ id, type, message });

		if (duration > 0) {
			setTimeout(() => {
				toastStore.dismiss(id);
			}, duration);
		}

		return id;
	},

	success(message: string, duration?: number) {
		return toastStore.add('success', message, duration);
	},

	error(message: string, duration?: number) {
		return toastStore.add('error', message, duration ?? 6000);
	},

	info(message: string, duration?: number) {
		return toastStore.add('info', message, duration);
	},

	dismiss(id: number) {
		toasts = toasts.filter((t) => t.id !== id);
	}
};
