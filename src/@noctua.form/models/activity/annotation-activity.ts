import { ActivityNode } from './activity-node';
import { Entity } from './entity';
import { noctuaFormConfig } from './../../noctua-form-config';
import { Activity } from './activity';
import { Triple } from './triple';
import { Predicate } from './predicate';
import * as ShapeUtils from './../../data/config/shape-utils';
import { Evidence } from './evidence';

export interface AnnotationEdgeConfig {
  gpToTermPredicate?: string;
  gpToTermReverse?: boolean;
  mfNodeRequired: boolean;
  mfToTermPredicate?: string;
  root?: string;
  mfToTermReverse?: boolean;
}


export class AnnotationActivity {
  gp: ActivityNode;
  goterm: ActivityNode;
  extension: ActivityNode;
  gpToTermEdge: Entity;
  extensionEdge: Entity;
  extensionType;
  gotermAspect: string;

  gpToTermEdges: Entity[] = [];
  extensionEdges: Entity[] = [];
  activity: Activity;


  constructor(activity?: Activity) {

    if (activity) {
      this.activityToAnnotation(activity);
    }
  }


  activityToAnnotation(activity: Activity) {
    this.gp = activity.getNode('gp');
    this.goterm = activity.getNode('goterm');
    this.extension = activity.getNode('extension');

  }

  findEdgeByCriteria(matchCriteria: AnnotationEdgeConfig): string {

    const config = noctuaFormConfig.simpleAnnotationEdgeConfig;

    for (const key in config) {
      if (config.hasOwnProperty(key)) {
        let allCriteriaMatch = true;
        const entry = config[key];

        for (const criterion in matchCriteria) {
          if (entry[criterion] !== matchCriteria[criterion]) {
            allCriteriaMatch = false;
            break;
          }
        }

        if (allCriteriaMatch) {
          return key;
        }
      }
    }
    return null; // Return null if no match is found
  }

  createSave() {
    const saveData = {
      title: 'enabled by ' + this.gp?.term.label,
      triples: [],
      nodes: [this.gp, this.goterm],
      graph: null
    };

    const edgeType = this.gpToTermEdge.id
    const config = noctuaFormConfig.simpleAnnotationEdgeConfig[edgeType];

    if (!config) {
      console.warn('No configuration defined for edge:', edgeType);
      return;
    }

    if (config.mfNodeRequired) {
      const mfNode = ShapeUtils.generateBaseTerm([]);
      const rootMF = config.root ? config.root : noctuaFormConfig.rootNode.mf;
      mfNode.term = new Entity(rootMF.id, rootMF.label);
      const triple = this._createTriple(mfNode, this.gp, config.gpToTermPredicate, this.goterm.predicate.evidence, config.gpToTermReverse)
      saveData.triples.push(triple);

      if (config.mfToTermPredicate) {
        const mfTriple = this._createTriple(mfNode, this.goterm, config.mfToTermPredicate, this.goterm.predicate.evidence, config.mfToTermReverse)
        saveData.triples.push(mfTriple);
      }

    } else {
      const triple = this._createTriple(this.gp, this.goterm, config.gpToTermPredicate, this.goterm.predicate.evidence, config.gpToTermReverse)
      saveData.triples.push(triple);
    }

    if (this.extension?.hasValue()) {
      const extensionTriple = new Triple(this.goterm, this.extension,
        new Predicate(this.extensionEdge, this.goterm.predicate.evidence));

      saveData.nodes.push(this.extension);
      saveData.triples.push(extensionTriple);
    }

    return saveData;
  }


  private _createTriple(subjectNode: ActivityNode, objectNode: ActivityNode, predicateId, evidence: Evidence[], reverse = false) {
    const edgeConfig = noctuaFormConfig.allEdges.find(edge => edge.id === predicateId);

    if (!edgeConfig) {
      throw new Error(`Edge configuration not found for predicate ID: ${predicateId}`);
    }

    const predicateEntity = Entity.createEntity(edgeConfig);
    const predicate = new Predicate(predicateEntity, evidence);

    return reverse
      ? new Triple(objectNode, subjectNode, predicate)
      : new Triple(subjectNode, objectNode, predicate);
  }


  updateAspect() {
    if (!this.goterm.hasValue()) return

    let aspect: string | null = null;
    const rootNode = noctuaFormConfig.rootNode
    for (const key in noctuaFormConfig.rootNode) {
      if (this.goterm.rootTypes && this.goterm.rootTypes.some(item => item.id === rootNode[key].id)) {
        this.gotermAspect = rootNode[key].aspect;
        break;
      }
    }

    return aspect;
  }

}
