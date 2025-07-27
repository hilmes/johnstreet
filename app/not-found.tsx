import React from 'react'
import { Box, Typography, Button, Container } from '@mui/material'
import { SentimentVeryDissatisfied } from '@mui/icons-material'

export default function NotFound() {
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
        <SentimentVeryDissatisfied sx={{ fontSize: 80, color: '#ff9800', mb: 2 }} />
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          404
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
          Page Not Found
        </Typography>
        <Typography variant="body1" sx={{ color: '#888', mb: 4 }}>
          The page you're looking for doesn't exist or has been moved.
        </Typography>
        <Button
          variant="contained"
          href="/"
          sx={{
            bgcolor: '#00ff88',
            color: '#000',
            '&:hover': { bgcolor: '#00cc66' },
          }}
        >
          Go to Dashboard
        </Button>
      </Box>
    </Container>
  )
}