import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface CandlestickChartProps {
  symbol: string;
  data: Array<{
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ data, symbol }) => {
  if (!data || data.length === 0) {
    return <div>Loading...</div>;
  }

  const formatPrice = (value: number) => value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(2);
  };

  const formatDate = (date: Date) => date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

  const chartData = data.map(d => ({
    ...d,
    date: formatDate(d.date),
    priceChange: d.close - d.open,
    color: d.close > d.open ? '#26a69a' : '#ef5350',
  }));

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <ResponsiveContainer>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis
            yAxisId="price"
            domain={['auto', 'auto']}
            tickFormatter={formatPrice}
          />
          <YAxis
            yAxisId="volume"
            orientation="right"
            tickFormatter={formatVolume}
          />
          <Tooltip
            labelFormatter={value => `Date: ${value}`}
            formatter={(value: any, name: string) => {
              if (name === 'volume') return [formatVolume(value), name];
              return [formatPrice(value), name];
            }}
          />
          <Legend />
          <Bar
            dataKey="volume"
            yAxisId="volume"
            fill="#8884d8"
            opacity={0.5}
          />
          <Line
            type="monotone"
            dataKey="close"
            yAxisId="price"
            stroke="#2196f3"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="high"
            yAxisId="price"
            stroke="#26a69a"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="low"
            yAxisId="price"
            stroke="#ef5350"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CandlestickChart; 