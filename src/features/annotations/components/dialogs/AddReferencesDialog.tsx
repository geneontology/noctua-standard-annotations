import type React from 'react'
import { useState } from 'react'
import { Button, Loader, Tabs, Textarea } from '@mantine/core'
import { FaAngleDoubleRight } from 'react-icons/fa'
import SimpleDialog from '@/@noctua.core/components/dialog/SimpleDialog'
import { useAppDispatch } from '@/app/hooks'
import { showToast } from '@/@noctua.core/components/toast/toastSlice'
import { ENVIRONMENT } from '@/@noctua.core/data/constants'
import { useLazyGetPubmedSummariesQuery } from '@/features/search/slices/lookupApiSlice'
import { MAX_REFERENCES } from '../../data/annotationConfig'
import type { ReferenceList } from '../../services/referenceList'
import { classifyReferences, parseReferences, pmidNumber } from '../../services/referenceList'

interface AddReferencesDialogProps {
  open: boolean
  onClose: () => void
  /** The annotation's current references; pasting one of these again is skipped. */
  citedSources: string[]
  /** Receives the found PMIDs; the dialog stays open until the caller closes it. */
  onSave: (references: string[]) => void | Promise<void>
}

const emptyList: ReferenceList = { found: [], notFound: [], alreadyCited: [], invalid: [] }

const Step: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
  <div className="flex items-center gap-3">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-200 text-sm">
      {n}
    </div>
    <p className="text-[11px] text-gray-700">{children}</p>
  </div>
)

const IdList: React.FC<{ heading: string; ids: string[] }> = ({ heading, ids }) => (
  <div className="text-xs">
    <div className="bg-gray-100 p-3 font-semibold">{heading}</div>
    {ids.map(id => (
      <div key={id} className="border-b p-3 break-all hover:bg-gray-50">
        {id}
      </div>
    ))}
  </div>
)

/**
 * Add More Reference(s) (#93), laid out like Add More Gene(s): paste PMIDs, look
 * them up on PubMed, and copy the annotation once per paper found, with that
 * paper as its reference. PMIDs the annotation already cites are skipped.
 */
const AddReferencesDialog: React.FC<AddReferencesDialogProps> = ({
  open,
  onClose,
  citedSources,
  onSave,
}) => {
  const dispatch = useAppDispatch()
  const [text, setText] = useState('')
  const [result, setResult] = useState<ReferenceList>(emptyList)
  const [tab, setTab] = useState<string | null>('found')
  const [saving, setSaving] = useState(false)
  const [getSummaries, { isFetching }] = useLazyGetPubmedSummariesQuery()

  const loadReferences = async () => {
    const parsed = parseReferences(text)
    if (parsed.pmids.length === 0 && parsed.invalid.length === 0) return
    if (parsed.pmids.length > MAX_REFERENCES) {
      dispatch(
        showToast({
          message: `Too many references to search. Please enter at most ${MAX_REFERENCES} PMIDs.`,
          severity: 'warning',
        })
      )
      return
    }
    let summaries = {}
    if (parsed.pmids.length > 0) {
      const response = await getSummaries(parsed.pmids.map(pmidNumber))
      if (response.error) {
        dispatch(
          showToast({ message: 'PubMed lookup failed. Please try again.', severity: 'error' })
        )
        return
      }
      summaries = response.data ?? {}
    }
    setResult(classifyReferences(parsed, summaries, citedSources))
    setTab('found')
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave(result.found.map(paper => paper.id))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SimpleDialog open={open} onClose={onClose} title="Reference List" size="md" bodyScroll="none">
      <div className="flex min-h-0 flex-1 gap-6 p-4" style={{ height: '60vh' }}>
        <div className="flex w-1/3 flex-col gap-4">
          <div className="flex flex-col gap-3">
            <Step n={1}>
              Enter PMIDs (max {MAX_REFERENCES}) e.g. PMID:12345678 or 12345678. One per line, comma
              or space separated
            </Step>
            <Step n={2}>
              Click &quot;Load References&quot; to look them up on PubMed (Found, Not Found, Already
              Cited)
            </Step>
            <Step n={3}>
              Review and click &quot;Save&quot;: one new annotation per paper found, the same
              annotation with that reference
            </Step>
          </div>
          <Textarea
            label={`PMIDs (max ${MAX_REFERENCES})`}
            placeholder="Enter PMIDs (eg: PMID:12345678, 23456789)"
            value={text}
            onChange={e => setText(e.target.value)}
            autosize
            minRows={12}
            maxRows={18}
          />
          <Button
            variant="default"
            onClick={loadReferences}
            leftSection={isFetching ? <Loader size={12} /> : <FaAngleDoubleRight />}
            disabled={isFetching}
          >
            Load References
          </Button>
        </div>

        <div className="flex min-h-0 w-2/3 flex-col">
          <Tabs value={tab} onChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <Tabs.List>
              <Tabs.Tab value="found">Found ({result.found.length})</Tabs.Tab>
              <Tabs.Tab value="notFound">
                Not Found ({result.notFound.length + result.invalid.length})
              </Tabs.Tab>
              <Tabs.Tab value="alreadyCited">Already Cited ({result.alreadyCited.length})</Tabs.Tab>
            </Tabs.List>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-b-lg border">
              <Tabs.Panel value="found">
                <div className="text-xs">
                  <div className="grid grid-cols-[8rem_1fr] gap-4 bg-gray-100 p-3 font-semibold">
                    <div>PMID</div>
                    <div>Paper</div>
                  </div>
                  {result.found.map(paper => (
                    <div
                      key={paper.id}
                      className="grid grid-cols-[8rem_1fr] gap-4 border-b p-3 hover:bg-gray-50"
                    >
                      <a
                        href={`${ENVIRONMENT.pubmedUrl}${pmidNumber(paper.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {paper.id}
                      </a>
                      <div>
                        <div>{paper.title}</div>
                        <div className="text-gray-500">
                          {[paper.authors, paper.date].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Tabs.Panel>
              <Tabs.Panel value="notFound">
                <IdList heading="Identifier" ids={[...result.notFound, ...result.invalid]} />
              </Tabs.Panel>
              <Tabs.Panel value="alreadyCited">
                <IdList heading="Already this annotation's reference" ids={result.alreadyCited} />
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
          disabled={result.found.length === 0 || saving}
          loading={saving}
        >
          Save
        </Button>
      </div>
    </SimpleDialog>
  )
}

export default AddReferencesDialog
