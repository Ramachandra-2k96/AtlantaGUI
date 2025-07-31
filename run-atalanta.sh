#!/bin/bash

# ATALANTA Docker Virtual Machine Script
# This script provides a VM-like experience for ATALANTA

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🚀 ATALANTA Docker Virtual Machine${NC}"
echo "=================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if container already exists
CONTAINER_EXISTS=$(docker ps -a --filter name=atalanta-container --format "{{.Names}}" | grep -w atalanta-container)

if [ "$CONTAINER_EXISTS" ]; then
    # Container exists, check if it's running
    CONTAINER_RUNNING=$(docker ps --filter name=atalanta-container --format "{{.Names}}" | grep -w atalanta-container)
    
    if [ "$CONTAINER_RUNNING" ]; then
        echo -e "${GREEN}✅ ATALANTA container is already running${NC}"
        echo -e "${BLUE}📱 Connecting to existing session...${NC}"
        docker exec -it atalanta-container /bin/bash
    else
        echo -e "${YELLOW}🔄 Starting existing ATALANTA container...${NC}"
        docker start atalanta-container
        echo -e "${GREEN}✅ Container started${NC}"
        echo -e "${BLUE}📱 Connecting to ATALANTA...${NC}"
        docker exec -it atalanta-container /bin/bash
    fi
else
    # Container doesn't exist, create it
    echo -e "${YELLOW}🏗️  Building ATALANTA for first time...${NC}"
    
    # Check if image exists
    IMAGE_EXISTS=$(docker images --filter reference=atalanta:latest --format "{{.Repository}}")
    
    if [ ! "$IMAGE_EXISTS" ]; then
        echo -e "${BLUE}📦 Building ATALANTA Docker image...${NC}"
        docker build -t atalanta:latest .
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to build ATALANTA image${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ ATALANTA image built successfully${NC}"
    fi
    
    echo -e "${BLUE}🚀 Creating persistent ATALANTA container...${NC}"
    
    # Create and run the container with persistent volume
    docker run -it \
        --name atalanta-container \
        -v atalanta_workspace:/workspace \
        atalanta:latest
        
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to start ATALANTA container${NC}"
        exit 1
    fi
fi
