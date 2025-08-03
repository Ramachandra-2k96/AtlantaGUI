#!/bin/bash

# ATALANTA Web GUI Production Deployment Script
# Comprehensive deployment with security checks and monitoring

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
ENV_FILE="${PROJECT_ROOT}/.env.production"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.production.yml"

# Default values
DEFAULT_WEB_PORT=3000
DEFAULT_HTTPS_PORT=443
DEFAULT_HTTP_PORT=80
DEFAULT_WORKSPACE_PATH="${PROJECT_ROOT}/data/workspace"

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

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Function to show banner
show_banner() {
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║              ATALANTA Web GUI Production Deployment          ║${NC}"
    echo -e "${PURPLE}║                     Version 2.0                             ║${NC}"
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
    
    # Check Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon is not running"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Function to create environment file
create_env_file() {
    log "Creating production environment file..."
    
    if [ -f "$ENV_FILE" ]; then
        warning "Environment file already exists: $ENV_FILE"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Using existing environment file"
            return
        fi
    fi
    
    cat > "$ENV_FILE" << EOF
# ATALANTA Web GUI Production Environment Configuration
# Generated on $(date)

# Port configuration
WEB_PORT=${WEB_PORT:-$DEFAULT_WEB_PORT}
HTTPS_PORT=${HTTPS_PORT:-$DEFAULT_HTTPS_PORT}
HTTP_PORT=${HTTP_PORT:-$DEFAULT_HTTP_PORT}

# Workspace configuration
WORKSPACE_PATH=${WORKSPACE_PATH:-$DEFAULT_WORKSPACE_PATH}

# Monitoring ports
PROMETHEUS_PORT=9090
FLUENTD_PORT=24224

# Security settings
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Docker settings
COMPOSE_PROJECT_NAME=atalanta-production
COMPOSE_FILE=${COMPOSE_FILE}

# Backup settings
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
EOF
    
    success "Environment file created: $ENV_FILE"
}

# Function to create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    local workspace_path="${WORKSPACE_PATH:-$DEFAULT_WORKSPACE_PATH}"
    
    mkdir -p "$workspace_path"/{circuits,outputs,work}
    mkdir -p "${PROJECT_ROOT}/data/logs"
    mkdir -p "${PROJECT_ROOT}/nginx/ssl"
    mkdir -p "${PROJECT_ROOT}/logging"
    
    # Set proper permissions
    chmod 755 "$workspace_path"
    chmod -R 755 "${PROJECT_ROOT}/data"
    
    success "Directories created successfully"
}

# Function to generate SSL certificates (self-signed for development)
generate_ssl_certificates() {
    log "Checking SSL certificates..."
    
    local ssl_dir="${PROJECT_ROOT}/nginx/ssl"
    local cert_file="$ssl_dir/cert.pem"
    local key_file="$ssl_dir/key.pem"
    
    if [ -f "$cert_file" ] && [ -f "$key_file" ]; then
        log "SSL certificates already exist"
        return
    fi
    
    warning "SSL certificates not found. Generating self-signed certificates..."
    warning "For production, replace with proper SSL certificates from a CA"
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$key_file" \
        -out "$cert_file" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
        2>/dev/null
    
    chmod 600 "$key_file"
    chmod 644 "$cert_file"
    
    success "Self-signed SSL certificates generated"
}

# Function to build Docker images
build_images() {
    log "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build production image
    docker build -f Dockerfile.production -t atalanta-web-gui:production .
    
    success "Docker images built successfully"
}

# Function to run security checks
run_security_checks() {
    log "Running security checks..."
    
    # Check for secrets in environment files
    if grep -r "password\|secret\|key" "$ENV_FILE" 2>/dev/null | grep -v "^#"; then
        warning "Potential secrets found in environment file"
    fi
    
    # Check file permissions
    local workspace_path="${WORKSPACE_PATH:-$DEFAULT_WORKSPACE_PATH}"
    if [ -d "$workspace_path" ]; then
        local perms=$(stat -c "%a" "$workspace_path" 2>/dev/null || stat -f "%A" "$workspace_path" 2>/dev/null)
        if [ "$perms" != "755" ]; then
            warning "Workspace permissions are not optimal: $perms"
        fi
    fi
    
    success "Security checks completed"
}

# Function to start services
start_services() {
    log "Starting ATALANTA Web GUI services..."
    
    cd "$PROJECT_ROOT"
    
    # Load environment variables
    if [ -f "$ENV_FILE" ]; then
        export $(grep -v '^#' "$ENV_FILE" | xargs)
    fi
    
    # Start core services
    docker-compose -f "$COMPOSE_FILE" up -d atalanta-web
    
    # Wait for health check
    log "Waiting for services to be healthy..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f "$COMPOSE_FILE" ps | grep -q "healthy"; then
            success "Services are healthy"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "Services failed to become healthy within timeout"
            docker-compose -f "$COMPOSE_FILE" logs atalanta-web
            exit 1
        fi
        
        log "Attempt $attempt/$max_attempts - waiting for services..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    success "ATALANTA Web GUI started successfully"
}

