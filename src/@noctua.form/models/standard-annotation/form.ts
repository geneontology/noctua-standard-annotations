import { Entity } from "../activity/entity";
import { GOlrResponse } from "../golr";

export interface AnnotationExtensionForm {
  extensionEdge: Entity;
  extensionTerm: GOlrResponse;
}

export interface AnnotationCommentForm {
  comment: string;
}

export interface StandardAnnotationForm {
  gp: GOlrResponse;
  isComplement: boolean;
  gpToTermEdge: Entity;
  goterm: GOlrResponse;
  annotationExtensions: AnnotationExtensionForm[];
  annotationComments: AnnotationCommentForm[];
  evidenceCode: GOlrResponse;
  reference: string;
  withFrom: string;
}
