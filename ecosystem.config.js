module.exports = {
  apps: [
    {
      name: 'johnstreet-nextjs',
      script: 'npm',
      args: 'run dev',
      cwd: '/Users/hilmes/Projects/johnstreet',
      env: {
        PORT: 3005,
        NODE_ENV: 'development'
      },
      watch: false,
      ignore_watch: ['node_modules', '.next', '.git'],
      max_memory_restart: '1G',
      error_file: './logs/nextjs-error.log',
      out_file: './logs/nextjs-out.log',
      log_file: './logs/nextjs-combined.log',
      time: true
    },
    {
      name: 'johnstreet-websocket',
      script: 'npm',
      args: 'run ws:server',
      cwd: '/Users/hilmes/Projects/johnstreet',
      env: {
        PORT: 3006,
        NODE_ENV: 'development',
        WS_PORT: 3006
      },
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_memory_restart: '500M',
      error_file: './logs/websocket-error.log',
      out_file: './logs/websocket-out.log',
      log_file: './logs/websocket-combined.log',
      time: true
    },
    {
      name: 'johnstreet-python',
      script: 'npm',
      args: 'run server:python',
      cwd: '/Users/hilmes/Projects/johnstreet',
      env: {
        PYTHONUNBUFFERED: '1'
      },
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/python-error.log',
      out_file: './logs/python-out.log',
      log_file: './logs/python-combined.log',
      time: true
    }
  ]
};