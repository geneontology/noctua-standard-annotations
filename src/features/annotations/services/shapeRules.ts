import shapesJson from '@/@noctua.core/data/shapes.json'
import gpToTermJson from '@/@noctua.core/data/gp-to-term.json'
import shapeTermsJson from '@/@noctua.core/data/shape-terms.json'
import { globalKnownRelations } from '@/@noctua.core/data/relations'
import type { Entity } from '@/features/gocam/models/cam'

/** One ShEx-derived domain/range rule: `subject --predicate--> object[]`. */
export interface ShapeAssociation {
  subject: string
  object: string[]
  predicate: string
  exclude_from_extensions?: boolean
}

interface ShapeTerm {
  id: string
  label: string
}

/** GO-CAM shapes: which edges an annotation's GO term (and its extensions) may carry. */
export const SHAPES = shapesJson.goshapes as ShapeAssociation[]
/** Gene product → GO term rules: which relation a GP may have to which aspect. */
export const GP_TO_TERM_SHAPES = gpToTermJson.goshapes as ShapeAssociation[]

const SHAPE_TERMS = new Map<string, ShapeTerm>(
  (shapeTermsJson as ShapeTerm[]).map(term => [term.id, term])
)

const KNOWN_RELATIONS = new Map<string, Entity>(
  globalKnownRelations.map(relation => [
    relation.id,
    { id: relation.id, label: relation.label ?? relation.id },
  ])
)

/**
 * A relation as an Entity. Labels come from the shape terms first (they read
 * "located in", where the known-relations list has "located_in"), then the
 * known-relations list, then the id itself.
 */
export const findRelation = (id: string): Entity => {
  const shapeTerm = SHAPE_TERMS.get(id)
  if (shapeTerm) return { id, label: shapeTerm.label }
  return KNOWN_RELATIONS.get(id) ?? { id, label: id }
}

/** Whether `id` is a class or relation the shape rules know by name. */
export const isShapeTerm = (id: string): boolean => SHAPE_TERMS.has(id)

/**
 * Predicates allowed between subject and object types (Angular `DataUtils.getPredicates`).
 * An empty or missing side matches everything; with no ids at all, every predicate
 * is returned. `excludeFromExtension` keeps only extension-eligible rules.
 */
export const getPredicates = (
  shapes: ShapeAssociation[],
  subjectIds?: string[],
  objectIds?: string[],
  excludeFromExtension = true
): string[] => {
  const matched = new Set<string>()

  if (!subjectIds && !objectIds) {
    for (const shape of shapes) {
      if (!excludeFromExtension || !shape.exclude_from_extensions) matched.add(shape.predicate)
    }
    return [...matched]
  }

  for (const shape of shapes) {
    const subjectMatch = !subjectIds || subjectIds.length === 0 || subjectIds.includes(shape.subject)
    const objectMatch =
      !objectIds || objectIds.length === 0 || shape.object.some(id => objectIds.includes(id))

    if (subjectMatch && objectMatch && shape.exclude_from_extensions !== excludeFromExtension) {
      matched.add(shape.predicate)
    }
  }

  return [...matched]
}

/** Object types reachable from `subjectIds`, optionally through one predicate. */
export const getObjects = (
  shapes: ShapeAssociation[],
  subjectIds: string[],
  predicateId?: string | null
): string[] => {
  const objects = new Set<string>()
  for (const shape of shapes) {
    if (subjectIds.includes(shape.subject) && (!predicateId || shape.predicate === predicateId)) {
      shape.object.forEach(id => objects.add(id))
    }
  }
  return [...objects]
}

/**
 * Relations from a subject to an object, by root types. `gpToTerm` uses the gene
 * product → GO term rules (the annotation relation); otherwise the GO-CAM shapes
 * restricted to extension-eligible rules (the extension relation).
 */
export const getTermRelations = (
  subjectRootTypes: string[],
  objectRootTypes: string[],
  gpToTerm = false
): Entity[] =>
  getPredicates(gpToTerm ? GP_TO_TERM_SHAPES : SHAPES, subjectRootTypes, objectRootTypes).map(
    findRelation
  )

/**
 * The categories (closure ids) a term may come from, given the subject's root types
 * and optionally the relation — e.g. the GO term field after a gene product and
 * "located in" are chosen gives `GO:0005575`. Only types the shape terms know count.
 */
export const getObjectRange = (
  subjectRootTypes: string[],
  predicateId?: string | null,
  gpToTerm = false
): string[] =>
  getObjects(gpToTerm ? GP_TO_TERM_SHAPES : SHAPES, subjectRootTypes, predicateId).filter(
    isShapeTerm
  )

/** Every predicate in the GO-CAM shapes — what an annotation's subgraph may follow. */
export const SHAPE_PREDICATES = new Set(getPredicates(SHAPES, undefined, undefined, false))
