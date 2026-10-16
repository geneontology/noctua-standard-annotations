import type React from 'react'
import { useState } from 'react'
import { Button, Loader, Tabs, Textarea } from '@mantine/core'
import { FaAngleDoubleRight } from 'react-icons/fa'
import SimpleDialog from '@/@noctua.core/components/dialog/SimpleDialog'
import { useAppDispatch } from '@/app/hooks'
import { showToast } from '@/@noctua.core/components/toast/toastSlice'
import { useLazyGetGenesDetailsQuery } from '@/features/search/slices/lookupApiSlice'
import { MAX_GENES } from '../../data/annotationConfig'
import type { Gene, GeneList } from '../../services/geneList'
import { classifyGenes, parseGeneIds } from '../../services/geneList'

interface AddGenesDialogProps {
  open: boolean
  onClose: () => void
  /** Receives the matched genes; the dialog stays open until the caller closes it. */
  onSave: (genes: Gene[]) => void | Promise<void>
}

const emptyList: GeneList = { genes: [], nonMatchingGenes: [], identifiersNotMatched: [], count: 0 }

const Step: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
  <div className="flex items-center gap-3">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-200 text-sm">
      {n}
    </div>
    <p className="text-[11px] text-gray-700">{children}</p>
  </div>
)

const GeneTable: React.FC<{ genes: Gene[] }> = ({ genes }) => (
  <div className="text-xs">
    <div className="grid grid-cols-2 gap-4 bg-gray-100 p-3 font-semibold">
      <div>ID</div>
      <div>Label</div>
    </div>
    {genes.map(gene => (
      <div key={gene.id} className="grid grid-cols-2 gap-4 border-b p-3 hover:bg-gray-50">
        <div className="break-all">{gene.id}</div>
        <div>{gene.label}</div>
      </div>
    ))}
  </div>
)

/**
 * Add More Gene(s) (Angular `AddGenesDialogComponent`): paste gene product ids,
 * look them up, and copy the annotation onto every id that resolved to a gene product.
 */
const AddGenesDialog: React.FC<AddGenesDialogProps> = ({ open, onClose, onSave }) => {
  const dispatch = useAppDispatch()
  const [text, setText] = useState('')
  const [result, setResult] = useState<GeneList>(emptyList)
  const [tab, setTab] = useState<string | null>('matched')
  const [saving, setSaving] = useState(false)
  const [getGenesDetails, { isFetching }] = useLazyGetGenesDetailsQuery()

  const loadGenes = async () => {
    const ids = parseGeneIds(text)
    if (ids.length === 0) return
    if (ids.length > MAX_GENES) {
      dispatch(
        showToast({
          message: `Too many genes to search. Please enter less than ${MAX_GENES} genes.`,
          severity: 'warning',
        })
      )
      return
    }
    const response = await getGenesDetails(ids)
    if (response.error) {
      dispatch(showToast({ message: 'Gene lookup failed. Please try again.', severity: 'error' }))
      return
    }
    setResult(classifyGenes(ids, response.data ?? []))
    setTab('matched')
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave(result.genes)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SimpleDialog open={open} onClose={onClose} title="Gene List" size="md" bodyScroll="none">
      <div className="flex min-h-0 flex-1 gap-6 p-4" style={{ height: '60vh' }}>
        <div className="flex w-1/3 flex-col gap-4">
          <div className="flex flex-col gap-3">
            <Step n={1}>
              Enter gene IDs (max {MAX_GENES}) e.g. UniProtKB:Q9P258 WB:WBGene0000009. Supports: one
              per line, comma-separated, or JSON format
            </Step>
            <Step n={2}>
              Click &quot;Load Genes&quot; to see matches (Found genes, Partial matches, Not found)
              in right panel tabs
            </Step>
            <Step n={3}>Review matches and click &quot;Save&quot;</Step>
          </div>
          <Textarea
            label={`Gene Ids (max ${MAX_GENES})`}
            placeholder="Enter Gene IDs (eg: UniProtKB:Q9P258, WB:WBGene0000009)"
            value={text}
            onChange={e => setText(e.target.value)}
            autosize
            minRows={12}
            maxRows={18}
          />
          <Button
            variant="default"
            onClick={loadGenes}
            leftSection={isFetching ? <Loader size={12} /> : <FaAngleDoubleRight />}
            disabled={isFetching}
          >
            Load Genes
          </Button>
        </div>

        <div className="flex min-h-0 w-2/3 flex-col">
          <Tabs value={tab} onChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <Tabs.List>
              <Tabs.Tab value="matched">Matched ({result.genes.length})</Tabs.Tab>
              <Tabs.Tab value="unmatched">Unmatched ({result.nonMatchingGenes.length})</Tabs.Tab>
              <Tabs.Tab value="notFound">
                Not Found ({result.identifiersNotMatched.length})
              </Tabs.Tab>
            </Tabs.List>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-b-lg border">
              <Tabs.Panel value="matched">
                <GeneTable genes={result.genes} />
              </Tabs.Panel>
              <Tabs.Panel value="unmatched">
                <GeneTable genes={result.nonMatchingGenes} />
              </Tabs.Panel>
              <Tabs.Panel value="notFound">
                <div className="text-xs">
                  <div className="bg-gray-100 p-3 font-semibold">Identifier</div>
                  {result.identifiersNotMatched.map(id => (
                    <div key={id} className="border-b p-3 hover:bg-gray-50">
                      {id}
                    </div>
                  ))}
                </div>
              </Tabs.Panel>
            </div>
          </Tabs>
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="filled"
          onClick={save}
          disabled={result.genes.length === 0 || saving}
          loading={saving}
        >
          Save
        </Button>
      </div>
    </SimpleDialog>
  )
}

export default AddGenesDialog
