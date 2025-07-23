export interface ApiSettings {
  apiKey: string;
  apiSecret: string;
  apiEndpoint: string;
  wsEndpoint: string;
}

export interface TradingSettings {
  defaultLeverage: number;
  maxPositions: number;
  maxDrawdown: number;
  enableTrailingStop: boolean;
  defaultTrailingDistance: number;
}

export interface NotificationSettings {
  enableEmailAlerts: boolean;
  enablePushNotifications: boolean;
  emailAddress: string;
  tradingAlerts: boolean;
  systemAlerts: boolean;
}

export interface AppSettings {
  api: ApiSettings;
  trading: TradingSettings;
  notifications: NotificationSettings;
} 