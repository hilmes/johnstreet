# UNIFIED LOGGING SYSTEM TRIGGER

To implement a unified logging system that captures all output streams (console.log, server logs, SQL queries, HTTP requests, etc.) into a single tailable log file, use this prompt:

## Quick Implementation

```
Implement a unified logging system that:
1. Patches console.log in browser and forwards to server via API
2. Captures all server output streams (stdout, stderr, console methods)
3. Logs SQL queries with execution time
4. Provides 'make tail-logs' command for easy access
5. All logs flow to a single JSON-formatted file

The implementation should include:
- Browser console patching with batched API forwarding
- Server-side log aggregation Express middleware
- SQL query logging for PostgreSQL, MySQL, MongoDB
- Makefile with tail commands for different log types
- Automatic HTTP request/response logging
```

## Full Command

If you need the complete implementation with all files, use:

```
Create a unified logging system with these components:
- unified-logger.js: Captures Node.js streams
- browser-logger.js: Patches browser console and sends to server
- sql-logger.js: Wraps database clients
- log-server.js: Express middleware and aggregation
- Makefile: Commands like 'make tail-logs', 'make tail-errors', 'make tail-sql'
- Example integration showing Express app setup

All logs should flow to logs/unified.log as JSON with timestamp, level, source, message, and metadata.
```

## Key Features

- **Single Log File**: All output streams flow to `logs/unified.log`
- **Browser Integration**: Automatic console.log forwarding via POST to `/api/logs`
- **SQL Tracking**: Query logging with execution time for all major databases
- **Easy Monitoring**: `make tail-logs` shows last 50 lines and follows new output
- **Filtered Views**: Separate commands for errors, SQL, HTTP, browser logs
- **Production Ready**: Includes log rotation tips and performance optimizations

## Usage After Implementation

```bash
make install          # Install dependencies
make tail-logs       # Monitor all logs
make tail-errors     # Only errors
make tail-sql        # Only SQL queries
make tail-http       # Only HTTP requests
make tail-browser    # Only browser logs
make log-stats       # Show statistics
```

## Integration Example

```javascript
const { UnifiedLogger, SQLLogger, middleware } = require('./log-server');
const logger = new UnifiedLogger();
app.use(middleware(logger));
```

---

This prompt will generate a complete unified logging system that captures everything into one tailable log file.