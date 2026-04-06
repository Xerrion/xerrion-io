import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  // datasource.url is only required for migrate/introspect commands.
  // Using process.env directly (instead of Prisma's env() helper) avoids
  // a PrismaConfigEnvError during `prisma generate` in environments
  // where DATABASE_URL is not set (e.g. CI build steps).
  ...(process.env.DATABASE_URL && {
    datasource: {
      url: process.env.DATABASE_URL
    }
  })
})
