import { PositionStrategy } from "@angular/cdk/overlay";
import { Cam, Activity, Entity, ActivityNode, AnnotationActivity } from "@noctua.form";

export enum EditorCategory {
  RELATIONSHIP = 'RELATIONSHIP',
  TERM = 'TERM',
  EVIDENCE = 'EVIDENCE',
  EVIDENCE_CODE = 'evidenceCode',
  REFERENCE = 'reference',
  WITH = 'withFrom',
  EVIDENCE_ALL = 'EVIDENCE_ALL',
  ALL = 'ALL'
}


export enum EditorType {
  DEFAULT = 'DEFAULT',
  STANDARD = 'STANDARD',
}

export interface EditorDropdownDialogConfig {
  panelClass?: string;
  hasBackdrop?: boolean;
  backdropClass?: string;
  positionStrategy?: PositionStrategy;
  width?: string;
  data?: any;
  editorType?: EditorType;
}


export interface EditorConfig extends EditorDropdownDialogConfig {
  cam: Cam;
  activity?: Activity;
  annotationActivity?: AnnotationActivity;
  entity: ActivityNode;
  category: EditorCategory;
  evidenceIndex?: any;
  relationshipChoices: any;
}