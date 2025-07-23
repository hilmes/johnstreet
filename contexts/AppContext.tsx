'use client'

import React, { createContext, useContext, useReducer } from 'react'
import { AppState, AppAction } from '@/types'

const initialState: AppState = {
  loading: false,
  error: null,
  btcPrice: 0,
  allTimePnl: 0,
  uiState: 'idle',
  selectedPair: 'BTCUSD'
}

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
} | undefined>(undefined)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_BTC_PRICE':
      return { ...state, btcPrice: action.payload }
    case 'SET_ALL_TIME_PNL':
      return { ...state, allTimePnl: action.payload }
    case 'SET_UI_STATE':
      return { ...state, uiState: action.payload }
    case 'SET_SELECTED_PAIR':
      return { ...state, selectedPair: action.payload }
    default:
      return state
  }
}