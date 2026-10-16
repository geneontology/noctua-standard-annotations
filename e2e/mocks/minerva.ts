import type { Page } from '@playwright/test'

/**
 * An in-memory Minerva for the browser tests: it applies m3Batch operations to a
 * model the way Minerva does, so a test can create, edit and delete through the
 * UI and watch the table follow.
 *
 * What it keeps from Minerva:
 * - `assign-to-variable` names an individual for the rest of the batch.
 * - New individuals and facts get `contributor`, `date` and (with `provided-by`)
 *   `providedBy` annotations.
 * - Removing a fact deletes its evidence individuals; removing an individual
 *   deletes its facts (and their evidence).
 * - An unknown individual or fact fails the batch with Minerva's message. There is
 *   no rollback: what ran before the failure stays, unstored — so a builder that
 *   removes something twice is caught, as on a real server.
 * - `store` saves (and clears `modified-p`), `reset` goes back to the last store.
 */

export interface CatalogClass {
  id: string
  label: string
  /** `isa_closure` in GOlr and `root-type` in Minerva. */
  closure: string[]
  /** GOlr `database_xref`, e.g. `GO:IDA` for an evidence code. */
  xref?: string
  subset?: string[]
}

interface RawType {
  type: 'class' | 'complement'
  id?: string
  label?: string
  filler?: { type: 'class'; id: string; label?: string }
}

interface RawAnnotation {
  key: string
  value: string
  'value-type'?: string
}

interface RawIndividual {
  id: string
  type: RawType[]
  'root-type': { type: 'class'; id: string; label: string }[]
  annotations: RawAnnotation[]
}

interface RawFact {
  subject: string
  property: string
  'property-label'?: string
  object: string
  annotations: RawAnnotation[]
}

export interface RawModel {
  id: string
  'modified-p'?: boolean
  individuals: RawIndividual[]
  facts: RawFact[]
  annotations: RawAnnotation[]
}

interface Operation {
  entity: string
  operation: string
  arguments: Record<string, any>
}

export interface RecordedBatch {
  intention: string
  providedBy: string | null
  operations: Operation[]
  /** The Minerva error, when the batch failed. */
  error?: string
}

const TODAY = '2026-10-15'
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

class BatchError extends Error {}

export class FakeMinerva {
  model: RawModel
  private stored: RawModel
  private counter = 0
  readonly batches: RecordedBatch[] = []
  /** Fail the next action batch with this message (e.g. to test the error toast). */
  failNext: string | null = null

  constructor(
    initial: RawModel,
    private readonly catalog: CatalogClass[],
    private readonly contributor = 'https://orcid.org/0000-0000-0000-0099',
    private readonly relationLabels: Record<string, string> = {}
  ) {
    this.model = clone(initial)
    this.stored = clone({ ...initial, 'modified-p': false })
  }

  /** The stored model's individuals, by their class label (for assertions). */
  classOf(individualId: string): string | undefined {
    const individual = this.model.individuals.find(i => i.id === individualId)
    const type = individual?.type.at(-1)
    return type?.type === 'complement' ? `NOT ${type.filler?.id}` : type?.id
  }

  /** Every fact as `subject-class predicate object-class` (for assertions). */
  factSummaries(): string[] {
    return this.model.facts.map(
      f => `${this.classOf(f.subject)} ${f.property} ${this.classOf(f.object)}`
    )
  }

  /** The evidence individuals of a fact, with their sources and with/from. */
  evidenceOf(fact: RawFact) {
    return fact.annotations
      .filter(a => a.key === 'evidence')
      .map(a => this.model.individuals.find(i => i.id === a.value)!)
      .map(ev => ({
        code: this.classOf(ev.id),
        sources: ev.annotations.filter(a => a.key === 'source').map(a => a.value),
        with: ev.annotations.filter(a => a.key === 'with').map(a => a.value),
      }))
  }

  handle(params: URLSearchParams): unknown {
    const intention = params.get('intention') ?? 'query'
    const operations: Operation[] = JSON.parse(params.get('requests') ?? '[]')
    const providedBy = params.get('provided-by')
    const batch: RecordedBatch = { intention, providedBy, operations }
    if (operations.some(op => op.operation !== 'get')) this.batches.push(batch)

    if (this.failNext && intention === 'action') {
      batch.error = this.failNext
      this.failNext = null
      return { 'message-type': 'error', message: batch.error }
    }

    const variables = new Map<string, string>()
    try {
      for (const op of operations) this.apply(op, variables, providedBy)
    } catch (error) {
      if (!(error instanceof BatchError)) throw error
      batch.error = error.message
      return {
        'message-type': 'error',
        message: `Could not successfully handle batch request. Exception: ${error.message}`,
      }
    }
    return { 'message-type': 'success', message: 'success', signal: 'merge', data: this.model }
  }

