import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { spawn, ChildProcess } from 'child_process';
import chokidar from 'chokidar';
import path from 'path';

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ 
  server,
  path: '/ws',
  perMessageDeflate: false
});
const DEV_PORT = process.env.DEV_PORT ? parseInt(process.env.DEV_PORT) : 5004;
const API_PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 5003;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:4000', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

let serverProcess: ChildProcess | null = null;
let debounceTimer: NodeJS.Timeout | null = null;
let isRestarting = false;

// Start the main server process
function startServer() {
  if (isRestarting) {
    return;
  }

  isRestarting = true;

  if (serverProcess) {
    console.log('Stopping existing server process...');
    serverProcess.kill();
    serverProcess = null;
  }

  console.log('Starting server process...');
  serverProcess = spawn('ts-node', ['server/index.ts'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
      ...process.env,
      SERVER_PORT: API_PORT.toString(),
      NODE_ENV: 'development'
    }
  });

  serverProcess.stdout?.on('data', (data: Buffer) => {
    console.log('[Server]:', data.toString());
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    console.error('[Server Error]:', data.toString());
  });

  serverProcess.on('error', (error) => {
    console.error('Server process error:', error);
    isRestarting = false;
    // Attempt to restart server on error
    setTimeout(() => {
      console.log('Attempting to restart server after error...');
      startServer();
    }, 1000);
  });

  serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
    isRestarting = false;
    if (code !== 0 && !isRestarting) {
      // Attempt to restart server on non-zero exit
      setTimeout(() => {
        console.log('Attempting to restart server after exit...');
        startServer();
      }, 1000);
    }
  });

  setTimeout(() => {
    isRestarting = false;
  }, 5000);

  return serverProcess;
}

// Handle WebSocket connections
wss.on('connection', (ws: ExtendedWebSocket, req: any) => {
  console.log('Dev client connected from:', req.socket.remoteAddress);
  
  // Initialize connection state
  ws.isAlive = true;
  
  // Set up ping-pong for connection health check
  const pingInterval = setInterval(() => {
    if (!ws.isAlive) {
      console.log('Client connection is not alive, terminating');
      clearInterval(pingInterval);
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  }, 30000);

  // Send initial connection success message
  try {
    ws.send(JSON.stringify({ type: 'connected' }));
    
    // Send current server status
    ws.send(JSON.stringify({ 
      type: 'status',
      status: serverProcess ? 'running' : 'stopped'
    }));
  } catch (error) {
    console.error('Error sending initial messages:', error);
  }

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    ws.isAlive = false;
  });

  ws.on('close', () => {
    console.log('Dev client disconnected');
    ws.isAlive = false;
    clearInterval(pingInterval);
  });

  ws.on('pong', () => {
    // Reset connection health check
    ws.isAlive = true;
  });
});

// Notify all connected clients
function notifyClients(changedFile: string) {
  const relativePath = path.relative(process.cwd(), changedFile);
  console.log(`Notifying clients to refresh due to changes in: ${relativePath}`);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({ 
          type: 'reload',
          file: relativePath
        }));
      } catch (error) {
        console.error('Error sending reload message to client:', error);
      }
    }
  });
}

// Debounced reload function
function debouncedReload(filePath: string) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    notifyClients(filePath);
  }, 100);
}

// Watch for file changes with improved configuration
const watcher = chokidar.watch(['server/**/*.ts', 'src/**/*.{ts,tsx,css,scss,json}'], {
  ignored: [
    /(^|[\/\\])\../,    // Ignore dot files
    /node_modules/,      // Ignore node_modules
    /build/,            // Ignore build directory
    /dist/,             // Ignore dist directory
    /\.git/             // Ignore git directory
  ],
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 100
  },
  atomic: true
});

watcher.on('change', (path) => {
  console.log(`File ${path} has been changed`);
  
  if (path.startsWith('server/')) {
    // Restart server for server-side changes
    console.log('Server file changed, restarting server...');
    startServer();
    // Also notify clients of server restart
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ 
          type: 'server-restart',
          timestamp: Date.now()
        }));
      }
    });
  } else if (path.startsWith('src/')) {
    // Notify clients for frontend changes
    debouncedReload(path);
  }
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, cleaning up...');
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, cleaning up...');
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(0);
});

// Start the development server
server.listen(DEV_PORT, () => {
  console.log(`Development server running on port ${DEV_PORT}`);
  // Start the API server
  startServer();
}); 