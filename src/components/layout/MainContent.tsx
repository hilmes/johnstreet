import React from 'react';
import { Box } from '@mui/material';
import { Routes, Route } from 'react-router-dom';
import HomeScreen from '../screens/HomeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TradingScreen from '../screens/TradingScreen';
import PairsScreen from '../screens/PairsScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import StrategiesScreen from '../screens/StrategiesScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import SettingsScreen from '../screens/SettingsScreen';

const MainContent: React.FC = () => {
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 2,
        marginTop: '64px',
        marginLeft: '240px',
        backgroundColor: 'background.default',
        minHeight: 'calc(100vh - 64px)',
      }}
    >
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/dashboard" element={<DashboardScreen />} />
        <Route path="/trading" element={<TradingScreen />} />
        <Route path="/pairs" element={<PairsScreen />} />
        <Route path="/portfolio" element={<PortfolioScreen />} />
        <Route path="/strategies" element={<StrategiesScreen />} />
        <Route path="/analysis" element={<AnalysisScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
    </Box>
  );
};

export default MainContent; 