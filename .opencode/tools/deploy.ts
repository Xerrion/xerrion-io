import { tool } from "@opencode-ai/plugin"

export const status = tool({
	description:
		"Get the current Vercel deployment status for this project. Shows the latest deployments with their state (ready, building, error), URL, and branch.",
	args: {},
	async execute(_args, context) {
		try {
			const result =
				await Bun.$`vercel list --json --limit 5`.cwd(context.directory).text()
			const data = JSON.parse(result)

			if (!data.deployments || data.deployments.length === 0) {
				return "No deployments found. Run `vercel link` to connect this project."
			}

			const lines = data.deployments.map(
				(d: {
					url: string
					state: string
					createdAt: number
					meta?: { githubCommitRef?: string }
				}) => {
					const date = new Date(d.createdAt).toLocaleString()
					const branch = d.meta?.githubCommitRef ?? "—"
					return `${d.state.toUpperCase().padEnd(10)} ${branch.padEnd(30)} ${d.url}  (${date})`
				}
			)

			return `Latest deployments:\n\n${lines.join("\n")}`
		} catch (error) {
			return `Error: ${error instanceof Error ? error.message : String(error)}\n\nMake sure you've run \`vercel login\` and \`vercel link\`.`
		}
	},
})

export const deploy = tool({
	description:
		"Trigger a Vercel deployment. By default deploys a preview. Set production to true to deploy to production.",
	args: {
		production: tool.schema
			.boolean()
			.optional()
			.default(false)
			.describe("Deploy to production instead of preview"),
	},
	async execute(args, context) {
		try {
			const cmd = args.production
				? Bun.$`vercel --prod --yes`.cwd(context.directory)
				: Bun.$`vercel --yes`.cwd(context.directory)

			const result = await cmd.text()
			return result.trim()
		} catch (error) {
			return `Error: ${error instanceof Error ? error.message : String(error)}\n\nMake sure you've run \`vercel login\` and \`vercel link\`.`
		}
	},
})

export const env_list = tool({
	description:
		"List all environment variables configured in the Vercel project. Shows variable names grouped by environment (production, preview, development).",
	args: {},
	async execute(_args, context) {
		try {
			const result =
				await Bun.$`vercel env ls`.cwd(context.directory).text()
			return result.trim() || "No environment variables found."
		} catch (error) {
			return `Error: ${error instanceof Error ? error.message : String(error)}\n\nMake sure you've run \`vercel login\` and \`vercel link\`.`
		}
	},
})
