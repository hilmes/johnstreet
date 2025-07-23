export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_BTC_PRICE'; payload: number }
  | { type: 'SET_ALL_TIME_PNL'; payload: number }
  | { type: 'SET_UI_STATE'; payload: 'idle' | 'loading' | 'error' }
  | { type: 'SET_SELECTED_PAIR'; payload: string }; 