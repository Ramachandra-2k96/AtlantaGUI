#!/bin/bash

# ATALANTA Web GUI Health Check Script
# Performs comprehensive health checks for the container

set -e

# Exit codes
EXIT_OK=0
EXIT_WARNING=1
EXIT_CRITICAL=2

# Function to check if a service is running on a port
check_port() {
    local port=$1
    local service_name=$2
    
    if command -v nc >/dev/null 2>&1; then
        if nc -z localhost "$port" 2>/dev/null; then
            echo "✅ $service_name is responding on port $port"
            return 0
        else
            echo "❌ $service_name is not responding on port $port"
            return 1
        fi
    else
        # Fallback using /proc/net/tcp if nc is not available
        local hex_port=$(printf "%04X" "$port")
        if grep -q ":${hex_port} " /proc/net/tcp 2>/dev/null; then
            echo "✅ $service_name is listening on port $port"
            return 0
        else
            echo "❌ $service_name is not listening on port $port"
            return 1
        fi
    fi
}

# Function to check HTTP endpoint
check_http() {
    local url=$1
    local service_name=$2
    
    if command -v curl >/dev/null 2>&1; then
        if curl -f -s -o /dev/null --max-time 5 "$url"; then
            echo "✅ $service_name HTTP endpoint is healthy"
            return 0
        else
            echo "❌ $service_name HTTP endpoint is not responding"
            return 1
        fi
    else
        echo "⚠️  curl not available, skipping HTTP check for $service_name"
        return 1
    fi
}

# Function to check ATALANTA binary
check_atalanta() {
    if command -v atalanta >/dev/null 2>&1; then
        echo "✅ ATALANTA binary is available"
        return 0
    else
        echo "❌ ATALANTA binary is not available"
        return 1
    fi
}

# Function to check Node.js
check_nodejs() {
    if command -v node >/dev/null 2>&1; then
        local version=$(node --version 2>/dev/null)
        echo "✅ Node.js is available ($version)"
        return 0
    else
        echo "❌ Node.js is not available"
        return 1
    fi
}

# Function to check workspace
check_workspace() {
    if [ -d "/workspace" ] && [ -w "/workspace" ]; then
        echo "✅ Workspace is accessible and writable"
        return 0
    else
        echo "❌ Workspace is not accessible or not writable"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    local usage=$(df /workspace 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ -z "$usage" ]; then
        echo "⚠️  Could not determine disk usage"
        return 1
    fi
    
    if [ "$usage" -lt 90 ]; then
        echo "✅ Disk usage is healthy (${usage}%)"
        return 0
    elif [ "$usage" -lt 95 ]; then
        echo "⚠️  Disk usage is high (${usage}%)"
        return 1
    else
        echo "❌ Disk usage is critical (${usage}%)"
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    if command -v free >/dev/null 2>&1; then
        local mem_info=$(free | grep Mem)
        local total=$(echo "$mem_info" | awk '{print $2}')
        local used=$(echo "$mem_info" | awk '{print $3}')
        local usage=$((used * 100 / total))
        
        if [ "$usage" -lt 80 ]; then
            echo "✅ Memory usage is healthy (${usage}%)"
            return 0
        elif [ "$usage" -lt 90 ]; then
            echo "⚠️  Memory usage is high (${usage}%)"
            return 1
        else
            echo "❌ Memory usage is critical (${usage}%)"
            return 1
        fi
    else
        echo "⚠️  Could not determine memory usage"
        return 1
    fi
}

# Function to check web application files
check_web_app() {
    if [ -f "/app/server.js" ] && [ -d "/app/.next" ]; then
        echo "✅ Web application files are present"
        return 0
    else
        echo "❌ Web application files are missing"
        return 1
    fi
}

# Main health check function
main() {
    echo "🏥 ATALANTA Web GUI Health Check"
    echo "================================="
    echo "Timestamp: $(date)"
    echo ""
    
    local exit_code=$EXIT_OK
    local warnings=0
    local errors=0
    
    # Core component checks
    if ! check_atalanta; then
        errors=$((errors + 1))
        exit_code=$EXIT_CRITICAL
    fi
    
    if ! check_nodejs; then
        errors=$((errors + 1))
        exit_code=$EXIT_CRITICAL
    fi
    
    if ! check_web_app; then
        errors=$((errors + 1))
        exit_code=$EXIT_CRITICAL
    fi
    
    if ! check_workspace; then
        errors=$((errors + 1))
        exit_code=$EXIT_CRITICAL
    fi
    
    # Service checks (only if web mode is expected)
    if [ "${1:-web}" = "web" ]; then
        if ! check_port 3000 "Web Server"; then
            errors=$((errors + 1))
            exit_code=$EXIT_CRITICAL
        fi
        
        if ! check_http "http://localhost:3000" "Web Application"; then
            warnings=$((warnings + 1))
            if [ $exit_code -eq $EXIT_OK ]; then
                exit_code=$EXIT_WARNING
            fi
        fi
    fi
    
    # Resource checks
    if ! check_disk_space; then
        warnings=$((warnings + 1))
        if [ $exit_code -eq $EXIT_OK ]; then
            exit_code=$EXIT_WARNING
        fi
    fi
    
    if ! check_memory; then
        warnings=$((warnings + 1))
        if [ $exit_code -eq $EXIT_OK ]; then
            exit_code=$EXIT_WARNING
        fi
    fi
    
    echo ""
    echo "Health Check Summary:"
    echo "===================="
    
    case $exit_code in
        $EXIT_OK)
            echo "🟢 Status: HEALTHY"
            echo "All systems are operational"
            ;;
        $EXIT_WARNING)
            echo "🟡 Status: WARNING"
            echo "Some non-critical issues detected ($warnings warnings)"
            ;;
        $EXIT_CRITICAL)
            echo "🔴 Status: CRITICAL"
            echo "Critical issues detected ($errors errors, $warnings warnings)"
            ;;
    esac
    
    echo "Errors: $errors, Warnings: $warnings"
    echo ""
    
    exit $exit_code
}

# Run health check
main "$@"