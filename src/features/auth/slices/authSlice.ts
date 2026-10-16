import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { User } from '../user'

interface AuthState {
  user: User | null
  baristaToken: string | null
  /** Barista has answered for the current token (or there is none to check). */
  userChecked: boolean
}

const initialState: AuthState = {
  user: null,
  baristaToken: null,
  userChecked: false,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
      state.userChecked = true
    },
    setBaristaToken: (state, action: PayloadAction<string | null>) => {
      if (state.baristaToken !== action.payload) state.userChecked = !action.payload
      state.baristaToken = action.payload
    },
    /** The token couldn't be checked (Barista unreachable): go on with what we have. */
    setUserCheckFailed: state => {
      state.userChecked = true
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

export const { setUser, setBaristaToken, setUserCheckFailed, setUserGroup, logout } =
  authSlice.actions

export const selectAuthUser = (state: { auth: AuthState }) => state.auth.user
export const selectBaristaToken = (state: { auth: AuthState }) => state.auth.baristaToken
/** Whether the page knows who is logged in: no token, or Barista has answered for it. */
export const selectAuthResolved = (state: { auth: AuthState }) =>
  !state.auth.baristaToken || state.auth.userChecked

export default authSlice.reducer
