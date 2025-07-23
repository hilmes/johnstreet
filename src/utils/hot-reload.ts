declare const module: {
  hot?: {
    accept: (callback: () => void) => void;
    addStatusHandler: (callback: (status: string) => void) => void;
  };
};

export function setupHotReload() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const WS_PORT = process.env.REACT_APP_WS_PORT || '5004';
  const wsUrl = `ws://localhost:${WS_PORT}/ws`;
  console.log('Connecting to WebSocket server at:', wsUrl);
  
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10;
  let lastReloadTime = 0;
  const minReloadInterval = 500;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let isConnecting = false;
  let pingInterval: NodeJS.Timeout | null = null;

  // Set up HMR status handler
  if (module.hot) {
    module.hot.addStatusHandler((status) => {
      if (status === 'apply') {
        console.log('HMR update applying...');
      } else if (status === 'fail') {
        console.log('HMR update failed, performing full reload');
        window.location.reload();
      }
    });
  }

  function cleanup() {
    if (ws) {
      ws.close();
      ws = null;
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    isConnecting = false;
  }

  function connect() {
    if (isConnecting) {
      console.log('Connection attempt already in progress');
      return;
    }

    if (ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    cleanup();
    isConnecting = true;
    console.log('Attempting to connect to WebSocket server...');

    try {
      ws = new WebSocket(wsUrl);

      // Set up ping interval
      pingInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: 'ping' }));
          } catch (error) {
            console.error('Error sending ping:', error);
          }
        }
      }, 30000);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'reload') {
            const now = Date.now();
            if (now - lastReloadTime < minReloadInterval) {
              console.log('Skipping reload - too soon after last reload');
              return;
            }
            
            lastReloadTime = now;
            console.log(`Hot reload triggered by changes in: ${message.file}`);

            // Always do a full page reload for certain file types
            if (message.file.match(/\.(css|scss|json)$/)) {
              console.log('Style or configuration change detected, performing full reload');
              window.location.reload();
              return;
            }

            // For TypeScript/React files, try HMR first
            if (message.file.match(/\.(ts|tsx)$/)) {
              if (module.hot) {
                try {
                  // Try HMR
                  module.hot.accept(() => {
                    console.log('HMR update accepted');
                  });
                } catch (hmrError) {
                  console.error('HMR error:', hmrError);
                  console.log('HMR failed, falling back to full reload');
                  window.location.reload();
                }
              } else {
                // Fall back to full page reload if HMR is not available
                console.log('HMR not available, performing full reload');
                window.location.reload();
              }
            } else {
              // For other file types, do a full reload
              console.log('Non-HMR compatible file changed, performing full reload');
              window.location.reload();
            }
          } else if (message.type === 'server-restart') {
            console.log('Server restarted, performing full reload');
            window.location.reload();
          } else if (message.type === 'connected') {
            console.log('Successfully connected to development server');
          }
        } catch (error) {
          console.error('Error handling hot reload message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Development server disconnected. Attempting to reconnect...');
        cleanup();
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts - 1), 10000);
          reconnectTimeout = setTimeout(() => {
            console.log(`Reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
            connect();
          }, delay);
        } else {
          console.log('Max reconnection attempts reached. Please refresh the page manually.');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        cleanup();
      };

      ws.onopen = () => {
        console.log('Connected to development server');
        isConnecting = false;
        reconnectAttempts = 0;
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      cleanup();
      // Try to reconnect on connection error
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts - 1), 10000);
        reconnectTimeout = setTimeout(connect, delay);
      }
    }
  }

  // Initial connection
  connect();

  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (!ws || ws.readyState !== WebSocket.OPEN)) {
      console.log('Page became visible, checking connection...');
      connect();
    }
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
} 