  private generated(providedBy: string | null): RawAnnotation[] {
    return [
      { key: 'contributor', value: this.contributor },
      { key: 'date', value: TODAY },
      ...(providedBy ? [{ key: 'providedBy', value: providedBy }] : []),
    ]
  }

  private individual(idOrVariable: string, variables: Map<string, string>): RawIndividual {
    const id = variables.get(idOrVariable) ?? idOrVariable
    const individual = this.model.individuals.find(i => i.id === id)
    if (!individual) {
      throw new BatchError(
        `org.geneontology.minerva.MolecularModelManager$UnknownIdentifierException. No individual found for id: '${id}'`
      )
    }
    return individual
  }

  private typeOf(expression: any): RawType {
    if (expression.type === 'complement') {
      const id = expression.filler.id
      return { type: 'complement', filler: { type: 'class', id, label: this.label(id) } }
    }
    return { type: 'class', id: expression.id, label: this.label(expression.id) }
  }

  private label(id: string) {
    return this.catalog.find(c => c.id === id)?.label ?? id
  }

  private rootTypes(id: string) {
    const closure = this.catalog.find(c => c.id === id)?.closure ?? []
    return closure.map(rt => ({ type: 'class' as const, id: rt, label: rt }))
  }

  private sameType(a: RawType, b: RawType) {
    return a.type === b.type && (a.id ?? a.filler?.id) === (b.id ?? b.filler?.id)
  }

  private removeIndividualById(id: string) {
    const facts = this.model.facts.filter(f => f.subject === id || f.object === id)
    facts.forEach(fact => this.removeFact(fact))
    this.model.individuals = this.model.individuals.filter(i => i.id !== id)
  }

  /** Minerva deletes a removed fact's evidence individuals with it. */
  private removeFact(fact: RawFact) {
    this.model.facts = this.model.facts.filter(f => f !== fact)
    const evidence = fact.annotations.filter(a => a.key === 'evidence').map(a => a.value)
    this.model.individuals = this.model.individuals.filter(i => !evidence.includes(i.id))
  }

  private fact(args: Record<string, any>, variables: Map<string, string>): RawFact {
    const subject = this.individual(args.subject, variables).id
    const object = this.individual(args.object, variables).id
    const fact = this.model.facts.find(
      f => f.subject === subject && f.object === object && f.property === args.predicate
    )
    if (!fact) {
      throw new BatchError(
        `UnknownIdentifierException. Could not find the fact: ${subject} ${args.predicate} ${object}`
      )
    }
    return fact
  }

  private resolveValues(values: RawAnnotation[] = [], variables: Map<string, string>) {
    return values.map(v =>
      v.key === 'evidence'
        ? { ...v, value: variables.get(v.value) ?? v.value, 'value-type': 'IRI' }
        : { key: v.key, value: v.value }
    )
  }

  private removeValues(annotations: RawAnnotation[], values: RawAnnotation[]) {
    return annotations.filter(a => !values.some(v => v.key === a.key && v.value === a.value))
  }

