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
  /**
   * Marks a model made in SAE (#97): Minerva's shorthand (minerva#612/#613), lowercase like
   * the other `lego:` properties and matched case-sensitively. `model get` returns this key.
   */
  ANNOTATION_EDITOR_SAE = 'annotation-editor-sae',
  /**
   * The property behind `annotation-editor-sae`. SAE writes this form: Minerva resolves it to
   * the same shorthand, and a Minerva without the shorthand still accepts it.
   */
  ANNOTATION_EDITOR_SAE_IRI = 'http://geneontology.org/lego/annotation-editor-sae',
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
