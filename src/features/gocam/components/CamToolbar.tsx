import type React from 'react'
import { useMemo } from 'react'
import { ActionIcon, Tooltip } from '@mantine/core'
import { FaCalendarDay, FaComment, FaPen, FaTasks } from 'react-icons/fa'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { selectCamModel } from '@/features/gocam/slices/camSlice'
import { selectBaristaToken, selectAuthUser } from '@/features/auth/slices/authSlice'
import { openDialog, DialogComponent } from '@/@noctua.core/components/dialog/dialogSlice'
import Chip from '@/@noctua.core/components/chip/Chip'
import { useModelUrls } from '../hooks/useModelUrls'
import { getStateColor } from '../data/stateColors'
import ContributorChips from './ContributorChips'
import ToolbarLinkMenu from './ToolbarLinkMenu'

/**
 * Model header: title, model comments, state, date, contributors, and the
 * VIEW IN / EXPORT AS link menus. Title, comments and state all open the one
 * Model Details form, as the Angular cam toolbar did.
 */
const CamToolbar: React.FC = () => {
  const dispatch = useAppDispatch()
  const cam = useAppSelector(selectCamModel)
  const baristaToken = useAppSelector(selectBaristaToken)
  const isLoggedIn = !!useAppSelector(selectAuthUser)
  const urls = useModelUrls(cam?.id, baristaToken)

  const openDetails = () => {
    dispatch(
      openDialog({
        component: DialogComponent.CAM_DETAILS_FORM,
        title: 'Model Details',
        size: 'sm',
        bodyScroll: 'none',
      })
    )
  }

  const viewInItems = useMemo(
    () => [
      { label: 'Annotation Preview', href: urls?.annotationPreview },
      { label: 'Pathway Viewer', href: urls?.pathwayViewer },
      { label: 'Graph Editor', href: urls?.graphEditor },
    ],
    [urls]
  )

  const exportItems = useMemo(
    () => [
      { label: 'GPAD', href: urls?.gpad },
      { label: 'OWL', href: urls?.owl },
    ],
    [urls]
  )

  if (!cam) return null

  const commentCount = cam.comments.length
  const stateColor = getStateColor(cam.state)

  return (
    <div className="flex h-10 w-full shrink-0 items-center gap-2 bg-white px-3 text-xs shadow-md">
      <Tooltip label={cam.title || 'No title'} withArrow openDelay={500} position="bottom">
        <div className="flex h-full max-w-[320px] items-center border-r border-gray-200 pr-3">
          <span data-testid="model-title" className="grow truncate pr-2 text-gray-800">
            <span className="mr-1 font-semibold text-gray-900">Title:</span>
            {cam.title || <span className="italic text-gray-400">Untitled</span>}
          </span>
          <button
            data-testid="edit-model-title"
            aria-label={isLoggedIn ? 'Edit model details' : 'View model details'}
            className="text-gray-500 hover:text-gray-800 focus:outline-hidden"
            onClick={openDetails}
          >
            <FaPen size={12} />
          </button>
        </div>
      </Tooltip>

      <div className="flex h-full items-center border-r border-gray-200 pr-1">
        <Tooltip
          label={
            commentCount > 0
              ? `${commentCount} model comment${commentCount > 1 ? 's' : ''}`
              : 'No model comments'
          }
          position="bottom"
          withArrow
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            className="text-gray-600 hover:text-gray-900"
            onClick={openDetails}
            aria-label="Model comments"
          >
            <FaComment size={16} />
            {commentCount > 0 && (
              <span className="absolute right-0 top-0 rounded-md bg-green-700 px-1 py-px text-[10px] font-medium text-white">
                {commentCount}
              </span>
            )}
          </ActionIcon>
        </Tooltip>
      </div>

      {cam.state && (
        <Chip
          icon={<FaTasks size={12} />}
          chipClass={`${stateColor.chip} capitalize`}
          circleClass={stateColor.circle}
          onClick={openDetails}
          trailing={isLoggedIn ? <FaPen size={9} className="mr-1 opacity-60" /> : undefined}
        >
          {cam.state.replace(/_/g, ' ')}
        </Chip>
      )}

      {cam.date && (
        <Chip
          icon={<FaCalendarDay size={12} />}
          chipClass="border-sky-300 bg-sky-100 text-sky-900"
          circleClass="border-sky-300 bg-sky-200 text-sky-700"
          onClick={openDetails}
        >
          {cam.date}
        </Chip>
      )}

      <ContributorChips contributors={cam.contributors || []} />

      <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
        <ToolbarLinkMenu label="VIEW IN" items={viewInItems} />
        <ToolbarLinkMenu label="EXPORT AS" items={exportItems} />
      </div>
    </div>
  )
}

export default CamToolbar
