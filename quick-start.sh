#!/bin/bash

# ATALANTA Docker Quick Start Script
# This script provides easy access to ATALANTA Virtual Machine

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}🎯 ATALANTA Test Pattern Generator${NC}"
echo -e "${PURPLE}   Docker Virtual Machine${NC}"
echo "==============================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed${NC}"
echo ""

echo -e "${CYAN}📋 What would you like to do?${NC}"
echo ""
echo "1. 🚀 Start ATALANTA Virtual Machine (Recommended)"
echo "2. 🏗️  Build ATALANTA image only"
echo "3. 🔧 Advanced Docker options"
echo "4. 📚 Show usage guide"
echo "5. 🗑️  Clean up (remove containers/volumes)"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo -e "${BLUE}🚀 Starting ATALANTA Virtual Machine...${NC}"
        echo ""
        echo -e "${YELLOW}💡 This will:${NC}"
        echo -e "   - Build ATALANTA if needed"
        echo -e "   - Create persistent workspace"
        echo -e "   - Launch interactive terminal"
        echo -e "   - Keep your work between sessions"
        echo ""
        read -p "Press Enter to continue..."
        
        ./run-atalanta.sh
        ;;
    2)
        echo -e "${BLUE}🏗️  Building ATALANTA image...${NC}"
        docker build -t atalanta:latest .
        echo -e "${GREEN}✅ Build complete!${NC}"
        echo -e "${YELLOW}💡 Run './run-atalanta.sh' to start the virtual machine${NC}"
        ;;
    3)
        echo -e "${CYAN}🔧 Advanced Docker Options:${NC}"
        echo ""
        echo "a. Start with local directory mounting"
        echo "b. Start development version"
        echo "c. Use Docker Compose"
        echo "d. Manual Docker commands"
        echo ""
        read -p "Choose option (a-d): " advanced
        
        case $advanced in
            a)
                echo -e "${BLUE}📁 Creating local workspace...${NC}"
                mkdir -p local-workspace/circuits local-workspace/outputs local-workspace/work
                docker run -it --name atalanta-local -v $(pwd)/local-workspace:/workspace atalanta:latest
                ;;
            b)
                echo -e "${BLUE}🔧 Starting development version...${NC}"
                docker-compose --profile dev up --build atalanta-dev
                ;;
            c)
                echo -e "${BLUE}🐳 Using Docker Compose...${NC}"
                docker-compose up --build atalanta
                ;;
            d)
                echo -e "${CYAN}Manual Docker Commands:${NC}"
                echo ""
                echo "Build: docker build -t atalanta:latest ."
                echo "Run:   docker run -it --name atalanta-vm -v atalanta_data:/workspace atalanta:latest"
                echo "Exec:  docker exec -it atalanta-vm /bin/bash"
                echo ""
                ;;
        esac
        ;;
    4)
        echo -e "${CYAN}📚 ATALANTA Usage Guide${NC}"
        echo "======================="
        echo ""
        echo -e "${YELLOW}🚀 Quick Start:${NC}"
        echo "   1. Run: ./quick-start.sh"
        echo "   2. Choose option 1"
        echo "   3. Work in the virtual machine!"
        echo ""
        echo -e "${YELLOW}📁 Directory Structure:${NC}"
        echo "   /workspace/circuits - Your .bench files"
        echo "   /workspace/outputs  - ATALANTA output files"  
        echo "   /workspace/work     - General workspace"
        echo ""
        echo -e "${YELLOW}🔧 ATALANTA Commands:${NC}"
        echo "   atalanta circuit.bench     - Run test generation"
        echo "   atalanta -h                - Show help"
        echo "   status                     - Check system status"
        echo ""
        echo -e "${YELLOW}🧭 Navigation:${NC}"
        echo "   circuits    - Go to circuits directory"
        echo "   outputs     - Go to outputs directory"
        echo "   work        - Go to work directory"
        echo ""
        echo -e "${YELLOW}🐳 Container Management:${NC}"
        echo "   exit              - Exit container (data persists)"
        echo "   mount-check       - Check mounted volumes"
        echo "   clean-outputs     - Clean output directory"
        echo "   help-docker       - Docker commands help"
        echo ""
        ;;
    5)
        echo -e "${YELLOW}🗑️  Container Cleanup${NC}"
        echo ""
        echo "What would you like to clean?"
        echo "a. Stop containers only"
        echo "b. Remove containers (keeps data)"
        echo "c. Remove everything (including data volumes)"
        echo ""
        read -p "Choose option (a-c): " cleanup
        
        case $cleanup in
            a)
                echo -e "${BLUE}🛑 Stopping ATALANTA containers...${NC}"
                docker stop atalanta-container atalanta-local atalanta-dev 2>/dev/null || true
                echo -e "${GREEN}✅ Containers stopped${NC}"
                ;;
            b)
                echo -e "${BLUE}🗑️  Removing containers...${NC}"
                docker stop atalanta-container atalanta-local atalanta-dev 2>/dev/null || true
                docker rm atalanta-container atalanta-local atalanta-dev 2>/dev/null || true
                echo -e "${GREEN}✅ Containers removed (data preserved)${NC}"
                ;;
            c)
                echo -e "${RED}⚠️  This will delete ALL ATALANTA data!${NC}"
                read -p "Are you sure? Type 'yes' to confirm: " confirm
                if [ "$confirm" = "yes" ]; then
                    docker stop atalanta-container atalanta-local atalanta-dev 2>/dev/null || true
                    docker rm atalanta-container atalanta-local atalanta-dev 2>/dev/null || true
                    docker volume rm atalanta_workspace 2>/dev/null || true
                    docker rmi atalanta:latest 2>/dev/null || true
                    echo -e "${GREEN}✅ Everything cleaned up${NC}"
                else
                    echo -e "${YELLOW}❌ Cancelled${NC}"
                fi
                ;;
        esac
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        echo -e "${YELLOW}💡 Run the script again and choose 1-5${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Done!${NC}"
        ;;
    2)
        if [ -n "$COMPOSE_CMD" ]; then
            echo "Using Docker Compose..."
            $COMPOSE_CMD up --build atalanta
        else
            echo "Docker Compose not available, falling back to option 1..."
            docker build -t atalanta:latest .
            docker run -it --rm -v $(pwd)/circuits:/circuits -v $(pwd)/outputs:/outputs atalanta:latest
        fi
        ;;
    3)
        echo "Building ATALANTA image..."
        docker build -t atalanta:latest .
        echo "✅ Build complete! Run with: docker run -it atalanta:latest"
        ;;
    4)
        echo "Pulling and running from Docker Hub..."
        read -p "Enter Docker Hub username (default: your-username): " username
        username=${username:-your-username}
        docker pull $username/atalanta:latest
        docker run -it --rm -v $(pwd)/circuits:/circuits -v $(pwd)/outputs:/outputs $username/atalanta:latest
        ;;
    *)
        echo "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "=== Quick Usage Guide ==="
echo "Once inside the container:"
echo "  atalanta my_circuit.bench    # Run on sample circuit"
echo "  atalanta /circuits/your.bench # Run on your circuit"
echo "  atalanta -h                  # Show help"
echo ""
echo "Your circuit files should be in ./circuits/"
echo "Outputs will be saved to ./outputs/"
