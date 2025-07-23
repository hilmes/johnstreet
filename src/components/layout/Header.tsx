import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { useAppContext } from '../../context/AppContext';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, sidebarOpen }) => {
  const { state } = useAppContext();
  const { btcPrice, allTimePnl } = state;
  const theme = useTheme();

  return (
    <AppBar position="fixed">
      <Toolbar
        sx={{
          height: 72,
          px: 3,
          gap: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <IconButton
            color="inherit"
            aria-label={sidebarOpen ? "close drawer" : "open drawer"}
            onClick={onMenuClick}
            edge="start"
            sx={{
              width: 48,
              height: 48,
              '&:hover': {
                backgroundColor: theme.palette.secondary.main,
              },
            }}
          >
            {sidebarOpen ? <MenuOpenIcon /> : <MenuIcon />}
          </IconButton>
          <Typography
            variant="h5"
            component="div"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            JOHNSTREET
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            gap: 4,
            ml: 'auto',
            '& > div': {
              minWidth: 200,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              px: 3,
              border: '1px solid',
              borderColor: alpha(theme.palette.common.white, 0.12),
            },
          }}
        >
          <Box>
            <Typography
              component="span"
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                mr: 2,
                opacity: 0.7,
              }}
            >
              BTC/USD
            </Typography>
            <Typography
              component="span"
              sx={{
                fontFamily: 'Helvetica Neue',
                fontSize: '1rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              ${btcPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
          </Box>

          <Box>
            <Typography
              component="span"
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                mr: 2,
                opacity: 0.7,
              }}
            >
              P&L
            </Typography>
            <Typography
              component="span"
              sx={{
                fontFamily: 'Helvetica Neue',
                fontSize: '1rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: allTimePnl >= 0
                  ? theme.palette.success.main
                  : theme.palette.error.main,
              }}
            >
              ${allTimePnl.toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 