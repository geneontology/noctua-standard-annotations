import type React from 'react'
import { useAppSelector } from '../hooks'
import { RightPanelTab, selectRightPanelTab } from '@/@noctua.core/components/drawer/drawerSlice'
import CommentsPanel from '@/features/annotations/components/CommentsPanel'

const RightDrawerContent: React.FC = () => {
  const activeTab = useAppSelector(selectRightPanelTab)

  switch (activeTab) {
    case RightPanelTab.COMMENTS:
    default:
      return <CommentsPanel />
  }
}

export default RightDrawerContent
