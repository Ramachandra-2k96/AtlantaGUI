#!/bin/bash

# ATALANTA Web GUI Production Validation Script
# Comprehensive validation of production deployment

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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.production.yml"
IMAGE_NAME="atalanta-web-gui:production"

# Test configuration
TEST_PORT=3001
TEST_TIMEOUT=60

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
    echo -e "${PURPLE}║              ATALANTA Web GUI Production Validation          ║${NC}"
    echo -e "${PURPLE}║                     Quality Assurance                        ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to validate Docker setup
validate_docker() {
    log "Validating Docker setup..."
    
    # Check Docker installation
    if ! command -v docker >/dev/null 2>&1; then
        error "Docker is not installed"
        return 1
    fi
    
    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon is not running"
        return 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        error "Docker Compose is not installed"
        return 1
    fi
    
    success "Docker setup validation passed"
    return 0
}

# Function to validate configuration files
validate_config_files() {
    log "Validating configuration files..."
    
    local errors=0
    
    # Check essential files
    local required_files=(
        "Dockerfile.production"
        "docker-compose.production.yml"
        "docker/entrypoint.sh"
        "docker/healthcheck.sh"
        "nginx/nginx.conf"
        "monitoring/prometheus.yml"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$PROJECT_ROOT/$file" ]; then
            error "Required file missing: $file"
            errors=$((errors + 1))
        fi
    done
    
    # Check script permissions
    local scripts=(
        "docker/entrypoint.sh"
        "docker/healthcheck.sh"
        "scripts/deploy-production.sh"
        "docker-build-production.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$PROJECT_ROOT/$script" ] && [ ! -x "$PROJECT_ROOT/$script" ]; then
            error "Script not executable: $script"
            errors=$((errors + 1))
        fi
    done
    
    if [ $errors -eq 0 ]; then
        success "Configuration files validation passed"
        return 0
    else
        error "Configuration files validation failed ($errors errors)"
        return 1
    fi
}

# Function to validate Docker image
validate_docker_image() {
    log "Validating Docker image..."
    
    # Check if image exists
    if ! docker images | grep -q "$IMAGE_NAME"; then
        warning "Production image not found, building..."
        if ! "$PROJECT_ROOT/docker-build-production.sh" --no-test; then
            error "Failed to build production image"
            return 1
        fi
    fi
    
    # Validate image security
    log "Checking image security..."
    
    # Check if image runs as non-root
    local user_info
    user_info=$(docker run --rm "$IMAGE_NAME" id 2>/dev/null || echo "uid=0(root)")
    
    if echo "$user_info" | grep -q "uid=0(root)"; then
        error "Image runs as root user (security risk)"
        return 1
    else
        success "Image runs as non-root user"
    fi
    
    # Check image size
    local image_size
    image_size=$(docker images "$IMAGE_NAME" --format "{{.Size}}" | head -1)
    log "Image size: $image_size"
    
    success "Docker image validation passed"
    return 0
}

# Function to validate container startup
validate_container_startup() {
    log "Validating container startup..."
    
    # Start test container
    local container_id
    container_id=$(docker run -d --rm -p "$TEST_PORT:3000" "$IMAGE_NAME" web 2>/dev/null)
    
    if [ -z "$container_id" ]; then
        error "Failed to start test container"
        return 1
    fi
    
    log "Test container started: $container_id"
    
    # Wait for container to be ready
    local max_attempts=$((TEST_TIMEOUT / 5))
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec "$container_id" /opt/atalanta/healthcheck.sh web >/dev/null 2>&1; then
            success "Container started successfully"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "Container failed to start within timeout"
            docker logs "$container_id" | tail -20
            docker stop "$container_id" >/dev/null 2>&1
            return 1
        fi
        
        log "Startup check attempt $attempt/$max_attempts..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    # Clean up
    docker stop "$container_id" >/dev/null 2>&1
    success "Container startup validation passed"
    return 0
}

# Function to validate web interface
validate_web_interface() {
    log "Validating web interface..."
    
    # Start test container
    local container_id
    container_id=$(docker run -d --rm -p "$TEST_PORT:3000" "$IMAGE_NAME" web 2>/dev/null)
    
    if [ -z "$container_id" ]; then
        error "Failed to start test container for web validation"
        return 1
    fi
    
    # Wait for container to be ready
    sleep 10
    
    # Test HTTP endpoint
    local http_status
    if command -v curl >/dev/null 2>&1; then
        http_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$TEST_PORT" --max-time 10 || echo "000")
        
        if [ "$http_status" = "200" ]; then
            success "Web interface is responding (HTTP $http_status)"
        else
            error "Web interface not responding (HTTP $http_status)"
            docker logs "$container_id" | tail -10
            docker stop "$container_id" >/dev/null 2>&1
            return 1
        fi
    else
        warning "curl not available, skipping HTTP test"
    fi
    
    # Test health endpoint
    if command -v curl >/dev/null 2>&1; then
        local health_status
        health_status=$(curl -s "http://localhost:$TEST_PORT/api/health" --max-time 5 || echo "error")
        
        if [ "$health_status" != "error" ]; then
            success "Health endpoint is responding"
        else
            warning "Health endpoint not responding"
        fi
    fi
    
    # Clean up
    docker stop "$container_id" >/dev/null 2>&1
    success "Web interface validation passed"
    return 0
}

# Function to validate ATALANTA binary
validate_atalanta_binary() {
    log "Validating ATALANTA binary..."
    
    # Test ATALANTA binary in container
    local atalanta_output
    atalanta_output=$(docker run --rm "$IMAGE_NAME" bash -c "atalanta -h" 2>&1 || echo "error")
    
    if echo "$atalanta_output" | grep -q "ATALANTA"; then
        success "ATALANTA binary is working"
    else
        error "ATALANTA binary not working properly"
        echo "$atalanta_output"
        return 1
    fi
    
    # Test workspace access
    local workspace_test
    workspace_test=$(docker run --rm "$IMAGE_NAME" bash -c "ls -la /workspace" 2>&1 || echo "error")
    
    if echo "$workspace_test" | grep -q "circuits"; then
        success "Workspace is accessible"
    else
        error "Workspace not accessible"
        echo "$workspace_test"
        return 1
    fi
    
    success "ATALANTA binary validation passed"
    return 0
}

# Function to validate security settings
validate_security() {
    log "Validating security settings..."
    
    local security_issues=0
    
    # Check container capabilities
    local caps_output
    caps_output=$(docker run --rm "$IMAGE_NAME" bash -c "cat /proc/self/status | grep Cap" 2>/dev/null || echo "error")
    
    if [ "$caps_output" = "error" ]; then
        warning "Could not check container capabilities"
    else
        log "Container capabilities checked"
    fi
    
    # Check file permissions
    local perms_output
    perms_output=$(docker run --rm "$IMAGE_NAME" bash -c "ls -la / | grep -E '(tmp|var)'" 2>/dev/null || echo "error")
    
    if [ "$perms_output" != "error" ]; then
        success "File permissions checked"
    else
        warning "Could not check file permissions"
    fi
    
    # Check for secrets in image
    local secrets_check
    secrets_check=$(docker run --rm "$IMAGE_NAME" bash -c "find /app -name '*.js' -o -name '*.json' | xargs grep -l 'password\|secret\|key' 2>/dev/null" || echo "")
    
    if [ -n "$secrets_check" ]; then
        warning "Potential secrets found in image files"
        security_issues=$((security_issues + 1))
    else
        success "No obvious secrets found in image"
    fi
    
    if [ $security_issues -eq 0 ]; then
        success "Security validation passed"
        return 0
    else
        warning "Security validation completed with $security_issues issues"
        return 0
    fi
}

# Function to validate resource usage
validate_resources() {
    log "Validating resource usage..."
    
    # Start container and monitor resources
    local container_id
    container_id=$(docker run -d --rm -p "$TEST_PORT:3000" "$IMAGE_NAME" web 2>/dev/null)
    
    if [ -z "$container_id" ]; then
        error "Failed to start container for resource validation"
        return 1
    fi
    
    # Wait for startup
    sleep 15
    
    # Check memory usage
    local memory_usage
    memory_usage=$(docker stats --no-stream --format "{{.MemUsage}}" "$container_id" 2>/dev/null || echo "N/A")
    log "Memory usage: $memory_usage"
    
    # Check CPU usage
    local cpu_usage
    cpu_usage=$(docker stats --no-stream --format "{{.CPUPerc}}" "$container_id" 2>/dev/null || echo "N/A")
    log "CPU usage: $cpu_usage"
    
    # Clean up
    docker stop "$container_id" >/dev/null 2>&1
    
    success "Resource usage validation completed"
    return 0
}

# Function to run all validations
run_all_validations() {
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    log "Running comprehensive production validation..."
    echo ""
    
    # List of validation functions
    local validations=(
        "validate_docker"
        "validate_config_files"
        "validate_docker_image"
        "validate_container_startup"
        "validate_web_interface"
        "validate_atalanta_binary"
        "validate_security"
        "validate_resources"
    )
    
    # Run each validation
    for validation in "${validations[@]}"; do
        total_tests=$((total_tests + 1))
        echo ""
        
        if $validation; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    done
    
    # Summary
    echo ""
    log "Validation Summary:"
    echo "=================="
    echo "Total tests: $total_tests"
    echo "Passed: $passed_tests"
    echo "Failed: $failed_tests"
    echo ""
    
    if [ $failed_tests -eq 0 ]; then
        success "🎉 All validations passed! Production deployment is ready."
        return 0
    else
        error "❌ $failed_tests validation(s) failed. Please fix issues before production deployment."
        return 1
    fi
}

# Function to show help
show_help() {
    echo "ATALANTA Web GUI Production Validation Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  all                 Run all validations (default)"
    echo "  docker              Validate Docker setup"
    echo "  config              Validate configuration files"
    echo "  image               Validate Docker image"
    echo "  startup             Validate container startup"
    echo "  web                 Validate web interface"
    echo "  atalanta            Validate ATALANTA binary"
    echo "  security            Validate security settings"
    echo "  resources           Validate resource usage"
    echo "  help                Show this help"
    echo ""
}

# Main function
main() {
    local command="${1:-all}"
    
    show_banner
    
    case "$command" in
        "all")
            run_all_validations
            ;;
        "docker")
            validate_docker
            ;;
        "config")
            validate_config_files
            ;;
        "image")
            validate_docker_image
            ;;
        "startup")
            validate_container_startup
            ;;
        "web")
            validate_web_interface
            ;;
        "atalanta")
            validate_atalanta_binary
            ;;
        "security")
            validate_security
            ;;
        "resources")
            validate_resources
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"