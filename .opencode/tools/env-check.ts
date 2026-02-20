import { tool } from "@opencode-ai/plugin"
import path from "path"
import fs from "fs"

export default tool({
	description:
		"Check that all required environment variables are set for this project. Reports which are missing, which are set, and which are optional. Run this to diagnose startup or runtime failures.",
	args: {},
	async execute(_args, context) {
		const required: Record<string, string> = {
			TURSO_DATABASE_URL: "Turso database connection URL",
			TURSO_AUTH_TOKEN: "Turso authentication token",
			BLOB_READ_WRITE_TOKEN: "Vercel Blob storage read/write token",
			GITHUB_TOKEN: "GitHub API token for projects page",
		}

		const optional: Record<string, string> = {
			PUBLIC_UMAMI_WEBSITE_ID: "Umami Cloud website ID for analytics",
			PUBLIC_GA_MEASUREMENT_ID: "Google Analytics 4 measurement ID",
		}

		const env = process.env
		const results: string[] = []

		// Check for .env file
		const envPath = path.join(context.directory, ".env")
		const hasEnvFile = fs.existsSync(envPath)
		results.push(hasEnvFile ? ".env file: found" : ".env file: NOT FOUND")
		results.push("")

		// Required vars
		results.push("## Required")
		let missingCount = 0
		for (const [key, desc] of Object.entries(required)) {
			const value = env[key]
			if (value) {
				results.push(`  [set] ${key} — ${desc}`)
			} else {
				results.push(`  [MISSING] ${key} — ${desc}`)
				missingCount++
			}
		}

		results.push("")

		// Optional vars
		results.push("## Optional")
		for (const [key, desc] of Object.entries(optional)) {
			const value = env[key]
			if (value) {
				results.push(`  [set] ${key} — ${desc}`)
			} else {
				results.push(`  [not set] ${key} — ${desc}`)
			}
		}

		results.push("")
		if (missingCount > 0) {
			results.push(
				`${missingCount} required variable(s) missing. Add them to your .env file.`
			)
		} else {
			results.push("All required environment variables are set.")
		}

		return results.join("\n")
	},
})
