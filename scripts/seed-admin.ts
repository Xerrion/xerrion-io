import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { hash } from '@node-rs/argon2'

import { adminUser } from '../src/lib/server/schema'

const DEFAULT_PASSWORD = 'changeme12345'

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('Error: DATABASE_URL is not set')
    process.exit(1)
  }

  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    console.warn(
      `Warning: ADMIN_PASSWORD is not set - using default password "${DEFAULT_PASSWORD}". Change it immediately!`
    )
  }

  const username = 'admin'
  const finalPassword = password ?? DEFAULT_PASSWORD

  console.log('Hashing password...')
  const passwordHash = await hash(finalPassword)

  const sql = postgres(databaseUrl, { max: 1 })
  const db = drizzle(sql, { casing: 'snake_case' })

  console.log(`Seeding admin user "${username}"...`)
  await db
    .insert(adminUser)
    .values({ username, passwordHash })
    .onConflictDoNothing()

  console.log(`Admin user "${username}" seeded successfully.`)

  await sql.end()
  process.exit(0)
}

try {
  await main()
} catch (err) {
  console.error('Seed failed:', err)
  process.exit(1)
}
