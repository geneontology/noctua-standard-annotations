import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store/store'

export enum RightPanelTab {
  COMMENTS = 'comments',
}

interface DrawerState {
  rightDrawerOpen: boolean
  rightPanelTab: RightPanelTab
}

const initialState: DrawerState = {
  rightDrawerOpen: false,
  rightPanelTab: RightPanelTab.COMMENTS,
}

export const drawerSlice = createSlice({
  name: 'drawer',
  initialState,
  reducers: {
    setRightDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.rightDrawerOpen = action.payload
    },
    setRightPanelTab: (state, action: PayloadAction<RightPanelTab>) => {
      state.rightPanelTab = action.payload
    },
  },
})

export const { setRightDrawerOpen, setRightPanelTab } = drawerSlice.actions

export const selectRightDrawerOpen = (state: RootState) => state.drawer.rightDrawerOpen
export const selectRightPanelTab = (state: RootState) => state.drawer.rightPanelTab

export default drawerSlice.reducer
