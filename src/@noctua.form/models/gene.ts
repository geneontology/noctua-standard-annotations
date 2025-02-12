export class Gene {
  id: string
  geneSymbol?: string
  label?: string
}

export class GeneList {
  id: string;
  description: string;
  genes: Gene[] = [];
  nonMatchingGenes: Gene[] = [];
  identifiersNotMatched: string[] = [];
  count?: number = 0
}