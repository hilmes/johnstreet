export * from './state';
export * from './actions';
export * from './trading';
export * from './websocket';
export * from './settings';

export interface MarketUpdate {
  price: number;
  volume: number;
  high24h: number;
  low24h: number;
  change24h: number;
}

export interface AppState {
  loading: boolean;
  error: string | null;
  btcPrice: number;
  allTimePnl: number;
  uiState: 'idle' | 'loading' | 'error';
  selectedPair: string;
}

export interface AppAction {
  type: string;
  payload?: any;
} 