#!/bin/bash

# ATALANTA Web GUI Docker Container Entrypoint
# This script provides both CLI and web interface access to ATALANTA

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to show banner
show_banner() {
    clear
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║              ATALANTA Test Pattern Generator v2.0            ║${NC}"
    echo -e "${PURPLE}║                     Web GUI Interface                        ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to initialize workspace
initialize_workspace() {
    echo -e "${CYAN}📁 Initializing workspace...${NC}"
    
    # Check if this is first time or returning
    if [ -f "/workspace/.atalanta_web_initialized" ]; then
        echo -e "${GREEN}✅ Welcome back! Your workspace is persistent.${NC}"
    else
        echo -e "${YELLOW}🚀 First time setup detected. Initializing workspace...${NC}"
        touch /workspace/.atalanta_web_initialized
        
        # Copy sample circuits to workspace if they don't exist
        if [ ! "$(ls -A /workspace/circuits 2>/dev/null)" ]; then
            echo -e "   Copying sample circuits to workspace..."
            # Copy any .bench files from the container to workspace
            find /opt/atalanta -name "*.bench" -exec cp {} /workspace/circuits/ \; 2>/dev/null || true
        fi
    fi
    
    # Ensure proper permissions
    chown -R atalanta_user:atalanta_user /workspace 2>/dev/null || true
    
    echo -e "${GREEN}✅ Workspace initialized${NC}"
    echo ""
}

# Function to start web server
start_web_server() {
    echo -e "${CYAN}🌐 Starting ATALANTA Web GUI...${NC}"
    echo -e "   Web interface will be available at: ${GREEN}http://localhost:3000${NC}"
    echo -e "   Press ${YELLOW}Ctrl+C${NC} to stop the server"
    echo ""
    
    cd /app
    exec npm start
}

# Function to start CLI mode
start_cli_mode() {
    show_banner
    initialize_workspace
    
    echo -e "${CYAN}📂 Available Directories:${NC}"
    echo -e "   ${BLUE}/workspace/circuits${NC}  - Your circuit files (.bench)"
    echo -e "   ${BLUE}/workspace/outputs${NC}   - ATALANTA output files"
    echo -e "   ${BLUE}/workspace/work${NC}      - General workspace"
    echo ""
    
    # Count files in directories
    CIRCUIT_COUNT=$(ls -1 /workspace/circuits/*.bench 2>/dev/null | wc -l)
    OUTPUT_COUNT=$(ls -1 /workspace/outputs/* 2>/dev/null | wc -l)
    
    echo -e "${CYAN}📊 Current Files:${NC}"
    echo -e "   Circuits: ${GREEN}${CIRCUIT_COUNT}${NC} .bench files"
    echo -e "   Outputs:  ${GREEN}${OUTPUT_COUNT}${NC} files"
    echo ""
    
    echo -e "${CYAN}🔧 ATALANTA Commands:${NC}"
    echo -e "   ${YELLOW}atalanta -h${NC}                     - Show ATALANTA help"
    echo -e "   ${YELLOW}atalanta circuit.bench${NC}          - Run ATALANTA on a circuit"
    echo -e "   ${YELLOW}ls /workspace/circuits/${NC}         - List available circuits"
    echo ""
    
    echo -e "${CYAN}🌐 Web Interface:${NC}"
    echo -e "   To start the web GUI, run: ${YELLOW}docker run -p 3000:3000 atalanta-web-gui:latest web${NC}"
    echo ""
    
    echo -e "${GREEN}🎉 ATALANTA CLI Environment Ready!${NC}"
    echo ""
    
    cd /workspace
    exec /bin/bash
}

# Function to show help
show_help() {
    show_banner
    echo -e "${CYAN}Usage:${NC}"
    echo -e "  docker run -p 3000:3000 atalanta-web-gui:latest [COMMAND]"
    echo ""
    echo -e "${CYAN}Commands:${NC}"
    echo -e "  ${YELLOW}web${NC}     - Start the web interface (default)"
    echo -e "  ${YELLOW}cli${NC}     - Start in CLI mode"
    echo -e "  ${YELLOW}bash${NC}    - Start bash shell"
    echo -e "  ${YELLOW}help${NC}    - Show this help message"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo -e "  ${YELLOW}# Start web interface${NC}"
    echo -e "  docker run -p 3000:3000 -v atalanta_data:/workspace atalanta-web-gui:latest"
    echo ""
    echo -e "  ${YELLOW}# Start CLI mode${NC}"
    echo -e "  docker run -it -v atalanta_data:/workspace atalanta-web-gui:latest cli"
    echo ""
    echo -e "  ${YELLOW}# Start with local directory binding${NC}"
    echo -e "  docker run -p 3000:3000 -v \$(pwd)/my-circuits:/workspace/circuits atalanta-web-gui:latest"
    echo ""
}

# Function to check health
health_check() {
    echo -e "${CYAN}🏥 Health Check:${NC}"
    echo "=============================="
    
    # Check ATALANTA binary
    if command -v atalanta >/dev/null 2>&1; then
        echo -e "✅ ATALANTA binary: ${GREEN}Available${NC}"
    else
        echo -e "❌ ATALANTA binary: ${RED}Not found${NC}"
        exit 1
    fi
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        echo -e "✅ Node.js: ${GREEN}$(node --version)${NC}"
    else
        echo -e "❌ Node.js: ${RED}Not found${NC}"
        exit 1
    fi
    
    # Check Next.js app
    if [ -d "/app" ] && [ -f "/app/package.json" ]; then
        echo -e "✅ Next.js app: ${GREEN}Available${NC}"
    else
        echo -e "❌ Next.js app: ${RED}Not found${NC}"
        exit 1
    fi
    
    # Check workspace
    if [ -d "/workspace" ]; then
        echo -e "✅ Workspace: ${GREEN}Available${NC}"
        echo -e "   Circuits: $(ls -1 /workspace/circuits/*.bench 2>/dev/null | wc -l) files"
        echo -e "   Outputs: $(ls -1 /workspace/outputs/* 2>/dev/null | wc -l) files"
    else
        echo -e "❌ Workspace: ${RED}Not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All systems operational${NC}"
}

# Main script logic
case "${1:-web}" in
    "web")
        show_banner
        initialize_workspace
        start_web_server
        ;;
    "cli")
        start_cli_mode
        ;;
    "bash")
        show_banner
        initialize_workspace
        cd /workspace
        exec /bin/bash
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    "health")
        health_check
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo -e "Run with 'help' to see available commands"
        exit 1
        ;;
esac