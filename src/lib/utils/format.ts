function pluralize(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'} ago`
}

export function formatDate(date: Date): string {
  const now = new Date()
  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffInDays < 0) return date.toLocaleDateString()
  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays < 7) return pluralize(diffInDays, 'day')
  const weeks = Math.floor(diffInDays / 7)
  if (diffInDays < 30) return pluralize(weeks, 'week')
  const months = Math.floor(diffInDays / 30)
  if (diffInDays < 365) return pluralize(months, 'month')
  const years = Math.floor(diffInDays / 365)
  return pluralize(years, 'year')
}
