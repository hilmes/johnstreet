import argparse

def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Algorithmic Trading Dashboard (JohnStreet)")
    
    # Debug mode
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Run in debug mode (increases log verbosity to DEBUG)."
    )
    
    # Configuration
    parser.add_argument(
        "--config-file",
        type=str,
        default=None,
        help="Path to an alternative config file."
    )
    
    # Logging
    parser.add_argument(
        "--max-log-files",
        type=int,
        default=10,
        help="Maximum number of log files to retain."
    )
    
    # Test mode
    parser.add_argument(
        "--test-mode",
        action="store_true",
        help="Run in test mode with mock data."
    )
    
    # Server configuration
    server_group = parser.add_argument_group('Server Configuration')
    server_group.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host address to bind the server to (default: 0.0.0.0)"
    )
    server_group.add_argument(
        "--port",
        type=int,
        default=8080,
        help="Port number to run the server on (default: 8080)"
    )
    server_group.add_argument(
        "--disable-browser",
        action="store_true",
        help="Disable automatic browser launch on startup"
    )
    server_group.add_argument(
        "--allow-remote",
        action="store_true",
        help="Allow remote connections (use with caution)"
    )
    
    return parser.parse_args()