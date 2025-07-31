#!/bin/bash
echo "Running SignalGenerator tests..."
npm test -- --testPathPattern=SignalGenerator.test.ts --no-coverage 2>&1 | head -200