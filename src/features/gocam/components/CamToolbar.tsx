import type React from 'react'
import { useMemo } from 'react'
import { ActionIcon, Tooltip } from '@mantine/core'
import {
  FaCalendarDay,
  FaCheck,
  FaComment,
  FaExclamationTriangle,
  FaPen,
  FaTasks,
} from 'react-icons/fa'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { selectCamModel } from '@/features/gocam/slices/camSlice'
import { selectBaristaToken, selectAuthUser } from '@/features/auth/slices/authSlice'
import { openDialog, DialogComponent } from '@/@noctua.core/components/dialog/dialogSlice'
import {
  RightPanelTab,
  setRightDrawerOpen,
  setRightPanelTab,
} from '@/@noctua.core/components/drawer/drawerSlice'
import { selectModelErrors } from '@/features/annotations/slices/annotationsSlice'
import Chip from '@/@noctua.core/components/chip/Chip'
import { useModelUrls } from '../hooks/useModelUrls'
import { getStateColor } from '../data/stateColors'
import ContributorChips from './ContributorChips'
import { useGroupGuard } from './GroupGuardProvider'
import ToolbarLinkMenu from './ToolbarLinkMenu'

/**
 * Model header: title, the error count (anything in the model the annotations
 * table doesn't show), model comments, state, date, contributors, and the
 * VIEW / EXPORT AS link menus. As in the VPE (#94), each control opens its
 * own form: Edit Title, Model Comments, Change State; the date and contributor
 * chips open Model Details (group and summary). Edits go through the group guard.
 * Logged out, the title and state can't be edited and the comments open read-only.
 */
const CamToolbar: React.FC = () => {
  const dispatch = useAppDispatch()
  const cam = useAppSelector(selectCamModel)
  const baristaToken = useAppSelector(selectBaristaToken)
  const isLoggedIn = !!useAppSelector(selectAuthUser)
  const urls = useModelUrls(cam?.id, baristaToken)
  const checkGroup = useGroupGuard()
  const totalErrors = useAppSelector(selectModelErrors).total

  const open = (
    component: DialogComponent,
    title: string,
    size: 'xs' | 'sm',
    bodyScroll: 'auto' | 'none' = 'auto'
  ) => dispatch(openDialog({ component, title, size, bodyScroll }))

  const openTitleForm = () =>
    checkGroup(() => open(DialogComponent.CAM_TITLE_FORM, 'Edit Title', 'sm'))
  const openStateForm = () =>
    checkGroup(() => open(DialogComponent.CAM_STATE_FORM, 'Change State', 'xs'))
  const openCommentsForm = () =>
    checkGroup(() => open(DialogComponent.CAM_COMMENTS_FORM, 'Model Comments', 'sm', 'none'))
  const openDetails = () => open(DialogComponent.CAM_DETAILS_FORM, 'Model Details', 'sm', 'none')
  const openErrors = () => {
    dispatch(setRightPanelTab(RightPanelTab.MODEL_ERRORS))
    dispatch(setRightDrawerOpen(true))
  }

  const viewItems = useMemo(
    () => [
      { label: 'Annotation Preview', href: urls?.annotationPreview },
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
            {cam.title || <span className="text-gray-400 italic">Untitled</span>}
          </span>
          {isLoggedIn && (
            <button
              data-testid="edit-model-title"
              aria-label="Edit model title"
              className="text-gray-500 hover:text-gray-800 focus:outline-hidden"
              onClick={openTitleForm}
            >
              <FaPen size={12} />
            </button>
          )}
        </div>
      </Tooltip>

      <Chip
        icon={totalErrors > 0 ? <FaExclamationTriangle size={12} /> : <FaCheck size={12} />}
        chipClass={
          totalErrors > 0
            ? 'border-red-300 bg-red-100 text-red-900'
            : 'border-green-300 bg-green-100 text-green-900'
        }
        circleClass={
          totalErrors > 0
            ? 'border-red-300 bg-red-200 text-red-700'
            : 'border-green-300 bg-green-200 text-green-700'
        }
        onClick={openErrors}
      >
        {totalErrors} {totalErrors === 1 ? 'Error' : 'Errors'} Found
      </Chip>

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
            onClick={openCommentsForm}
            aria-label="Model comments"
          >
            <FaComment size={16} />
            {/* Always shown, 0 included, as the Angular toolbar did. */}
            <span className="absolute top-0 right-0 rounded-md bg-green-700 px-1 py-px text-[10px] font-medium text-white">
              {commentCount}
            </span>
          </ActionIcon>
        </Tooltip>
      </div>

      {cam.state && (
        <Chip
          icon={<FaTasks size={12} />}
          chipClass={`${stateColor.chip} capitalize`}
          circleClass={stateColor.circle}
          onClick={isLoggedIn ? openStateForm : undefined}
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

      <ContributorChips contributors={cam.contributors || []} onClick={openDetails} />

      <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
        <ToolbarLinkMenu label="VIEW" items={viewItems} />
        <ToolbarLinkMenu label="EXPORT AS" items={exportItems} />
      </div>
    </div>
  )
}

export default CamToolbar
