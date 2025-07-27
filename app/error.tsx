'use client'

import React, { useEffect } from 'react'
import { Box, Typography, Button, Container } from '@mui/material'
import { ErrorOutline } from '@mui/icons-material'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          bgcolor: '#0a0a0a',
          color: 'white',
        }}
      >
        <ErrorOutline sx={{ fontSize: 80, color: '#ff6b6b', mb: 2 }} />
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Something went wrong!
        </Typography>
        <Typography variant="body1" sx={{ color: '#888', mb: 4 }}>
          An error occurred while loading this page.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={reset}
            sx={{
              bgcolor: '#00ff88',
              color: '#000',
              '&:hover': { bgcolor: '#00cc66' },
            }}
          >
            Try again
          </Button>
          <Button
            variant="outlined"
            href="/"
            sx={{
              borderColor: '#00ff88',
              color: '#00ff88',
              '&:hover': { borderColor: '#00cc66', bgcolor: '#0a2a1a' },
            }}
          >
            Go home
          </Button>
        </Box>
        {process.env.NODE_ENV === 'development' && (
          <Box sx={{ mt: 4, p: 2, bgcolor: '#1a1a1a', borderRadius: 1, textAlign: 'left' }}>
            <Typography variant="caption" sx={{ color: '#ff6b6b', fontFamily: 'monospace' }}>
              {error.message}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  )
}