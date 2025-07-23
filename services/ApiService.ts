import CryptoJS from 'crypto-js';

export class ApiService {
  private readonly API_URL = '/api';
  private readonly API_VERSION = '0';
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly requestTimeout = 10000; // 10 seconds

  constructor() {
    this.apiKey = process.env.REACT_APP_KRAKEN_API_KEY || '';
    this.apiSecret = process.env.REACT_APP_KRAKEN_API_SECRET || '';
  }

  private getSignature(path: string, data: string, nonce: string): string {
    if (!this.apiSecret) {
      return '';
    }
    const message = nonce + data;
    const secret = CryptoJS.enc.Base64.parse(this.apiSecret);
    const hash = CryptoJS.SHA256(message);
    const hmac = CryptoJS.HmacSHA512(
      path + hash.toString(CryptoJS.enc.Hex),
      secret
    );
    return hmac.toString(CryptoJS.enc.Base64);
  }

  async get<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${window.location.origin}${this.API_URL}/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  async post<T>(endpoint: string, data: Record<string, any>): Promise<T> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API keys not configured');
    }

    const path = `/${this.API_VERSION}/private/${endpoint}`;
    const nonce = Date.now().toString();
    
    const postData = new URLSearchParams();
    postData.append('nonce', nonce);
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        postData.append(key, String(value));
      }
    });

    const signature = this.getSignature(path, postData.toString(), nonce);

    const response = await fetch(`${window.location.origin}${this.API_URL}${path}`, {
      method: 'POST',
      headers: {
        'API-Key': this.apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: postData,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }
} 