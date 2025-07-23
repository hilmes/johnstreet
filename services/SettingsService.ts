import { 
  ApiSettings, 
  TradingSettings, 
  NotificationSettings,
  AppSettings 
} from '../types/settings';

const SETTINGS_KEY = 'johnstreet_settings';

const defaultSettings: AppSettings = {
  api: {
    apiKey: '',
    apiSecret: '',
    apiEndpoint: process.env.REACT_APP_API_URL || '',
    wsEndpoint: process.env.REACT_APP_WSS_URI || '',
  },
  trading: {
    defaultLeverage: 1,
    maxPositions: 5,
    maxDrawdown: 10,
    enableTrailingStop: false,
    defaultTrailingDistance: 1,
  },
  notifications: {
    enableEmailAlerts: false,
    enablePushNotifications: false,
    emailAddress: '',
    tradingAlerts: true,
    systemAlerts: true,
  },
};

export class SettingsService {
  private settings: AppSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): AppSettings {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
      return defaultSettings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return defaultSettings;
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  getApiSettings(): ApiSettings {
    return { ...this.settings.api };
  }

  getTradingSettings(): TradingSettings {
    return { ...this.settings.trading };
  }

  getNotificationSettings(): NotificationSettings {
    return { ...this.settings.notifications };
  }

  async updateApiSettings(settings: ApiSettings): Promise<void> {
    this.settings.api = { ...settings };
    this.saveSettings();
  }

  async updateTradingSettings(settings: TradingSettings): Promise<void> {
    this.settings.trading = { ...settings };
    this.saveSettings();
  }

  async updateNotificationSettings(settings: NotificationSettings): Promise<void> {
    this.settings.notifications = { ...settings };
    this.saveSettings();
  }

  async validateApiSettings(settings: ApiSettings): Promise<boolean> {
    try {
      // Implement API key validation logic here
      return true;
    } catch (error) {
      console.error('API settings validation failed:', error);
      return false;
    }
  }
} 