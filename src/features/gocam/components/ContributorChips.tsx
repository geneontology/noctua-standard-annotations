import type React from 'react'
import { FaUser } from 'react-icons/fa'
import { usePopover } from '@/@noctua.core/hooks/usePopover'
import AnchoredMenu, { MenuItem } from '@/@noctua.core/components/menu/AnchoredMenu'
import Chip from '@/@noctua.core/components/chip/Chip'
import type { Contributor } from '@/features/users/models/contributor'

const MAX_VISIBLE = 2

const SLATE_CHIP = 'border-slate-300 bg-slate-100 text-slate-800'
const SLATE_CIRCLE = 'border-slate-300 bg-slate-200 text-slate-600'

interface ContributorChipsProps {
  contributors: Contributor[]
}

const ContributorChips: React.FC<ContributorChipsProps> = ({ contributors }) => {
  const overflowMenu = usePopover()

  const visible = contributors.slice(0, MAX_VISIBLE)
  const hidden = contributors.slice(MAX_VISIBLE)

  return (
    <div className="flex grow items-center overflow-x-auto">
      <div className="flex flex-nowrap gap-2">
        {visible.map(contributor => (
          <Chip
            key={contributor.uri}
            icon={<FaUser size={11} />}
            chipClass={SLATE_CHIP}
            circleClass={SLATE_CIRCLE}
            className="max-w-[180px]"
          >
            {contributor.name ?? contributor.uri}
          </Chip>
        ))}

        {hidden.length > 0 && (
          <>
            <button
              className={`flex h-[26px] cursor-pointer items-center rounded-full border px-3 text-[11px] transition-shadow hover:shadow-sm hover:brightness-95 ${SLATE_CHIP}`}
              onClick={e => overflowMenu.open(e.currentTarget)}
            >
              +{hidden.length} more
            </button>
            <AnchoredMenu
              anchorEl={overflowMenu.anchor}
              open={overflowMenu.isOpen}
              onClose={overflowMenu.close}
            >
              {hidden.map(contributor => (
                <MenuItem key={contributor.uri} onClick={overflowMenu.close}>
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                      <FaUser size={11} />
                    </div>
                    <span>{contributor.name ?? contributor.uri}</span>
                  </div>
                </MenuItem>
              ))}
            </AnchoredMenu>
          </>
        )}
      </div>
    </div>
  )
}

export default ContributorChips
