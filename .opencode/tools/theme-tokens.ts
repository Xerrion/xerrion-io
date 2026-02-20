import { tool } from "@opencode-ai/plugin"
import path from "path"
import fs from "fs"

export default tool({
	description:
		"Parse theme.css and list all available CSS custom properties grouped by category (colors, spacing, typography, radius, shadows, transitions, layout). Use this to find the correct token name when writing component styles.",
	args: {
		category: tool.schema
			.enum(["all", "colors", "spacing", "typography", "radius", "shadows", "transitions", "layout"])
			.optional()
			.default("all")
			.describe("Filter tokens by category. Defaults to all."),
	},
	async execute(args, context) {
		const themePath = path.join(context.directory, "src/lib/styles/theme.css")

		if (!fs.existsSync(themePath)) {
			return "Error: src/lib/styles/theme.css not found."
		}

		const css = fs.readFileSync(themePath, "utf-8")

		// Extract all custom properties from :root block
		const propRegex = /--([\w-]+)\s*:\s*([^;]+);/g
		const tokens: Record<string, { name: string; value: string }[]> = {
			colors: [],
			spacing: [],
			typography: [],
			radius: [],
			shadows: [],
			transitions: [],
			layout: [],
			fonts: [],
		}

		let match
		while ((match = propRegex.exec(css)) !== null) {
			const name = `--${match[1]}`
			const value = match[2].trim()

			// Categorize by prefix
			if (name.startsWith("--color-")) {
				tokens.colors.push({ name, value })
			} else if (name.startsWith("--space-")) {
				tokens.spacing.push({ name, value })
			} else if (name.startsWith("--text-")) {
				tokens.typography.push({ name, value })
			} else if (name.startsWith("--font-")) {
				tokens.fonts.push({ name, value })
			} else if (name.startsWith("--radius-")) {
				tokens.radius.push({ name, value })
			} else if (name.startsWith("--shadow-")) {
				tokens.shadows.push({ name, value })
			} else if (name.startsWith("--transition-")) {
				tokens.transitions.push({ name, value })
			} else {
				tokens.layout.push({ name, value })
			}
		}

		// Deduplicate (dark theme overrides same names)
		for (const key of Object.keys(tokens)) {
			const seen = new Set<string>()
			tokens[key] = tokens[key].filter((t) => {
				if (seen.has(t.name)) return false
				seen.add(t.name)
				return true
			})
		}

		// Merge fonts into typography
		tokens.typography = [...tokens.fonts, ...tokens.typography]
		delete tokens.fonts

		const filter = args.category
		const sections =
			filter === "all"
				? Object.entries(tokens)
				: Object.entries(tokens).filter(([key]) => key === filter)

		if (sections.length === 0) {
			return `No tokens found for category: ${filter}`
		}

		const output = sections
			.filter(([, items]) => items.length > 0)
			.map(([category, items]) => {
				const lines = items
					.map((t) => `  ${t.name}: ${t.value}`)
					.join("\n")
				return `## ${category} (${items.length})\n${lines}`
			})
			.join("\n\n")

		return output
	},
})
