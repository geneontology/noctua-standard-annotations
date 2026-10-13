import { describe, it, expect } from 'vitest'
import { formatDate } from '@/@noctua.core/services/dateUtils'

describe('formatDate', () => {
  it('formats a Noctua date like moment "ll"', () => {
    expect(formatDate('2026-10-12')).toBe('Oct 12, 2026')
    expect(formatDate('2024-01-01')).toBe('Jan 1, 2024')
  })

  it('passes through what it cannot read', () => {
    expect(formatDate('yesterday')).toBe('yesterday')
    expect(formatDate(null)).toBe('')
  })
})
