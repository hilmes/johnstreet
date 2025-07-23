export interface AppState {
  loading: boolean;
  error: string | null;
  btcPrice: number;
  allTimePnl: number;
  uiState: 'idle' | 'loading' | 'error';
  selectedPair: string;
} 