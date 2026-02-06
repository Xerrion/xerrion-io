// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: {
				// Add Cloudflare bindings here if needed
				// MY_KV: KVNamespace;
				// MY_DURABLE_OBJECT: DurableObjectNamespace;
			};
			context?: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches?: CacheStorage;
		}
	}
}

export {};
