declare global {
	namespace App {
		interface Locals {
			user: { id: number; username: string } | null;
			sessionId: string | null;
		}
		interface Platform {
			env?: Record<string, string>;
			context?: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches?: CacheStorage;
		}
	}
}

export {};
