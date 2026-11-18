export enum OperationEntity {
  INDIVIDUAL = 'individual',
  EDGE = 'edge',
  MODEL = 'model',
}

export enum OperationType {
  ADD = 'add',
  REMOVE = 'remove',
  ADD_TYPE = 'add-type',
  REMOVE_TYPE = 'remove-type',
  ADD_ANNOTATION = 'add-annotation',
  REMOVE_ANNOTATION = 'remove-annotation',
  STORE = 'store',
  RESET = 'reset',
  GET = 'get',
}

export enum AnnotationKey {
  SOURCE = 'source',
  WITH = 'with',
  CONTRIBUTOR = 'contributor',
  PROVIDED_BY = 'providedBy',
  EVIDENCE = 'evidence',
  COMMENT = 'comment',
  TITLE = 'title',
  STATE = 'state',
  DATE = 'date',
  CONFORMS_TO_GPAD = 'conforms-to-gpad',
  IN_TAXON = 'https://w3id.org/biolink/vocab/in_taxon',
}

export enum ExpressionType {
  CLASS = 'class',
  COMPLEMENT = 'complement',
}

export interface ClassExpression {
  type: ExpressionType
  id?: string
  filler?: ClassExpression
}

export interface Operation {
  entity: OperationEntity
  operation: OperationType
  arguments: Record<string, unknown>
}

/** `{type: 'class'}` or, for a NOT qualifier, `{type: 'complement', filler: class}`. */
export const classExpression = (id: string, isComplement = false): ClassExpression =>
  isComplement
    ? { type: ExpressionType.COMPLEMENT, filler: { type: ExpressionType.CLASS, id } }
    : { type: ExpressionType.CLASS, id }
