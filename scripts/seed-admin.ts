import { PrismaClient } from '@prisma/client'
import { hash } from '@node-rs/argon2'

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

  const username = 'xerrion'
  const finalPassword = password ?? DEFAULT_PASSWORD

  console.log('Hashing password...')
  const passwordHash = await hash(finalPassword)

  const prisma = new PrismaClient()

  console.log(`Seeding admin user "${username}"...`)
  await prisma.adminUser.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash }
  })

  console.log(`Admin user "${username}" seeded successfully.`)
  await prisma.$disconnect()
  process.exit(0)
}

try {
  await main()
} catch (err) {
  console.error('Seed failed:', err)
  process.exit(1)
}
