/**
 * Format a Noctua `YYYY-MM-DD` date the way the Angular app did (moment `ll`):
 * "Oct 12, 2026". The date is read as a local calendar day, so it never shifts
 * a day in timezones west of UTC. Unparseable input comes back unchanged.
 */
export const formatDate = (value: string | null | undefined): string => {
  if (!value) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return value
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
