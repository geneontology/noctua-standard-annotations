import type React from 'react'
import { useAppSelector } from '../hooks'
import { RightPanelTab, selectRightPanelTab } from '@/@noctua.core/components/drawer/drawerSlice'
import CommentsPanel from '@/features/annotations/components/CommentsPanel'
import ModelErrorsPanel from '@/features/annotations/components/ModelErrorsPanel'

const RightDrawerContent: React.FC = () => {
  const activeTab = useAppSelector(selectRightPanelTab)

  switch (activeTab) {
    case RightPanelTab.MODEL_ERRORS:
      return <ModelErrorsPanel />
    case RightPanelTab.COMMENTS:
    default:
      return <CommentsPanel />
  }
}

export default RightDrawerContent
