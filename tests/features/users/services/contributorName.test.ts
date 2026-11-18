import { describe, it, expect } from 'vitest'
import { contributorName } from '@/features/users/services/contributorName'

describe('contributorName', () => {
  it('prefers the Barista name', () => {
    expect(contributorName({ uri: 'https://orcid.org/0000-0001', name: 'Ada' })).toBe('Ada')
  })

  it('falls back to the bare ORCID id', () => {
    expect(contributorName({ uri: 'https://orcid.org/0000-0001' })).toBe('0000-0001')
    expect(contributorName({ uri: 'http://orcid.org/0000-0002', name: '' })).toBe('0000-0002')
  })

  it('keeps a non-ORCID uri whole', () => {
    expect(contributorName({ uri: 'http://example.org/curator' })).toBe(
      'http://example.org/curator'
    )
  })
})
