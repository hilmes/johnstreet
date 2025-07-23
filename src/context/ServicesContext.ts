import { createContext, useContext } from 'react';
import { WebSocketService } from '../services/WebSocketService';
import { KrakenService } from '../services/KrakenService';
import { PortfolioService } from '../services/PortfolioService';
import { SettingsService } from '../services/SettingsService';

interface Services {
  ws: WebSocketService;
  kraken: KrakenService;
  portfolio: PortfolioService;
  settings: SettingsService;
}

const ServicesContext = createContext<Services | undefined>(undefined);

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error('useServices must be used within ServicesProvider');
  }
  return context;
};

export default ServicesContext; 