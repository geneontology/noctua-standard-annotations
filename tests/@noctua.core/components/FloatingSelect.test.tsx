import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import FloatingSelect from '@/@noctua.core/components/textarea/FloatingSelect'
import { renderWithProviders } from '@tests/test-utils'

const data = [{ value: 'RO:0004032', label: 'acts upstream of or within, positive effect' }]

describe('FloatingSelect', () => {
  it('shows the chosen label in a block that can wrap, keeping the input value', () => {
    renderWithProviders(<FloatingSelect label="Relation" data={data} value="RO:0004032" />)
    expect(screen.getByRole('combobox', { name: 'Relation' })).toHaveValue(data[0].label)
    expect(screen.getByTitle(data[0].label)).toHaveTextContent(data[0].label)
  })

  it('shows no overlay when nothing is chosen', () => {
    renderWithProviders(<FloatingSelect label="Relation" data={data} value={null} />)
    expect(screen.queryByTitle(data[0].label)).not.toBeInTheDocument()
  })
})
