import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useAppContext } from '../../context/AppContext';

const AnalysisScreen: React.FC = () => {
  const { state, services } = useAppContext();
  const { selectedPair } = state;
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  return (
    <Box>
      <h1>Analysis Screen</h1>
      <p>Selected Pair: {selectedPair}</p>
      {loading && <div>Loading...</div>}
      {chartData.length > 0 && (
        <div>Chart Data: {JSON.stringify(chartData)}</div>
      )}
    </Box>
  );
};

export default AnalysisScreen; 