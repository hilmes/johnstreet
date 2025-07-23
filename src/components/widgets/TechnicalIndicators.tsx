import React from 'react';
import { Paper, Typography, Grid, Box } from '@mui/material';
import { useAppContext } from '../../context/AppContext';
import LoadingSpinner from '../common/LoadingSpinner';

interface Indicator {
  name: string;
  value: number | string;
  signal: 'buy' | 'sell' | 'neutral';
}

interface TechnicalIndicatorsProps {
  symbol: string;
}

const TechnicalIndicators: React.FC<TechnicalIndicatorsProps> = ({ symbol }) => {
  const { services } = useAppContext();
  const [indicators, setIndicators] = React.useState<Indicator[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchIndicators = async () => {
      try {
        // Implement real indicator calculations
        const dummyIndicators: Indicator[] = [
          { name: 'RSI (14)', value: 55.5, signal: 'neutral' },
          { name: 'MACD', value: 125.5, signal: 'buy' },
          { name: 'MA (50)', value: 39500, signal: 'sell' },
          { name: 'MA (200)', value: 38900, signal: 'buy' },
        ];
        setIndicators(dummyIndicators);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch indicators:', error);
      }
    };

    fetchIndicators();
    const interval = setInterval(fetchIndicators, 60000);
    return () => clearInterval(interval);
  }, [symbol, services]);

  if (loading) return <LoadingSpinner />;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Technical Indicators
      </Typography>
      <Grid container spacing={2}>
        {indicators.map((indicator) => (
          <Grid item xs={12} sm={6} key={indicator.name}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1,
                borderRadius: 1,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="body1">{indicator.name}</Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body1">
                  {typeof indicator.value === 'number'
                    ? indicator.value.toLocaleString()
                    : indicator.value}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color:
                      indicator.signal === 'buy'
                        ? 'success.main'
                        : indicator.signal === 'sell'
                        ? 'error.main'
                        : 'text.secondary',
                  }}
                >
                  {indicator.signal.toUpperCase()}
                </Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default TechnicalIndicators; 