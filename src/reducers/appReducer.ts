import { AppState } from '../types';
import { AppAction } from '../types';

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_BTC_PRICE':
      return { ...state, btcPrice: action.payload };
    case 'SET_ALL_TIME_PNL':
      return { ...state, allTimePnl: action.payload };
    case 'SET_UI_STATE':
      return { ...state, uiState: action.payload };
    case 'SET_SELECTED_PAIR':
      return { ...state, selectedPair: action.payload };
    default:
      return state;
  }
}; 