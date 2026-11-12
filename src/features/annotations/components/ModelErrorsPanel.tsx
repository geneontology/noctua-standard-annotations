import type React from 'react'
import { Button } from '@mantine/core'
import { FaBan, FaCheck, FaEyeSlash, FaLink, FaSitemap } from 'react-icons/fa'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { setRightDrawerOpen } from '@/@noctua.core/components/drawer/drawerSlice'
import type { GraphNode } from '@/features/gocam/models/cam'
import type { HiddenEdge } from '../services/modelErrors'
import { selectModelErrors } from '../slices/annotationsSlice'

const Count: React.FC<{ value: number }> = ({ value }) => (
  <span className="rounded-xl bg-slate-200 px-2 py-0.5 text-xs font-semibold text-blue-700">
    {value}
  </span>
)

const NodeItem: React.FC<{ node: GraphNode }> = ({ node }) => (
  <div
    data-testid="hidden-node"
    className="flex items-center gap-3 rounded-md border border-slate-300 bg-gray-50 p-3 hover:border-slate-400 hover:bg-white"
  >
    <div className="min-w-[40px] self-stretch rounded-sm bg-blue-700" />
    <div className="min-w-0 flex-1">
      <div className="text-sm font-semibold break-words">
        {node.isComplement && 'NOT '}
        {node.label || node.uid}
      </div>
      <div className="font-mono text-xs break-all text-gray-500">{node.id}</div>
    </div>
  </div>
)

const EdgeItem: React.FC<{ hidden: HiddenEdge }> = ({ hidden: { edge, source, target } }) => (
  <div
    data-testid="hidden-edge"
    className="flex items-center gap-3 rounded-md border border-slate-300 bg-gray-50 p-3 hover:border-slate-400 hover:bg-white"
  >
    <span className="min-w-[24px] rounded-sm bg-slate-400 px-2 py-1 text-center text-xs font-semibold text-white">
      &rarr;
    </span>
    <div className="min-w-0 flex-1 font-mono text-sm break-words text-gray-500">
      {source?.label ?? edge.sourceId}
      {' —— '}
      {edge.label}
      {' ——> '}
      {target?.label ?? edge.targetId}
    </div>
  </div>
)

/**
 * The model's SAE errors: anything the model holds that the standard annotations
 * table doesn't show — individuals no row uses (on their own, or in a relation
 * the table can't show) and facts that are neither a row nor one of its extensions.
 */
const ModelErrorsPanel: React.FC = () => {
  const dispatch = useAppDispatch()
  const { hiddenNodes, standaloneNodes, relationNodes, hiddenEdges, total } =
    useAppSelector(selectModelErrors)

  const close = () => dispatch(setRightDrawerOpen(false))

  return (
    <div className="flex h-full flex-col bg-gray-100" data-testid="model-errors-panel">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white p-4">
        <h2 className="text-xl font-semibold">Errors</h2>
        <Button variant="subtle" color="gray" onClick={close}>
          Close
        </Button>
      </header>

      <div className="flex shrink-0 gap-4 border-b border-slate-300 bg-white px-6 py-4">
        <div className="min-w-[100px] flex-1 rounded-md border border-blue-700 bg-blue-700/10 p-3 text-center text-blue-700">
          <div className="text-2xl leading-none font-bold">{hiddenNodes.length}</div>
          <div className="mt-1 text-xs opacity-80">Nodes not in the table</div>
        </div>
        <div className="min-w-[100px] flex-1 rounded-md border border-amber-700 bg-amber-700/10 p-3 text-center text-amber-700">
          <div className="text-2xl leading-none font-bold">{hiddenEdges.length}</div>
          <div className="mt-1 text-xs opacity-80">Relations not in the table</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {total === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-gray-500">
            <FaCheck size={20} className="text-green-700" />
            No errors: the table shows everything in this model.
          </div>
        ) : (
          <div className="bg-white">
            <p className="m-0 border-b border-slate-300 px-6 py-3 text-xs text-gray-600">
              This model has content that isn't a standard annotation, so the table doesn't show it.
            </p>

            {hiddenNodes.length > 0 && (
              <section className="border-b border-slate-300 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-700 text-white">
                    <FaSitemap size={14} />
                  </div>
                  <h3 className="m-0 text-lg font-semibold">Nodes not shown</h3>
                  <Count value={hiddenNodes.length} />
                </div>

                {standaloneNodes.length > 0 && (
                  <div
                    data-testid="standalone-nodes"
                    className="mt-3 rounded-md border border-slate-300 bg-slate-50 p-3"
                  >
                    <div className="mb-2.5 flex items-center gap-2">
                      <FaEyeSlash size={16} className="text-slate-400" />
                      <h4 className="m-0 text-[13px] font-semibold text-slate-800">
                        Not used by any annotation
                      </h4>
                      <Count value={standaloneNodes.length} />
                    </div>
                    <div className="flex flex-col gap-2">
                      {standaloneNodes.map(node => (
                        <NodeItem key={node.uid} node={node} />
                      ))}
                    </div>
                  </div>
                )}

                {relationNodes.length > 0 && (
                  <div
                    data-testid="relation-nodes"
                    className="mt-3 rounded-md border border-slate-300 bg-slate-50 p-3"
                  >
                    <div className="mb-2.5 flex items-center gap-2">
                      <FaBan size={16} className="text-slate-400" />
                      <h4 className="m-0 text-[13px] font-semibold text-slate-800">
                        Only in a relation the table doesn't show
                      </h4>
                      <Count value={relationNodes.length} />
                    </div>
                    <div className="flex flex-col gap-2">
                      {relationNodes.map(node => (
                        <NodeItem key={node.uid} node={node} />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {hiddenEdges.length > 0 && (
              <section className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-700 text-white">
                    <FaLink size={14} />
                  </div>
                  <h3 className="m-0 text-lg font-semibold">Relations not shown</h3>
                  <Count value={hiddenEdges.length} />
                </div>
                <div className="mb-2 text-xs text-gray-500">
                  Neither an annotation's relation nor one of its extensions
                </div>
                <div className="flex flex-col gap-2">
                  {hiddenEdges.map(hidden => (
                    <EdgeItem key={hidden.edge.uid} hidden={hidden} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ModelErrorsPanel
