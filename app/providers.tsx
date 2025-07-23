'use client'

import React from 'react'
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { SnackbarProvider } from 'notistack'
import { ThemeProvider } from '@/contexts/ThemeContext'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6563FF',
      light: '#8785FF',
      dark: '#4340FF',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF4F00',
      light: '#FF7433',
      dark: '#CC3F00',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#000000',
      paper: '#111111',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#CCCCCC',
    },
    error: {
      main: '#FF4F00',
    },
    success: {
      main: '#00CC66',
    },
    divider: '#333333',
    action: {
      hover: '#1A1A1A',
      selected: '#222222',
      disabled: '#666666',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '0em',
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '0.02em',
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '0.02em',
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      letterSpacing: '0.02em',
      lineHeight: 1.4,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '12px 24px',
          minHeight: '48px',
          boxShadow: 'none',
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 12px rgba(101, 99, 255, 0.2)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#111111',
          boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          border: '1px solid #333333',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#111111',
          boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          border: '1px solid #333333',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#1A1A1A',
            '& fieldset': {
              borderColor: '#333333',
            },
            '&:hover fieldset': {
              borderColor: '#6563FF',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#6563FF',
            },
          },
        },
      },
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          {children}
        </SnackbarProvider>
      </MuiThemeProvider>
    </ThemeProvider>
  )
}