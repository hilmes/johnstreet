import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { WebSocketService } from '../services/WebSocketService';
import { KrakenService } from '../services/KrakenService';
import { PortfolioService } from '../services/PortfolioService';
import { SettingsService } from '../services/SettingsService';
import { AppState, AppAction } from '../types';

const initialState: AppState = {
  loading: true,
  error: null,
  btcPrice: 0,
  allTimePnl: 0,
  uiState: 'idle',
  selectedPair: 'BTCUSD'
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  services: {
    ws: WebSocketService;
    kraken: KrakenService;
    portfolio: PortfolioService;
    settings: SettingsService;
  };
} | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const settingsService = new SettingsService();

  const services = {
    ws: new WebSocketService(),
    kraken: new KrakenService(),
    portfolio: new PortfolioService(),
    settings: settingsService,
  };

  useEffect(() => {
    const initializeServices = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        // Initialize services
        await services.ws.connect();
        await services.portfolio.initialize();

        // Subscribe to ticker updates
        const subscription = services.ws.subscribe('ticker', (data) => {
          console.log('Received ticker update:', data);
          if (data && data.symbol === 'XBT/USD') {
            dispatch({ type: 'SET_BTC_PRICE', payload: data.price });
          }
        });

        // Clean up subscription
        return () => {
          subscription.unsubscribe();
        };
      } catch (error: any) {
        dispatch({ type: 'SET_ERROR', payload: error?.message || 'An unknown error occurred' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeServices();

    // Cleanup function
    return () => {
      services.ws.disconnect();
    };
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, services }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

function appReducer(state: AppState, action: AppAction): AppState {
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
} 