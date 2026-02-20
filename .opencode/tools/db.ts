import { tool } from "@opencode-ai/plugin"

export const query = tool({
	description:
		"Execute a SQL query against the Turso database. Use for SELECT queries to inspect data (gallery photos, categories, sessions, admin users). Returns results as JSON.",
	args: {
		sql: tool.schema.string().describe("SQL query to execute"),
	},
	async execute(args, context) {
		const env = process.env
		const url = env.TURSO_DATABASE_URL
		const authToken = env.TURSO_AUTH_TOKEN

		if (!url) {
			return "Error: TURSO_DATABASE_URL is not set. Add it to your .env file."
		}

		try {
			const body = JSON.stringify({
				statements: [{ q: args.sql }],
			})

			const response = await fetch(`${url}/v3/pipeline`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body,
			})

			if (!response.ok) {
				const text = await response.text()
				return `Error ${response.status}: ${text}`
			}

			const data = await response.json()
			const result = data.results?.[0]?.response?.result

			if (!result) {
				return JSON.stringify(data, null, 2)
			}

			const cols = result.cols?.map((c: { name: string }) => c.name) ?? []
			const rows =
				result.rows?.map((row: { value: unknown }[]) => {
					const obj: Record<string, unknown> = {}
					row.forEach((cell: { value: unknown }, i: number) => {
						obj[cols[i]] = cell.value
					})
					return obj
				}) ?? []

			return JSON.stringify(
				{
					columns: cols,
					rows,
					rowCount: rows.length,
					affectedRows: result.affected_row_count ?? 0,
				},
				null,
				2
			)
		} catch (error) {
			return `Error: ${error instanceof Error ? error.message : String(error)}`
		}
	},
})

export const schema = tool({
	description:
		"Show the current database schema — lists all tables, their columns, and types. Useful for understanding the data model before writing queries.",
	args: {},
	async execute(_args, context) {
		const env = process.env
		const url = env.TURSO_DATABASE_URL
		const authToken = env.TURSO_AUTH_TOKEN

		if (!url) {
			return "Error: TURSO_DATABASE_URL is not set. Add it to your .env file."
		}

		try {
			const body = JSON.stringify({
				statements: [
					{
						q: "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
					},
				],
			})

			const response = await fetch(`${url}/v3/pipeline`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body,
			})

			if (!response.ok) {
				const text = await response.text()
				return `Error ${response.status}: ${text}`
			}

			const data = await response.json()
			const result = data.results?.[0]?.response?.result
			const rows = result?.rows ?? []

			if (rows.length === 0) {
				return "No tables found in database."
			}

			const tables = rows.map((row: { value: string }[]) => ({
				name: row[0].value,
				createStatement: row[1].value,
			}))

			return tables
				.map(
					(t: { name: string; createStatement: string }) =>
						`## ${t.name}\n\`\`\`sql\n${t.createStatement}\n\`\`\``
				)
				.join("\n\n")
		} catch (error) {
			return `Error: ${error instanceof Error ? error.message : String(error)}`
		}
	},
})
