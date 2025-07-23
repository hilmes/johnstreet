import React, { useEffect, useState } from 'react';
import { Chip } from '@mui/material';
import { useServices } from '../../context/ServicesContext';
import { WebSocketStatus as WSStatus } from '../../services/WebSocketService';

export const WebSocketStatus: React.FC = () => {
  const services = useServices();
  const [status, setStatus] = useState<WSStatus>({ connected: false });

  useEffect(() => {
    const subscription = services.ws.onStatusChange(setStatus);
    return () => {
      subscription.unsubscribe();
    };
  }, [services.ws]);

  return (
    <Chip
      label={status.connected ? 'Connected' : 'Disconnected'}
      color={status.connected ? 'success' : 'error'}
      size="small"
      title={status.error}
    />
  );
}; 