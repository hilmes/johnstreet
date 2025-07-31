#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('Running SignalGenerator tests...');

const test = spawn('npm', ['test', '--', 'lib/trading/signals/SignalGenerator.test.ts'], {
  stdio: 'inherit',
  shell: true
});

test.on('close', (code) => {
  console.log(`Tests exited with code ${code}`);
});