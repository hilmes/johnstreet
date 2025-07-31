'use client'

import { useState, useEffect } from 'react';

export interface PortfolioBalance {
  asset: string;
  balance: number;
  name: string;
  formatted: string;
}

export interface PortfolioData {
  balances: PortfolioBalance[];
  totalUSD: number;
  formatted: string;
  timestamp: string;
}

export interface SafetyStatus {
  emergencyStopActive: boolean;
  tradingMode: 'PAPER' | 'STAGING' | 'PRODUCTION';
  riskMetrics: {
    portfolioValue: number;
    dailyPnL: number;
    dailyPnLPct: number;
    openPositionsValue: number;
    openPositionsPct: number;
    availableMargin: number;
    isWithinLimits: boolean;
    violations: string[];
  };
  limits: {
    maxPositionSizePct: number;
    dailyLossLimitPct: number;
    maxLeverage: number;
    minOrderSizeUSD: number;
    maxOrderSizeUSD: number;
    tradingMode: string;
  };
  timestamp: string;
}

export interface DepositHistory {
  deposits: Array<{
    asset: string;
    amount: number;
    status: 'pending' | 'confirmed' | 'failed';
    confirmations: number;
    requiredConfirmations: number;
    txid?: string;
    time: Date;
  }>;
  count: number;
  asset: string;
  timestamp: string;
}

export function usePortfolioData(refreshInterval = 10000) {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus | null>(null);
  const [depositHistory, setDepositHistory] = useState<DepositHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolioData = async () => {
    try {
      const response = await fetch('/api/portfolio/balance?format=usd');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setPortfolioData(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching portfolio data:', err);
      setError(err.message || 'Failed to fetch portfolio data');
    }
  };

  const fetchSafetyStatus = async () => {
    try {
      const response = await fetch('/api/trading/safety');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setSafetyStatus(data);
    } catch (err: any) {
      console.error('Error fetching safety status:', err);
      // Don't set error for safety status to avoid blocking portfolio display
    }
  };

  const fetchDepositHistory = async () => {
    try {
      const response = await fetch('/api/deposits/history?limit=10');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setDepositHistory(data);
    } catch (err: any) {
      console.error('Error fetching deposit history:', err);
      // Don't set error for deposit history to avoid blocking portfolio display
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchPortfolioData(),
      fetchSafetyStatus(),
      fetchDepositHistory()
    ]);
    setLoading(false);
  };

  // Manual refresh function
  const refresh = () => {
    fetchAllData();
  };

  // Emergency stop function
  const triggerEmergencyStop = async (reason = 'Manual emergency stop') => {
    try {
      const response = await fetch('/api/trading/safety', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'emergency_stop',
          reason
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Refresh safety status immediately
      await fetchSafetyStatus();
      return data;
    } catch (err: any) {
      console.error('Error triggering emergency stop:', err);
      throw err;
    }
  };

  // Reset emergency stop function (requires admin key)
  const resetEmergencyStop = async (adminKey: string) => {
    try {
      const response = await fetch('/api/trading/safety', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset_emergency_stop',
          adminKey
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Refresh safety status immediately
      await fetchSafetyStatus();
      return data;
    } catch (err: any) {
      console.error('Error resetting emergency stop:', err);
      throw err;
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchAllData();

    // Set up interval for regular updates
    const interval = setInterval(() => {
      fetchAllData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return {
    portfolioData,
    safetyStatus,
    depositHistory,
    loading,
    error,
    refresh,
    triggerEmergencyStop,
    resetEmergencyStop
  };
}