import React, { useState } from 'react';
import { Box, LinearProgress, useTheme } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAppContext } from '../../context/AppContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { state } = useAppContext();
  const { loading, error } = state;
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: sidebarOpen ? '240px' : '72px',
          right: 0,
          top: '72px',
          transition: theme.transitions.create(['left'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {loading && (
          <Box sx={{ width: '100%', position: 'absolute', top: 0, left: 0 }}>
            <LinearProgress color="primary" />
          </Box>
        )}
        {error && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'error.main',
              color: 'error.contrastText',
            }}
          >
            Error: {error}
          </Box>
        )}
        <Box
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: '1600px',
            '& > *': {
              pr: 3,
              pt: 3,
              pb: 3
            }
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout; 