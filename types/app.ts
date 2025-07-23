export interface AppState {
  loading: boolean;
  error: string | null;
  btcPrice: number;
  allTimePnl: number;
  uiState: 'idle' | 'loading' | 'error';
  selectedPair: string;
}

export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_BTC_PRICE'; payload: number }
  | { type: 'SET_ALL_TIME_PNL'; payload: number }
  | { type: 'SET_UI_STATE'; payload: AppState['uiState'] }
  | { type: 'SET_SELECTED_PAIR'; payload: string }; 