import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { User } from '../user'

interface AuthState {
  user: User | null
  baristaToken: string | null
}

const initialState: AuthState = {
  user: null,
  baristaToken: null,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
    },
    setBaristaToken: (state, action: PayloadAction<string | null>) => {
      state.baristaToken = action.payload
    },
    /**
     * Pick which of the user's groups edits are attributed to (`provided-by`).
     * Defaults to the first group from Barista; the Model Details form can change it.
     */
    setUserGroup: (state, action: PayloadAction<string>) => {
      const group = state.user?.groups?.find(g => g.id === action.payload)
      if (state.user && group) {
        state.user.group = group
      }
    },
    logout: state => {
      state.user = null
      state.baristaToken = null
    },
  },
})

export const { setUser, setBaristaToken, setUserGroup, logout } = authSlice.actions

export const selectAuthUser = (state: { auth: AuthState }) => state.auth.user
export const selectBaristaToken = (state: { auth: AuthState }) => state.auth.baristaToken

export default authSlice.reducer
