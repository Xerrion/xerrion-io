import type { PageServerLoad } from './$types'
import { getPrisma } from '$lib/server/db'

export const load: PageServerLoad = async () => {
  const prisma = getPrisma()
  const rows = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true, slug: true, name: true }
  })
  return { categories: rows }
}
