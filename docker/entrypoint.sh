#!/bin/bash
set -e

# ATALANTA Web GUI Production Entrypoint
# Handles service orchestration and graceful shutdown

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Signal handlers for graceful shutdown
cleanup() {
    log "Received shutdown signal, cleaning up..."
    
    # Kill background processes
    if [ ! -z "$WEB_PID" ]; then
        log "Stopping web server (PID: $WEB_PID)"
        kill -TERM "$WEB_PID" 2>/dev/null || true
        wait "$WEB_PID" 2>/dev/null || true
    fi
    
    success "Cleanup completed"
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT SIGQUIT

# Function to show banner
show_banner() {
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║              ATALANTA Test Pattern Generator v2.0            ║${NC}"
    echo -e "${PURPLE}║                Production Web GUI Interface                  ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to validate environment
validate_environment() {
    log "Validating environment..."
    
    # Check ATALANTA binary
    if ! command -v atalanta >/dev/null 2>&1; then
        error "ATALANTA binary not found in PATH"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        error "Node.js not found"
        exit 1
    fi
    
    # Check workspace directory
    if [ ! -d "/workspace" ]; then
        error "Workspace directory not found"
        exit 1
    fi
    
    # Check web application
    if [ ! -f "/app/server.js" ]; then
        error "Web application not found"
        exit 1
    fi
    
    success "Environment validation passed"
}

# Function to initialize workspace
initialize_workspace() {
    log "Initializing workspace..."
    
    # Create necessary directories
    mkdir -p /workspace/circuits /workspace/outputs /workspace/work
    
    # Check if this is first time setup
    if [ ! -f "/workspace/.atalanta_initialized" ]; then
        log "First time setup detected"
        touch /workspace/.atalanta_initialized
        
        # Copy sample files if available
        if [ -d "/opt/atalanta/samples" ]; then
            log "Copying sample circuits..."
            cp /opt/atalanta/samples/*.bench /workspace/circuits/ 2>/dev/null || true
        fi
        
        success "Workspace initialized"
    else
        log "Workspace already initialized"
    fi
    
    # Set proper permissions (in case of volume mounts)
    chmod 755 /workspace /workspace/circuits /workspace/outputs /workspace/work 2>/dev/null || true
}

# Function to start web server
start_web_server() {
    log "Starting ATALANTA Web GUI server..."
    
    cd /app
    
    # Start the web server in background
    node server.js &
    WEB_PID=$!
    
    log "Web server started with PID: $WEB_PID"
    success "ATALANTA Web GUI is running on port 3000"
    
    # Wait for the web server process
    wait "$WEB_PID"
}

# Function to start CLI mode
start_cli_mode() {
    log "Starting CLI mode..."
    cd /workspace
    exec /bin/bash
}

# Function to run health check
run_health_check() {
    /opt/atalanta/healthcheck.sh
}

# Function to show system status
show_status() {
    echo -e "${CYAN}System Status:${NC}"
    echo "=============="
    echo "Container: $(hostname)"
    echo "User: $(whoami)"
    echo "Working Directory: $(pwd)"
    echo "ATALANTA Binary: $(which atalanta 2>/dev/null || echo 'Not found')"
    echo "Node.js Version: $(node --version 2>/dev/null || echo 'Not found')"
    echo "Memory Usage: $(free -h 2>/dev/null | grep Mem | awk '{print $3 "/" $2}' || echo 'N/A')"
    echo "Disk Usage: $(df -h /workspace 2>/dev/null | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}' || echo 'N/A')"
    echo ""
    echo -e "${CYAN}Workspace Status:${NC}"
    echo "Circuits: $(ls -1 /workspace/circuits/*.bench 2>/dev/null | wc -l) files"
    echo "Outputs: $(ls -1 /workspace/outputs/* 2>/dev/null | wc -l) files"
    echo ""
}

# Main execution
main() {
    show_banner
    validate_environment
    initialize_workspace
    
    case "${1:-web}" in
        "web")
            log "Mode: Web Interface"
            start_web_server
            ;;
        "cli")
            log "Mode: CLI"
            start_cli_mode
            ;;
        "bash")
            log "Mode: Bash Shell"
            cd /workspace
            exec /bin/bash
            ;;
        "health")
            run_health_check
            ;;
        "status")
            show_status
            ;;
        *)
            error "Unknown command: $1"
            echo "Available commands: web, cli, bash, health, status"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"