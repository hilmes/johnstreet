export class PortfolioService {
  private initialized = false;
  private portfolioData: any = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.fetchPortfolioData();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize portfolio service:', error);
      throw error;
    }
  }

  async fetchPortfolioData(): Promise<any> {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/portfolio`);
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio data');
      }
      
      const data = await response.json();
      this.portfolioData = data;
      return this.portfolioData;
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      throw error;
    }
  }

  getPortfolioData(): any {
    return this.portfolioData;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
} 