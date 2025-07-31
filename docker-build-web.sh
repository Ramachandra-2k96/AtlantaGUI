#!/bin/bash

# ATALANTA Web GUI Docker Build Script
# This script builds the web-enabled Docker container

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              ATALANTA Web GUI Docker Builder                 ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to show usage
show_usage() {
    echo -e "${CYAN}Usage:${NC}"
    echo -e "  $0 [OPTIONS]"
    echo ""
    echo -e "${CYAN}Options:${NC}"
    echo -e "  ${YELLOW}--no-cache${NC}    Build without using Docker cache"
    echo -e "  ${YELLOW}--help${NC}        Show this help message"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo -e "  ${YELLOW}$0${NC}                    # Build with cache"
    echo -e "  ${YELLOW}$0 --no-cache${NC}        # Build without cache"
    echo ""
}

# Parse command line arguments
NO_CACHE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-cache)
            NO_CACHE="--no-cache"
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
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

echo -e "${CYAN}🔨 Building ATALANTA Web GUI Docker image...${NC}"
echo ""

# Build the Docker image
echo -e "${YELLOW}Building image: atalanta-web-gui:latest${NC}"
if docker build $NO_CACHE -f Dockerfile.web -t atalanta-web-gui:latest .; then
    echo ""
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
    echo ""
    
    # Show image information
    echo -e "${CYAN}📊 Image Information:${NC}"
    docker images atalanta-web-gui:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    echo ""
    
    # Show usage instructions
    echo -e "${CYAN}🚀 Quick Start Commands:${NC}"
    echo ""
    echo -e "${YELLOW}# Start web interface (recommended)${NC}"
    echo -e "docker run -p 3000:3000 -v atalanta_data:/workspace atalanta-web-gui:latest"
    echo ""
    echo -e "${YELLOW}# Start with docker-compose${NC}"
    echo -e "docker-compose up atalanta-web"
    echo ""
    echo -e "${YELLOW}# Start CLI mode${NC}"
    echo -e "docker run -it -v atalanta_data:/workspace atalanta-web-gui:latest cli"
    echo ""
    echo -e "${YELLOW}# Health check${NC}"
    echo -e "docker run --rm atalanta-web-gui:latest health"
    echo ""
    
    echo -e "${GREEN}🌐 Once running, access the web interface at: http://localhost:3000${NC}"
    
else
    echo ""
    echo -e "${RED}❌ Build failed!${NC}"
    echo -e "${YELLOW}💡 Try running with --no-cache if you're experiencing issues${NC}"
    exit 1
fi