# Function to start optional services
start_optional_services() {
    local profile="$1"
    
    case "$profile" in
        "proxy")
            log "Starting reverse proxy..."
            docker-compose -f "$COMPOSE_FILE" --profile with-proxy up -d nginx
            ;;
        "monitoring")
            log "Starting monitoring services..."
            docker-compose -f "$COMPOSE_FILE" --profile with-monitoring up -d prometheus
            ;;
        "logging")
            log "Starting logging services..."
            docker-compose -f "$COMPOSE_FILE" --profile with-logging up -d fluentd
            ;;
        "all")
            log "Starting all optional services..."
            docker-compose -f "$COMPOSE_FILE" --profile with-proxy --profile with-monitoring --profile with-logging up -d
            ;;
        *)
            warning "Unknown profile: $profile"
            ;;
    esac
}

# Function to show deployment status
show_status() {
    log "Deployment Status:"
    echo "=================="
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    log "Service URLs:"
    echo "============="
    
    local web_port="${WEB_PORT:-$DEFAULT_WEB_PORT}"
    local https_port="${HTTPS_PORT:-$DEFAULT_HTTPS_PORT}"
    
    echo "Web Interface: http://localhost:$web_port"
    
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q nginx; then
        echo "HTTPS Interface: https://localhost:$https_port"
    fi
    
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q prometheus; then
        echo "Monitoring: http://localhost:9090"
    fi
    
    echo ""
    log "Logs:"
    echo "====="
    echo "View logs: docker-compose -f $COMPOSE_FILE logs -f"
    echo "View specific service: docker-compose -f $COMPOSE_FILE logs -f atalanta-web"
}

# Function to create backup
create_backup() {
    log "Creating backup..."
    
    local backup_dir="${PROJECT_ROOT}/backups/$(date +%Y%m%d_%H%M%S)"
    local workspace_path="${WORKSPACE_PATH:-$DEFAULT_WORKSPACE_PATH}"
    
    mkdir -p "$backup_dir"
    
    # Backup workspace data
    if [ -d "$workspace_path" ]; then
        tar -czf "$backup_dir/workspace.tar.gz" -C "$(dirname "$workspace_path")" "$(basename "$workspace_path")"
    fi
    
    # Backup configuration
    cp "$ENV_FILE" "$backup_dir/" 2>/dev/null || true
    cp "$COMPOSE_FILE" "$backup_dir/" 2>/dev/null || true
    
    success "Backup created: $backup_dir"
}

# Function to show help
show_help() {
    echo "ATALANTA Web GUI Production Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  deploy              Full deployment (default)"
    echo "  start               Start services"
    echo "  stop                Stop services"
    echo "  restart             Restart services"
    echo "  status              Show deployment status"
    echo "  logs                Show service logs"
    echo "  backup              Create backup"
    echo "  cleanup             Clean up resources"
    echo "  help                Show this help"
    echo ""
    echo "Options:"
    echo "  --with-proxy        Include reverse proxy"
    echo "  --with-monitoring   Include monitoring services"
    echo "  --with-logging      Include logging services"
    echo "  --with-all          Include all optional services"
    echo ""
    echo "Environment Variables:"
    echo "  WEB_PORT            Web interface port (default: 3000)"
    echo "  HTTPS_PORT          HTTPS port (default: 443)"
    echo "  HTTP_PORT           HTTP port (default: 80)"
    echo "  WORKSPACE_PATH      Workspace directory path"
    echo ""
}

# Main function
main() {
    local command="${1:-deploy}"
    shift || true
    
    show_banner
    
    case "$command" in
        "deploy")
            check_prerequisites
            create_env_file
            create_directories
            generate_ssl_certificates
            build_images
            run_security_checks
            start_services
            
            # Handle optional services
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --with-proxy)
                        start_optional_services "proxy"
                        shift
                        ;;
                    --with-monitoring)
                        start_optional_services "monitoring"
                        shift
                        ;;
                    --with-logging)
                        start_optional_services "logging"
                        shift
                        ;;
                    --with-all)
                        start_optional_services "all"
                        shift
                        ;;
                    *)
                        warning "Unknown option: $1"
                        shift
                        ;;
                esac
            done
            
            show_status
            success "Deployment completed successfully!"
            ;;
        "start")
            start_services
            show_status
            ;;
        "stop")
            log "Stopping services..."
            cd "$PROJECT_ROOT"
            docker-compose -f "$COMPOSE_FILE" down
            success "Services stopped"
            ;;
        "restart")
            log "Restarting services..."
            cd "$PROJECT_ROOT"
            docker-compose -f "$COMPOSE_FILE" restart
            show_status
            ;;
        "status")
            show_status
            ;;
        "logs")
            cd "$PROJECT_ROOT"
            docker-compose -f "$COMPOSE_FILE" logs -f
            ;;
        "backup")
            create_backup
            ;;
        "cleanup")
            log "Cleaning up resources..."
            cd "$PROJECT_ROOT"
            docker-compose -f "$COMPOSE_FILE" down -v --remove-orphans
            docker system prune -f
            success "Cleanup completed"
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