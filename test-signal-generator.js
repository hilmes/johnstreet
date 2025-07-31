const { execSync } = require('child_process');

try {
  console.log('Running SignalGenerator tests...\n');
  const output = execSync('npm test -- --testPathPattern=SignalGenerator.test.ts --no-coverage', {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10
  });
  console.log(output);
} catch (error) {
  console.error('Test output:', error.stdout);
  console.error('Test errors:', error.stderr);
  console.error('Exit code:', error.status);
}