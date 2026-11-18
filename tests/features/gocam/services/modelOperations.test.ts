import { describe, it, expect } from 'vitest'
import {
  buildSaveModelCommentsOperations,
  buildSaveModelStateOperations,
  buildSaveModelTitleOperations,
} from '@/features/gocam/services/modelOperations'
import type { Operation } from '@/features/gocam/models/operations'

const MODEL = 'gomodel:1'

/** [operation, key, value] per op; `store` has no value. */
const summary = (ops: Operation[]) =>
  ops.map(op => {
    const value = (op.arguments.values as { key: string; value: string }[] | undefined)?.[0]
    return value ? [op.operation, value.key, value.value] : [op.operation]
  })

describe('model operations', () => {
  it('replaces every title, touching nothing else', () => {
    const ops = buildSaveModelTitleOperations(MODEL, ['old', 'older'], '  New title ')
    expect(summary(ops)).toEqual([
      ['remove-annotation', 'title', 'old'],
      ['remove-annotation', 'title', 'older'],
      ['add-annotation', 'title', 'New title'],
      ['store'],
    ])
    expect(ops.every(op => op.arguments['model-id'] === MODEL)).toBe(true)
  })

  it('replaces every state', () => {
    expect(summary(buildSaveModelStateOperations(MODEL, ['development'], 'production'))).toEqual([
      ['remove-annotation', 'state', 'development'],
      ['add-annotation', 'state', 'production'],
      ['store'],
    ])
  })

  it('writes a state to a model that has none', () => {
    expect(summary(buildSaveModelStateOperations(MODEL, [], 'review'))).toEqual([
      ['add-annotation', 'state', 'review'],
      ['store'],
    ])
  })

  it('replaces the comments, dropping blanks and duplicates', () => {
    const ops = buildSaveModelCommentsOperations(MODEL, ['a'], ['a', ' b ', '', 'b', '   '])
    expect(summary(ops)).toEqual([
      ['remove-annotation', 'comment', 'a'],
      ['add-annotation', 'comment', 'a'],
      ['add-annotation', 'comment', 'b'],
      ['store'],
    ])
  })

  it('removes every comment when all are deleted', () => {
    expect(summary(buildSaveModelCommentsOperations(MODEL, ['a', 'b'], []))).toEqual([
      ['remove-annotation', 'comment', 'a'],
      ['remove-annotation', 'comment', 'b'],
      ['store'],
    ])
  })
})
