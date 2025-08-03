#!/bin/bash

# ATALANTA Web GUI Production Docker Build Script
# Builds optimized production Docker image with security best practices

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="atalanta-web-gui"
TAG="${1:-production}"
DOCKERFILE="Dockerfile.production"

# Logging functions
log() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Function to show banner
show_banner() {
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║              ATALANTA Web GUI Production Build               ║${NC}"
    echo -e "${PURPLE}║                     Docker Image Builder                     ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker >/dev/null 2>&1; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if Dockerfile exists
    if [ ! -f "$DOCKERFILE" ]; then
        error "Dockerfile not found: $DOCKERFILE"
        exit 1
    fi
    
    # Check if web directory exists
    if [ ! -d "web" ]; then
        error "Web directory not found"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Function to clean up old images
cleanup_old_images() {
    log "Cleaning up old images..."
    
    # Remove old images with same tag
    if docker images | grep -q "$IMAGE_NAME.*$TAG"; then
        warning "Removing existing image: $IMAGE_NAME:$TAG"
        docker rmi "$IMAGE_NAME:$TAG" 2>/dev/null || true
    fi
    
    # Clean up dangling images
    docker image prune -f >/dev/null 2>&1 || true
    
    success "Cleanup completed"
}

# Function to build the image
build_image() {
    log "Building production Docker image..."
    log "Image: $IMAGE_NAME:$TAG"
    log "Dockerfile: $DOCKERFILE"
    
    # Build with build args and optimizations
    docker build \
        --file "$DOCKERFILE" \
        --tag "$IMAGE_NAME:$TAG" \
        --build-arg NODE_ENV=production \
        --build-arg NEXT_TELEMETRY_DISABLED=1 \
        --no-cache \
        --pull \
        .
    
    success "Docker image built successfully"
}

# Function to test the image
test_image() {
    log "Testing the built image..."
    
    # Test basic functionality
    local container_id
    container_id=$(docker run -d --rm -p 3001:3000 "$IMAGE_NAME:$TAG" web)
    
    if [ -z "$container_id" ]; then
        error "Failed to start test container"
        exit 1
    fi
    
    log "Test container started: $container_id"
    
    # Wait for container to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec "$container_id" /opt/atalanta/healthcheck.sh web >/dev/null 2>&1; then
            success "Container health check passed"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "Container failed health check"
            docker logs "$container_id"
            docker stop "$container_id" >/dev/null 2>&1
            exit 1
        fi
        
        log "Health check attempt $attempt/$max_attempts..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    # Stop test container
    docker stop "$container_id" >/dev/null 2>&1
    success "Image testing completed successfully"
}

# Function to show image information
show_image_info() {
    log "Image Information:"
    echo "=================="
    
    # Show image details
    docker images "$IMAGE_NAME:$TAG" --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}\t{{.CreatedSince}}"
    
    echo ""
    log "Image Layers:"
    docker history "$IMAGE_NAME:$TAG" --format "table {{.CreatedBy}}\t{{.Size}}" | head -10
    
    echo ""
    log "Security Scan (if available):"
    if command -v docker >/dev/null 2>&1 && docker version --format '{{.Server.Version}}' | grep -q "^2[0-9]"; then
        docker scout quickview "$IMAGE_NAME:$TAG" 2>/dev/null || echo "Docker Scout not available"
    fi
}

# Function to tag additional versions
tag_versions() {
    log "Creating additional tags..."
    
    # Tag as latest
    docker tag "$IMAGE_NAME:$TAG" "$IMAGE_NAME:latest"
    log "Tagged as: $IMAGE_NAME:latest"
    
    # Tag with timestamp
    local timestamp=$(date +%Y%m%d-%H%M%S)
    docker tag "$IMAGE_NAME:$TAG" "$IMAGE_NAME:$timestamp"
    log "Tagged as: $IMAGE_NAME:$timestamp"
    
    success "Additional tags created"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [TAG] [OPTIONS]"
    echo ""
    echo "Arguments:"
    echo "  TAG                 Docker image tag (default: production)"
    echo ""
    echo "Options:"
    echo "  --no-test          Skip image testing"
    echo "  --no-cleanup       Skip cleanup of old images"
    echo "  --no-tag           Skip additional tagging"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                 Build with default tag 'production'"
    echo "  $0 v2.0            Build with tag 'v2.0'"
    echo "  $0 latest --no-test Build 'latest' without testing"
    echo ""
}

# Main function
main() {
    local skip_test=false
    local skip_cleanup=false
    local skip_tag=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-test)
                skip_test=true
                shift
                ;;
            --no-cleanup)
                skip_cleanup=true
                shift
                ;;
            --no-tag)
                skip_tag=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            -*)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                # Assume it's the tag if not already set
                if [ "$TAG" = "production" ] && [ "$1" != "production" ]; then
                    TAG="$1"
                fi
                shift
                ;;
        esac
    done
    
    show_banner
    check_prerequisites
    
    if [ "$skip_cleanup" = false ]; then
        cleanup_old_images
    fi
    
    build_image
    
    if [ "$skip_test" = false ]; then
        test_image
    fi
    
    if [ "$skip_tag" = false ]; then
        tag_versions
    fi
    
    show_image_info
    
    echo ""
    success "Production Docker image build completed!"
    echo ""
    log "Next steps:"
    echo "  1. Test the image: docker run -p 3000:3000 $IMAGE_NAME:$TAG"
    echo "  2. Deploy to production: ./scripts/deploy-production.sh"
    echo "  3. Push to registry: docker push $IMAGE_NAME:$TAG"
    echo ""
}

# Run main function with all arguments
main "$@"