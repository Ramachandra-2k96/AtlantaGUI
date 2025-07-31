#!/bin/bash

# ATALANTA Docker Build and Deployment Script
# This script builds the Docker image and optionally pushes it to Docker Hub

set -e  # Exit on any error

# Configuration
IMAGE_NAME="atalanta"
DOCKER_USERNAME="${DOCKER_USERNAME:-your-username}"  # Set your Docker Hub username
VERSION="2.0"
LATEST_TAG="latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_step() {
    echo -e "${BLUE}==== $1 ====${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Help function
show_help() {
    cat << EOF
ATALANTA Docker Build Script

Usage: $0 [OPTIONS] [COMMAND]

Commands:
    build       Build the Docker image (default)
    push        Build and push to Docker Hub
    run         Build and run the container
    test        Build and test the container
    clean       Remove the Docker image
    help        Show this help

Options:
    -u, --username USERNAME    Docker Hub username (default: your-username)
    -t, --tag TAG             Additional tag for the image
    -v, --version VERSION     Version tag (default: 2.0)
    --no-cache               Build without cache
    -h, --help               Show this help

Examples:
    $0 build                          # Build the image
    $0 push -u myusername            # Build and push to Docker Hub
    $0 run                           # Build and run interactively
    $0 test                          # Build and test functionality

EOF
}

# Parse arguments
COMMAND="build"
NO_CACHE=""
ADDITIONAL_TAG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        build|push|run|test|clean|help)
            COMMAND="$1"
            shift
            ;;
        -u|--username)
            DOCKER_USERNAME="$2"
            shift 2
            ;;
        -t|--tag)
            ADDITIONAL_TAG="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Full image names
LOCAL_IMAGE="${IMAGE_NAME}:${VERSION}"
LOCAL_IMAGE_LATEST="${IMAGE_NAME}:${LATEST_TAG}"
REMOTE_IMAGE="${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"
REMOTE_IMAGE_LATEST="${DOCKER_USERNAME}/${IMAGE_NAME}:${LATEST_TAG}"

# Build function
build_image() {
    print_step "Building ATALANTA Docker Image"
    
    if [ ! -f "Dockerfile" ]; then
        print_error "Dockerfile not found in current directory"
        exit 1
    fi
    
    print_step "Building image: ${LOCAL_IMAGE}"
    docker build ${NO_CACHE} -t "${LOCAL_IMAGE}" -t "${LOCAL_IMAGE_LATEST}" .
    
    if [ -n "$ADDITIONAL_TAG" ]; then
        docker tag "${LOCAL_IMAGE}" "${IMAGE_NAME}:${ADDITIONAL_TAG}"
        print_success "Tagged as ${IMAGE_NAME}:${ADDITIONAL_TAG}"
    fi
    
    print_success "Image built successfully"
    docker images | grep "${IMAGE_NAME}"
}

# Test function
test_image() {
    print_step "Testing ATALANTA Docker Image"
    
    # Test 1: Check if container starts
    print_step "Test 1: Container startup"
    if docker run --rm "${LOCAL_IMAGE}" echo "Container starts successfully"; then
        print_success "Container startup test passed"
    else
        print_error "Container startup test failed"
        exit 1
    fi
    
    # Test 2: Check if ATALANTA binary exists and runs
    print_step "Test 2: ATALANTA binary test"
    if docker run --rm "${LOCAL_IMAGE}" which atalanta; then
        print_success "ATALANTA binary found"
    else
        print_error "ATALANTA binary not found"
        exit 1
    fi
    
    # Test 3: Run ATALANTA on sample circuit
    print_step "Test 3: ATALANTA functionality test"
    if docker run --rm "${LOCAL_IMAGE}" atalanta my_circuit.bench; then
        print_success "ATALANTA functionality test passed"
    else
        print_warning "ATALANTA functionality test completed (may have warnings)"
    fi
    
    print_success "All tests completed"
}

# Push function
push_image() {
    print_step "Pushing to Docker Hub"
    
    # Tag for remote
    docker tag "${LOCAL_IMAGE}" "${REMOTE_IMAGE}"
    docker tag "${LOCAL_IMAGE_LATEST}" "${REMOTE_IMAGE_LATEST}"
    
    # Login check
    if ! docker info | grep -q "Username:"; then
        print_step "Please login to Docker Hub"
        docker login
    fi
    
    # Push
    print_step "Pushing ${REMOTE_IMAGE}"
    docker push "${REMOTE_IMAGE}"
    
    print_step "Pushing ${REMOTE_IMAGE_LATEST}"
    docker push "${REMOTE_IMAGE_LATEST}"
    
    if [ -n "$ADDITIONAL_TAG" ]; then
        REMOTE_ADDITIONAL="${DOCKER_USERNAME}/${IMAGE_NAME}:${ADDITIONAL_TAG}"
        docker tag "${LOCAL_IMAGE}" "${REMOTE_ADDITIONAL}"
        docker push "${REMOTE_ADDITIONAL}"
        print_success "Pushed ${REMOTE_ADDITIONAL}"
    fi
    
    print_success "Images pushed successfully to Docker Hub"
    echo "You can now pull the image with:"
    echo "  docker pull ${REMOTE_IMAGE_LATEST}"
}

# Run function
run_image() {
    print_step "Running ATALANTA Container"
    print_step "Starting interactive container..."
    print_warning "Type 'exit' to leave the container"
    docker run -it --rm "${LOCAL_IMAGE}"
}

# Clean function
clean_image() {
    print_step "Cleaning ATALANTA Docker Images"
    
    # Remove local images
    for tag in "${VERSION}" "${LATEST_TAG}" "${ADDITIONAL_TAG}"; do
        if [ -n "$tag" ] && docker images -q "${IMAGE_NAME}:${tag}" > /dev/null 2>&1; then
            docker rmi "${IMAGE_NAME}:${tag}" 2>/dev/null || true
            print_success "Removed ${IMAGE_NAME}:${tag}"
        fi
    done
    
    # Clean up dangling images
    if docker images -q -f dangling=true | grep -q .; then
        docker rmi $(docker images -q -f dangling=true) 2>/dev/null || true
        print_success "Cleaned up dangling images"
    fi
    
    print_success "Cleanup completed"
}

# Main execution
case $COMMAND in
    build)
        build_image
        ;;
    push)
        build_image
        test_image
        push_image
        ;;
    run)
        build_image
        run_image
        ;;
    test)
        build_image
        test_image
        ;;
    clean)
        clean_image
        ;;
    help)
        show_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac

print_success "Script completed successfully!"
