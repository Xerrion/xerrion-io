import { createClient } from '@libsql/client';
import { hash } from '@node-rs/argon2';

const SCHEMA = `
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

async function main() {
	const url = process.env.TURSO_DATABASE_URL;
	const authToken = process.env.TURSO_AUTH_TOKEN;

	if (!url) {
		console.error('Error: TURSO_DATABASE_URL is not set');
		process.exit(1);
	}

	const username = process.argv[2];
	const password = process.argv[3];

	if (!username || !password) {
		console.error('Usage: bun run scripts/seed-admin.ts <username> <password>');
		process.exit(1);
	}

	if (password.length < 12) {
		console.error('Error: Password must be at least 12 characters');
		process.exit(1);
	}

	const client = createClient({ url, authToken });

	console.log('Running migrations...');
	const statements = SCHEMA.split(';')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	for (const statement of statements) {
		await client.execute(statement);
	}
	console.log('Migrations complete.');

	const existing = await client.execute({
		sql: 'SELECT id FROM admin_user WHERE username = ?',
		args: [username]
	});

	if (existing.rows.length > 0) {
		console.error(`Error: User "${username}" already exists`);
		process.exit(1);
	}

	console.log('Hashing password...');
	const passwordHash = await hash(password);

	await client.execute({
		sql: 'INSERT INTO admin_user (username, password_hash) VALUES (?, ?)',
		args: [username, passwordHash]
	});

	console.log(`Admin user "${username}" created successfully.`);
}

main().catch((err) => {
	console.error('Seed failed:', err);
	process.exit(1);
});
