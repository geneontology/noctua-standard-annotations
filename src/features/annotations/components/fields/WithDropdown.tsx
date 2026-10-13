import type React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { ActionIcon, Autocomplete, Button, Select } from '@mantine/core'
import AnchoredPopover from '@/@noctua.core/components/popover/AnchoredPopover'
import { FaPlus, FaRegTrashAlt } from 'react-icons/fa'
import { withFromAllowedDBs, DB_NONE } from '../../data/allowedDatabases'
import { useAppSelector } from '@/app/hooks'
import { selectModelWiths } from '@/features/gocam/slices/camSlice'

interface WithEntity {
  db: string
  accession: string
}

interface WithGroup {
  entities: WithEntity[]
}

interface WithDropdownProps {
  anchorEl: HTMLElement | null
  currentValue: string
  onClose: () => void
  onSave: (value: string) => void
}
// Case-insensitive sort so lowercase-initial prefixes (e.g. "dictyBase") aren't
// pushed past the uppercase ones; DB_NONE stays pinned first.
const dbOptions = [
  DB_NONE,
  ...withFromAllowedDBs
    .slice()
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
]

/** Parse existing with/from value into groups */
function parseWithValue(value: string): WithGroup[] {
  if (!value?.trim()) {
    return [{ entities: [{ db: DB_NONE, accession: '' }] }]
  }

  const groups = value.split(',').map(groupStr => {
    const entities = groupStr
      .trim()
      .split('|')
      .filter(s => s.trim())
      .map(entityStr => {
        const trimmed = entityStr.trim()
        const colonIdx = trimmed.indexOf(':')
        if (colonIdx === -1) return { db: DB_NONE, accession: trimmed }
        return {
          db: trimmed.slice(0, colonIdx).trim() || DB_NONE,
          accession: trimmed.slice(colonIdx + 1).trim(),
        }
      })

    return { entities: entities.length > 0 ? entities : [{ db: DB_NONE, accession: '' }] }
  })

  return groups.length > 0 ? groups : [{ entities: [{ db: DB_NONE, accession: '' }] }]
}

const WithDropdown: React.FC<WithDropdownProps> = ({
  anchorEl,
  currentValue,
  onClose,
  onSave,
}) => {
  const [groups, setGroups] = useState<WithGroup[]>(() => parseWithValue(currentValue))

  const modelWiths = useAppSelector(selectModelWiths)
  const accessionsByDb = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const raw of modelWiths) {
      for (const token of raw.split(/[|,]/)) {
        const t = token.trim()
        if (!t) continue
        const colonIdx = t.indexOf(':')
        if (colonIdx === -1) continue
        const db = t.slice(0, colonIdx).trim()
        const acc = t.slice(colonIdx + 1).trim()
        if (!db || !acc) continue
        if (!map.has(db)) map.set(db, new Set())
        map.get(db)!.add(acc)
      }
    }
    return map
  }, [modelWiths])

  // Re-parse when opened with a different value
  useEffect(() => {
    if (anchorEl) {
      setGroups(parseWithValue(currentValue))
    }
  }, [anchorEl, currentValue])

  const updateEntity = (groupIdx: number, entityIdx: number, field: keyof WithEntity, value: string) => {
    setGroups(prev => {
      const next = prev.map((g, gi) =>
        gi === groupIdx
          ? {
              entities: g.entities.map((e, ei) =>
                ei === entityIdx ? { ...e, [field]: value } : e
              ),
            }
          : g
      )
      return next
    })
  }

  const addEntity = (groupIdx: number) => {
    setGroups(prev =>
      prev.map((g, gi) =>
        gi === groupIdx
          ? { entities: [...g.entities, { db: DB_NONE, accession: '' }] }
          : g
      )
    )
  }

  const deleteEntity = (groupIdx: number, entityIdx: number) => {
    setGroups(prev =>
      prev.map((g, gi) =>
        gi === groupIdx
          ? { entities: g.entities.filter((_, ei) => ei !== entityIdx) }
          : g
      )
    )
  }

  const addGroup = () => {
    setGroups(prev => [...prev, { entities: [{ db: DB_NONE, accession: '' }] }])
  }

  const deleteGroup = (groupIdx: number) => {
    setGroups(prev => prev.filter((_, gi) => gi !== groupIdx))
  }

  const handleSave = () => {
    const result = groups
      .map(group =>
        group.entities
          .filter(e => e.db !== DB_NONE && e.accession.trim())
          .map(e => `${e.db}:${e.accession.trim()}`)
          .join('|')
      )
      .filter(s => s.length > 0)
      .join(',')

    onSave(result)
    onClose()
  }

  return (
    <AnchoredPopover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      placement="bottom-end"
      className="!bg-accent-50 !shadow-lg"
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <div
        className="flex w-full flex-col items-stretch justify-start px-2 py-2"
        style={{ minWidth: 380, maxHeight: 400 }}
      >
        <div className="flex-1 overflow-y-auto">
          {groups.map((group, gi) => (
            <div key={gi} className="mb-4 px-3">
              <div className="mb-2 flex flex-row items-center justify-start">
                <strong className="mr-2 text-sm">With/From</strong>
                <ActionIcon variant="subtle" color="gray" size="md" onClick={() => deleteGroup(gi)} title="Delete Group">
                  <FaRegTrashAlt size={12} />
                </ActionIcon>
              </div>
              {group.entities.map((entity, ei) => (
                <div
                  key={ei}
                  className="mb-2 flex flex-row items-center justify-start"
                >
                  <Select
                    size="xs"
                    value={entity.db}
                    onChange={value => value && updateEntity(gi, ei, 'db', value)}
                    data={dbOptions.map(d => ({ value: d, label: d }))}
                    allowDeselect={false}
                    maxDropdownHeight={300}
                    className="mr-3 w-[120px]"
                  />
                  <Autocomplete
                    size="xs"
                    placeholder="Accession"
                    value={entity.accession}
                    onChange={val => updateEntity(gi, ei, 'accession', val)}
                    data={Array.from(accessionsByDb.get(entity.db) ?? [])}
                    limit={10}
                    className="flex-1"
                  />
                  <ActionIcon variant="subtle" color="gray" size="md" onClick={() => addEntity(gi)} title="Add Entity">
                    <FaPlus size={12} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="md"
                    onClick={() => deleteEntity(gi, ei)}
                    title="Delete Entity"
                  >
                    <FaRegTrashAlt size={12} />
                  </ActionIcon>
                </div>
              ))}
              {group.entities.length === 0 && (
                <div className="p-4">
                  <button
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => addEntity(gi)}
                  >
                    Add With/From
                  </button>
                </div>
              )}
            </div>
          ))}
          <Button variant="subtle" size="xs" onClick={addGroup}>
            Add Group
          </Button>
        </div>
        <div className="flex w-full flex-row items-center justify-end pt-2">
          <Button variant="subtle" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="filled" size="xs" onClick={handleSave}>
            Ok
          </Button>
        </div>
      </div>
    </AnchoredPopover>
  )
}

export default WithDropdown
