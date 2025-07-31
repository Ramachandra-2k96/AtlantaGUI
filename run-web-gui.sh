#!/bin/bash

# ATALANTA Web GUI Quick Start Script
# This script provides easy commands to run the web GUI

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              ATALANTA Web GUI Quick Start                    ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to show usage
show_usage() {
    echo -e "${CYAN}Usage:${NC}"
    echo -e "  $0 [COMMAND] [OPTIONS]"
    echo ""
    echo -e "${CYAN}Commands:${NC}"
    echo -e "  ${YELLOW}web${NC}           Start web interface (default)"
    echo -e "  ${YELLOW}cli${NC}           Start CLI mode"
    echo -e "  ${YELLOW}build${NC}         Build the Docker image"
    echo -e "  ${YELLOW}stop${NC}          Stop running containers"
    echo -e "  ${YELLOW}clean${NC}         Remove containers and images"
    echo -e "  ${YELLOW}logs${NC}          Show container logs"
    echo -e "  ${YELLOW}health${NC}        Check container health"
    echo -e "  ${YELLOW}help${NC}          Show this help message"
    echo ""
    echo -e "${CYAN}Options:${NC}"
    echo -e "  ${YELLOW}--port PORT${NC}   Use custom port (default: 3000)"
    echo -e "  ${YELLOW}--local${NC}       Use local directory binding"
    echo -e "  ${YELLOW}--detach${NC}      Run in background"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo -e "  ${YELLOW}$0${NC}                    # Start web interface on port 3000"
    echo -e "  ${YELLOW}$0 web --port 8080${NC}   # Start on custom port"
    echo -e "  ${YELLOW}$0 web --local${NC}       # Use local directory binding"
    echo -e "  ${YELLOW}$0 cli${NC}               # Start CLI mode"
    echo -e "  ${YELLOW}$0 build${NC}             # Build the image"
    echo ""
}

# Default values
COMMAND="web"
PORT="3000"
LOCAL_MODE=""
DETACH_MODE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        web|cli|build|stop|clean|logs|health|help)
            COMMAND="$1"
            shift
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --local)
            LOCAL_MODE="--local"
            shift
            ;;
        --detach|-d)
            DETACH_MODE="-d"
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
}

# Build the image
build_image() {
    echo -e "${CYAN}🔨 Building ATALANTA Web GUI...${NC}"
    ./docker-build-web.sh
}

# Start web interface
start_web() {
    check_docker
    
    echo -e "${CYAN}🌐 Starting ATALANTA Web GUI...${NC}"
    
    if [[ -n "$LOCAL_MODE" ]]; then
        echo -e "${YELLOW}Using local directory binding${NC}"
        VOLUME_MOUNT="-v $(pwd)/local-workspace:/workspace"
        mkdir -p local-workspace/circuits local-workspace/outputs local-workspace/work
    else
        echo -e "${YELLOW}Using named volume for persistence${NC}"
        VOLUME_MOUNT="-v atalanta_data:/workspace"
    fi
    
    echo -e "${YELLOW}Port: $PORT${NC}"
    echo -e "${YELLOW}Mode: ${DETACH_MODE:-interactive}${NC}"
    echo ""
    
    if [[ -n "$DETACH_MODE" ]]; then
        docker run $DETACH_MODE --name atalanta-web-gui -p $PORT:3000 $VOLUME_MOUNT atalanta-web-gui:latest web
        echo -e "${GREEN}✅ Web GUI started in background${NC}"
        echo -e "${GREEN}🌐 Access at: http://localhost:$PORT${NC}"
        echo -e "${YELLOW}💡 Use '$0 logs' to view logs${NC}"
        echo -e "${YELLOW}💡 Use '$0 stop' to stop the container${NC}"
    else
        echo -e "${GREEN}🌐 Web interface will be available at: http://localhost:$PORT${NC}"
        echo -e "${YELLOW}💡 Press Ctrl+C to stop${NC}"
        echo ""
        docker run --rm --name atalanta-web-gui -p $PORT:3000 $VOLUME_MOUNT atalanta-web-gui:latest web
    fi
}

# Start CLI mode
start_cli() {
    check_docker
    
    echo -e "${CYAN}💻 Starting ATALANTA CLI mode...${NC}"
    
    if [[ -n "$LOCAL_MODE" ]]; then
        VOLUME_MOUNT="-v $(pwd)/local-workspace:/workspace"
        mkdir -p local-workspace/circuits local-workspace/outputs local-workspace/work
    else
        VOLUME_MOUNT="-v atalanta_data:/workspace"
    fi
    
    docker run -it --rm --name atalanta-cli $VOLUME_MOUNT atalanta-web-gui:latest cli
}

# Stop containers
stop_containers() {
    echo -e "${CYAN}🛑 Stopping ATALANTA containers...${NC}"
    docker stop atalanta-web-gui atalanta-cli 2>/dev/null || true
    docker rm atalanta-web-gui atalanta-cli 2>/dev/null || true
    echo -e "${GREEN}✅ Containers stopped${NC}"
}

# Clean up
clean_up() {
    echo -e "${CYAN}🧹 Cleaning up ATALANTA containers and images...${NC}"
    stop_containers
    docker rmi atalanta-web-gui:latest 2>/dev/null || true
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Show logs
show_logs() {
    echo -e "${CYAN}📋 Container logs:${NC}"
    docker logs atalanta-web-gui 2>/dev/null || echo -e "${YELLOW}No running web GUI container found${NC}"
}

# Health check
health_check() {
    echo -e "${CYAN}🏥 Running health check...${NC}"
    docker run --rm atalanta-web-gui:latest health
}

# Main command execution
case $COMMAND in
    "web")
        start_web
        ;;
    "cli")
        start_cli
        ;;
    "build")
        build_image
        ;;
    "stop")
        stop_containers
        ;;
    "clean")
        clean_up
        ;;
    "logs")
        show_logs
        ;;
    "health")
        health_check
        ;;
    "help")
        show_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        show_usage
        exit 1
        ;;
esac