  private apply(op: Operation, variables: Map<string, string>, providedBy: string | null) {
    const args = op.arguments
    const changed = () => {
      this.model['modified-p'] = true
    }

    switch (`${op.entity}:${op.operation}`) {
      case 'model:get':
        return
      case 'model:store':
        if (this.model.individuals.length === 0) {
          throw new BatchError('Save model failed: Empty models should not be saved.')
        }
        this.model['modified-p'] = false
        this.stored = clone(this.model)
        return
      case 'model:reset':
        this.model = clone(this.stored)
        return
      case 'model:add-annotation':
        this.model.annotations.push(...this.resolveValues(args.values, variables))
        return changed()
      case 'model:remove-annotation':
        this.model.annotations = this.removeValues(this.model.annotations, args.values)
        return changed()

      case 'individual:add': {
        const type = this.typeOf(args.expressions[0])
        const classId = type.id ?? type.filler!.id
        const id = `${this.model.id}/e2e${String(++this.counter).padStart(4, '0')}`
        this.model.individuals.push({
          id,
          type: [type],
          'root-type': this.rootTypes(classId),
          annotations: this.generated(providedBy),
        })
        if (args['assign-to-variable']) variables.set(args['assign-to-variable'], id)
        return changed()
      }
      case 'individual:remove':
        this.removeIndividualById(this.individual(args.individual, variables).id)
        return changed()
      case 'individual:add-type': {
        const individual = this.individual(args.individual, variables)
        const type = this.typeOf(args.expressions[0])
        individual.type.push(type)
        individual['root-type'] = this.rootTypes(type.id ?? type.filler!.id)
        return changed()
      }
      case 'individual:remove-type': {
        const individual = this.individual(args.individual, variables)
        const type = this.typeOf(args.expressions[0])
        individual.type = individual.type.filter(t => !this.sameType(t, type))
        return changed()
      }
      case 'individual:add-annotation':
        this.individual(args.individual, variables).annotations.push(
          ...this.resolveValues(args.values, variables)
        )
        return changed()
      case 'individual:remove-annotation': {
        const individual = this.individual(args.individual, variables)
        individual.annotations = this.removeValues(individual.annotations, args.values)
        return changed()
      }

      case 'edge:add': {
        const subject = this.individual(args.subject, variables).id
        const object = this.individual(args.object, variables).id
        const exists = this.model.facts.some(
          f => f.subject === subject && f.object === object && f.property === args.predicate
        )
        if (!exists) {
          this.model.facts.push({
            subject,
            property: args.predicate,
            'property-label': this.relationLabels[args.predicate] ?? args.predicate,
            object,
            annotations: this.generated(providedBy),
          })
        }
        return changed()
      }
      case 'edge:remove':
        this.removeFact(this.fact(args, variables))
        return changed()
      case 'edge:add-annotation':
        this.fact(args, variables).annotations.push(...this.resolveValues(args.values, variables))
        return changed()
      case 'edge:remove-annotation': {
        const fact = this.fact(args, variables)
        fact.annotations = this.removeValues(fact.annotations, args.values)
        return changed()
      }
      default:
        throw new BatchError(`Unsupported operation ${op.entity}:${op.operation}`)
    }
  }
}

/** Serve every m3Batch request (GET or POST) from `minerva`. */
export const routeMinerva = async (page: Page, minerva: FakeMinerva): Promise<void> => {
  await page.route('**/m3Batch*', async route => {
    const request = route.request()
    const params =
      request.method() === 'GET'
        ? new URL(request.url()).searchParams
        : new URLSearchParams(request.postData() ?? '')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(minerva.handle(params)),
    })
  })
}

/**
 * Answer GOlr (JSONP) from `catalog`: a text search matches labels and ids, and
 * the category `fq` (`isa_closure:"X" OR NOT idspace:"GO" …`) is applied as GOlr
 * would. An id lookup (`annotation_class:"…" OR …`) returns those ids.
 */
export const routeGolr = async (page: Page, catalog: CatalogClass[]): Promise<void> => {
  await page.route('**/select?**', route => {
    const params = new URL(route.request().url()).searchParams
    const callback = params.get('json.wrf') ?? 'callback'
    const q = params.get('q') ?? ''
    const filters = params.getAll('fq').filter(fq => !fq.startsWith('document_category'))

    const idLookup = [...q.matchAll(/annotation_class:"([^"]+)"/g)].map(m => m[1])
    const text = q.replace(/\*$/, '').replace(/\\/g, '').trim().toLowerCase()

    const matchesFilter = (doc: CatalogClass) =>
      filters.every(fq =>
        fq.split(' OR ').some(clause => {
          const not = clause.startsWith('NOT ')
          const [, field, value] = clause.replace(/^NOT /, '').match(/(\w+):"([^"]+)"/) ?? []
          const has =
            field === 'isa_closure'
              ? doc.closure.includes(value) || doc.id === value
              : field === 'idspace'
                ? doc.id.split(':')[0] === value
                : false
          return not ? !has : has
        })
      )

    const docs = catalog
      .filter(doc =>
        idLookup.length > 0
          ? idLookup.includes(doc.id)
          : doc.label.toLowerCase().includes(text) || doc.id.toLowerCase() === text
      )
      .filter(doc => idLookup.length > 0 || matchesFilter(doc))
      .map(doc => ({
        annotation_class: doc.id,
        annotation_class_label: doc.label,
        isa_closure: [doc.id, ...doc.closure],
        isa_closure_label: [doc.label, ...doc.closure],
        database_xref: doc.xref ? [doc.xref] : [],
        subset: doc.subset ?? [],
        is_obsolete: false,
      }))

    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `${callback}(${JSON.stringify({ response: { docs } })})`,
    })
  })
}

/** PubMed summaries for the reference picker's preview (never the real eutils). */
export const routePubmed = async (page: Page): Promise<void> => {
  await page.route('**/esummary.fcgi**', route => {
    const id = new URL(route.request().url()).searchParams.get('id') ?? ''
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        result: { [id]: { title: `Paper ${id}`, authors: [{ name: 'Curie M' }], pubdate: '2020' } },
      }),
    })
  })
}
