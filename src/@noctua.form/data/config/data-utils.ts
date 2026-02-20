import { cloneDeep } from "lodash";
import { ShexShapeAssociation } from "../shape";
import shapeTerms from './../shape-terms.json'
import { withFromAllowedDBs } from "../withfrom-dbs";

export class DataUtils {

  public static toTitleCase(str) {
    str = str.toLowerCase().split(' ');
    for (var i = 0; i < str.length; i++) {
      str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
    }
    return str.join(' ');
  }

  public static genTermLookupTable() {
    const result = {};
    shapeTerms.forEach((term) => {
      result[term.id] = term
    })

    return result;
  }

  public static getPredicates(shapes: ShexShapeAssociation[], subjectIds?: string[], objectIds?: string[], excludeFromExtension = true): string[] {
    const matchedPredicates = new Set<string>();

    // If neither subjectIds nor objectIds is provided, return all predicates
    if (!subjectIds && !objectIds) {
      shapes.forEach((shape) => {

        if (excludeFromExtension) {
          if (!shape.exclude_from_extensions) {
            matchedPredicates.add(shape.predicate);
          }
        } else {
          matchedPredicates.add(shape.predicate);
        }

      });

      return [...matchedPredicates];
    }

    shapes.forEach((shape) => {
      const subjectMatch = !subjectIds || subjectIds.length === 0 || subjectIds.includes(shape.subject);
      const objectMatch = !objectIds || objectIds.length === 0 || shape.object.some(objId => objectIds.includes(objId));

      if (subjectMatch && objectMatch && shape.exclude_from_extensions !== excludeFromExtension) {
        matchedPredicates.add(shape.predicate);
      }
    });

    return [...matchedPredicates];
  }

  public static getObjects(shapes: ShexShapeAssociation[], subjectIds: string[], predicateId?: string): string[] {
    const objectsSet = new Set<string>();

    shapes.forEach(shape => {
      if (subjectIds.includes(shape.subject) && (!predicateId || shape.predicate === predicateId)) {
        shape.object.forEach(obj => objectsSet.add(obj));
      }
    });

    return [...objectsSet];
  }


  public static getSubjectShapes(shapes: ShexShapeAssociation[], subjectId, excludeFromExtensions = true): ShexShapeAssociation[] {
    return shapes.filter(shape => {
      if (!excludeFromExtensions) {
        return shape.subject === subjectId
      }
      return shape.subject === subjectId && !shape.exclude_from_extensions;
    });
  }

  public static getRangeBySubject(shapes: ShexShapeAssociation[], subjectId: string, predicateId: string): ShexShapeAssociation {
    return shapes.find(shape => {
      return shape.subject === subjectId &&
        shape.predicate === predicateId &&
        !shape.exclude_from_extensions;
    });
  }

  public static getRangeLabels(shapes: ShexShapeAssociation[], lookupTable): string[] {
    const predicates = shapes.map((shape) => {
      const range = shape.object.map((term) => {
        return lookupTable[term]?.label;
      })

      const result = cloneDeep(lookupTable[shape.predicate])
      result['rangeLabel'] = range.join(', ');

      return result;
    });

    return predicates;
  }


  public static processHasParticipants(data): any[] {
    const nodeMap = new Map(data.nodes.map(node => [node.id, node.lbl]));

    return data.edges
      .filter(edge => edge.pred === "RO:0000057")
      .map(edge => ({
        id: edge.obj,
        label: nodeMap.get(edge.obj) || ''
      }));
  }

  public static findCommonItems(itemsA, itemsB) {
    const idSetB = new Set(itemsB.map(item => item.id));

    return itemsA.filter(item => idSetB.has(item.id));
  }

  public static validateDatabaseIdentifiers(input: string): string | null {

    const identifiers = input.split(/[,|]/);
    const allowedLowerCase = new Set(withFromAllowedDBs.map(db => db.toLowerCase()));

    for (const identifier of identifiers) {
      const trimmed = identifier.trim();
      if (!trimmed) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) {
        return `Invalid format: "${trimmed}" - expected format is "DATABASE:accession"`;
      }

      const dbPrefix = trimmed.substring(0, colonIndex);
      const accession = trimmed.substring(colonIndex + 1).trim();

      if (!accession) {
        return `Invalid format: "${trimmed}" - accession cannot be empty`;
      }

      const dbPrefixLower = dbPrefix.toLowerCase();

      if (!allowedLowerCase.has(dbPrefixLower)) {
        return `Invalid database prefix: "${dbPrefix}" is not part of allowed entities`;
      }
    }

    return null;
  }

  public static correctDatabaseIdentifierCase(input: string): string {
    const parts = input.split(/([,|])/);

    const caseMap = new Map<string, string>();
    withFromAllowedDBs.forEach(db => {
      caseMap.set(db.toLowerCase(), db);
    });

    const correctedParts = parts.map(part => {
      if (part === ',' || part === '|') {
        return part;
      }

      const trimmed = part.trim();
      if (!trimmed) return part;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) {
        return part;
      }

      const dbPrefix = trimmed.substring(0, colonIndex);
      const accession = trimmed.substring(colonIndex);
      const correctCase = caseMap.get(dbPrefix.toLowerCase());
      if (correctCase) {
        const leadingSpace = part.match(/^\s*/)?.[0] || '';
        const trailingSpace = part.match(/\s*$/)?.[0] || '';
        return leadingSpace + correctCase + accession + trailingSpace;
      }

      return part;
    });

    return correctedParts.join('');
  }

}