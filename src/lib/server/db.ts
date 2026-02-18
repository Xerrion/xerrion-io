import { createClient, type Client } from '@libsql/client';
import { env } from '$env/dynamic/private';

let client: Client | null = null;

/**
 * Get a Turso database client instance (singleton).
 * Lazily initialized on first call.
 */
export function getDb(): Client {
	if (client) return client;

	const url = env.TURSO_DATABASE_URL;
	const authToken = env.TURSO_AUTH_TOKEN;

	if (!url) {
		throw new Error('TURSO_DATABASE_URL is not set');
	}

	client = createClient({
		url,
		authToken
	});

	return client;
}

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS admin_user (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS session (
	id TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES admin_user(id) ON DELETE CASCADE,
	expires_at TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS category (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	slug TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	description TEXT,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photo (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
	original_name TEXT NOT NULL,
	blob_path TEXT NOT NULL,
	thumb_url TEXT NOT NULL,
	medium_url TEXT NOT NULL,
	full_url TEXT NOT NULL,
	width INTEGER,
	height INTEGER,
	file_size INTEGER,
	uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/**
 * Run the database schema migrations.
 * Safe to call multiple times (uses IF NOT EXISTS).
 */
export async function migrate(): Promise<void> {
	const db = getDb();
	const statements = SCHEMA.split(';')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	for (const statement of statements) {
		await db.execute(statement);
	}
}
