export enum AnnotationActivitySortField {
  GP = 'gp',
  GOTERM = 'goterm',
  GP_TO_TERM_EDGE = 'gpToTermEdge',
  GO_TERM_ASPECT = 'gotermAspect',
  EVIDENCE_CODE = 'evidenceCode',
  REFERENCE = 'reference',
  WITH = 'with',
  DATE = 'date'
}

export class AnnotationActivitySortBy {
  field: AnnotationActivitySortField = AnnotationActivitySortField.GP
  label = "";
  ascending = true;
}
