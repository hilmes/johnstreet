import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Box,
  useTheme,
  alpha,
  Typography,
} from '@mui/material';
import {
  Home,
  Dashboard,
  ShowChart,
  Compare,
  AccountBalance,
  Settings,
  Analytics,
  TrendingUp,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const drawerWidth = 240;
const closedWidth = 72;

const menuItems = [
  { text: 'HOME', icon: <Home />, path: '/' },
  { text: 'DASHBOARD', icon: <Dashboard />, path: '/dashboard' },
  { text: 'TRADING', icon: <ShowChart />, path: '/trading' },
  { text: 'PAIRS', icon: <Compare />, path: '/pairs' },
  { text: 'PORTFOLIO', icon: <AccountBalance />, path: '/portfolio' },
  { text: 'STRATEGY', icon: <TrendingUp />, path: '/strategy' },
  { text: 'ANALYTICS', icon: <Analytics />, path: '/analytics' },
  { text: 'SETTINGS', icon: <Settings />, path: '/settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const handleNavigation = (path: string) => {
    navigate(path);
    if (!open) {
      onClose();
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : closedWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : closedWidth,
          boxSizing: 'border-box',
          backgroundColor: theme.palette.background.default,
          borderRight: 'none',
          position: 'fixed',
          left: 0,
          overflowX: 'hidden',
          transition: theme.transitions.create(['width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      <Box sx={{ height: '100%', pt: '72px' }}>
        <List sx={{ p: 0 }}>
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem
                key={item.text}
                disablePadding
                sx={{
                  mb: index < menuItems.length - 1 ? 1 : 0,
                }}
              >
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    height: 48,
                    px: 2,
                    backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                    '&:hover': {
                      backgroundColor: isActive
                        ? alpha(theme.palette.primary.main, 0.16)
                        : alpha(theme.palette.primary.main, 0.08),
                    },
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    borderRadius: '0 24px 24px 0',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                      mr: open ? 2 : 'auto',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={
                        <Typography
                          sx={{
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                          }}
                        >
                          {item.text}
                        </Typography>
                      }
                    />
                  )}
                  {isActive && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 4,
                        height: 24,
                        backgroundColor: theme.palette.primary.main,
                        borderRadius: '0 4px 4px 0',
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 