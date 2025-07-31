#!/bin/bash

# ATALANTA Docker Container Entrypoint
# This script provides a VM-like experience with persistent workspace

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Clear screen for clean start
clear

# Welcome banner
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              ATALANTA Test Pattern Generator v2.0            ║${NC}"
echo -e "${PURPLE}║                   Docker Virtual Environment                 ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Show current workspace status
echo -e "${CYAN}📁 Workspace Status:${NC}"
echo -e "   Current Directory: ${GREEN}$(pwd)${NC}"
echo -e "   User: ${GREEN}$(whoami)${NC}"
echo -e "   Container: ${GREEN}ATALANTA-Docker${NC}"
echo ""

# Check if this is first time or returning
if [ -f "/workspace/.atalanta_initialized" ]; then
    echo -e "${GREEN}✅ Welcome back! Your workspace is persistent.${NC}"
else
    echo -e "${YELLOW}🚀 First time setup detected. Initializing workspace...${NC}"
    touch /workspace/.atalanta_initialized
    
    # Copy sample circuits to workspace if they don't exist
    if [ ! "$(ls -A /workspace/circuits 2>/dev/null)" ]; then
        echo -e "   Copying sample circuits to workspace..."
        cp *.bench /workspace/circuits/ 2>/dev/null || true
        cp data/*.bench /workspace/circuits/ 2>/dev/null || true
    fi
fi

echo ""

# Show available directories
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

# ATALANTA quick commands
echo -e "${CYAN}🔧 ATALANTA Quick Commands:${NC}"
echo -e "   ${YELLOW}atalanta -h${NC}                     - Show ATALANTA help"
echo -e "   ${YELLOW}atalanta circuit.bench${NC}          - Run ATALANTA on a circuit"
echo -e "   ${YELLOW}atalanta /workspace/circuits/my.bench${NC} - Run on your circuit"
echo -e "   ${YELLOW}ls /workspace/circuits/${NC}         - List available circuits"
echo ""

# Docker management commands
echo -e "${CYAN}🐳 Docker Management Commands:${NC}"
echo -e "   ${YELLOW}exit${NC}                           - Exit container (data persists)"
echo -e "   ${YELLOW}mount-check${NC}                    - Check mounted volumes"
echo -e "   ${YELLOW}clean-outputs${NC}                  - Clean output directory"
echo -e "   ${YELLOW}help-docker${NC}                    - Show Docker commands"
echo ""

# Navigation shortcuts
echo -e "${CYAN}🧭 Quick Navigation:${NC}"
echo -e "   ${YELLOW}circuits${NC}                       - Go to circuits directory"
echo -e "   ${YELLOW}outputs${NC}                        - Go to outputs directory" 
echo -e "   ${YELLOW}work${NC}                           - Go to work directory"
echo -e "   ${YELLOW}home${NC}                           - Go to ATALANTA home"
echo ""

# Create custom commands
cat > /tmp/custom_commands.sh << 'EOF'
# Custom commands for easier navigation and Docker management

circuits() {
    cd /workspace/circuits
    echo "📁 Switched to circuits directory"
    ls -la
}

outputs() {
    cd /workspace/outputs
    echo "📁 Switched to outputs directory" 
    ls -la
}

work() {
    cd /workspace/work
    echo "📁 Switched to work directory"
    ls -la
}

home() {
    cd /opt/atalanta
    echo "📁 Switched to ATALANTA home directory"
    ls -la
}

mount-check() {
    echo "🔍 Checking mounted volumes:"
    echo "================================"
    df -h | grep -E "(workspace|circuits|outputs)" || echo "No external mounts detected"
    echo ""
    echo "Directory contents:"
    echo "  /workspace/circuits: $(ls -1 /workspace/circuits 2>/dev/null | wc -l) files"
    echo "  /workspace/outputs: $(ls -1 /workspace/outputs 2>/dev/null | wc -l) files"
    echo "  /workspace/work: $(ls -1 /workspace/work 2>/dev/null | wc -l) files"
}

clean-outputs() {
    echo "🗑️  Cleaning output directory..."
    read -p "Are you sure you want to delete all files in /workspace/outputs? (y/N): " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        rm -rf /workspace/outputs/*
        echo "✅ Output directory cleaned"
    else
        echo "❌ Cancelled"
    fi
}

help-docker() {
    echo "🐳 Docker Commands (run from HOST machine):"
    echo "============================================="
    echo ""
    echo "Container Management:"
    echo "  docker ps                              - List running containers"
    echo "  docker ps -a                           - List all containers"
    echo "  docker stop atalanta-container         - Stop the container"
    echo "  docker start atalanta-container        - Start existing container"
    echo "  docker rm atalanta-container           - Delete container (loses data!)"
    echo ""
    echo "Data Management:"
    echo "  docker exec -it atalanta-container bash - Enter running container"
    echo "  docker cp file.bench atalanta-container:/workspace/circuits/"
    echo "  docker cp atalanta-container:/workspace/outputs/result.test ."
    echo ""
    echo "Volume Management:"
    echo "  docker run -v \$(pwd)/my-circuits:/workspace/circuits atalanta"
    echo "  docker run -v my-data:/workspace atalanta"
    echo ""
    echo "For persistence, use named volumes or bind mounts!"
}

# Quick status function
status() {
    echo "📊 ATALANTA Container Status:"
    echo "=============================="
    echo "Hostname: $(hostname)"
    echo "User: $(whoami)"
    echo "Directory: $(pwd)"
    echo "Uptime: $(uptime -p)"
    echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
    echo "Disk: $(df -h /workspace | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"
    echo ""
    echo "ATALANTA Binary: $(which atalanta)"
    echo "ATALANTA Version: $(atalanta -h 2>&1 | head -2 | tail -1 || echo 'Run atalanta -h for version')"
}
EOF

# Source the custom commands
source /tmp/custom_commands.sh

# Add to bashrc for persistence within container session
cat /tmp/custom_commands.sh >> ~/.bashrc

# Set up the workspace as default directory
cd /workspace

echo -e "${GREEN}🎉 ATALANTA Virtual Environment Ready!${NC}"
echo -e "${YELLOW}💡 Tip: Type 'status' anytime to see system information${NC}"
echo -e "${YELLOW}💡 Tip: Your work in /workspace persists between container restarts${NC}"
echo ""

# Execute the command passed to the container
exec "$@"
