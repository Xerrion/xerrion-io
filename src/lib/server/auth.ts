import { hash, verify } from '@node-rs/argon2';
import { getDb } from './db';
import crypto from 'node:crypto';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function hashPassword(password: string): Promise<string> {
	return hash(password);
}

export async function verifyPassword(hashedPassword: string, password: string): Promise<boolean> {
	return verify(hashedPassword, password);
}

function generateSessionId(): string {
	return crypto.randomBytes(32).toString('hex');
}

export interface SessionUser {
	id: number;
	username: string;
}

/**
 * Create a new session for a user. Returns the session ID (used as cookie value).
 * This is the core auth primitive — callers set the cookie themselves.
 */
export async function createSession(userId: number): Promise<string> {
	const db = getDb();
	const sessionId = generateSessionId();
	const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();

	await db.execute({
		sql: 'INSERT INTO session (id, user_id, expires_at) VALUES (?, ?, ?)',
		args: [sessionId, userId, expiresAt]
	});

	return sessionId;
}

/**
 * Validate a session ID and return the associated user, or null if invalid/expired.
 * Automatically cleans up expired sessions.
 */
export async function validateSession(sessionId: string): Promise<SessionUser | null> {
	const db = getDb();

	const result = await db.execute({
		sql: `SELECT s.id as session_id, s.expires_at, u.id as user_id, u.username
			  FROM session s
			  JOIN admin_user u ON s.user_id = u.id
			  WHERE s.id = ?`,
		args: [sessionId]
	});

	if (result.rows.length === 0) return null;

	const row = result.rows[0];
	const expiresAt = new Date(row.expires_at as string);

	if (expiresAt < new Date()) {
		await db.execute({ sql: 'DELETE FROM session WHERE id = ?', args: [sessionId] });
		return null;
	}

	return {
		id: row.user_id as number,
		username: row.username as string
	};
}

export async function deleteSession(sessionId: string): Promise<void> {
	const db = getDb();
	await db.execute({ sql: 'DELETE FROM session WHERE id = ?', args: [sessionId] });
}

export async function deleteExpiredSessions(): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: "DELETE FROM session WHERE expires_at < datetime('now')",
		args: []
	});
}
