# ATALANTA Web GUI Production Deployment Guide

This guide provides comprehensive instructions for deploying the ATALANTA Web GUI in production environments with security best practices, monitoring, and high availability.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Deployment Options](#deployment-options)
- [Security Considerations](#security-considerations)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## Quick Start

### Basic Production Deployment

```bash
# Clone the repository
git clone <repository-url>
cd atalanta

# Run the production deployment script
./scripts/deploy-production.sh

# Access the web interface
open http://localhost:3000
```

### Full Production Deployment with All Features

```bash
# Deploy with reverse proxy, monitoring, and logging
./scripts/deploy-production.sh deploy --with-all
```

## Architecture Overview

The production deployment consists of multiple components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │────│  ATALANTA Web   │────│   Prometheus    │
│   (SSL/TLS)     │    │      GUI        │    │   Monitoring    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   Fluentd       │              │
         └──────────────│   Logging       │──────────────┘
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │  Persistent     │
                        │  Storage        │
                        └─────────────────┘
```

### Components

1. **ATALANTA Web GUI**: Main application container with Next.js frontend and ATALANTA binary
2. **Nginx Reverse Proxy**: SSL termination, load balancing, and security headers
3. **Prometheus**: Metrics collection and monitoring
4. **Fluentd**: Log aggregation and forwarding
5. **Persistent Storage**: Named volumes for data persistence

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows with WSL2
- **Memory**: Minimum 2GB RAM, 4GB+ recommended
- **Storage**: Minimum 10GB free space, SSD recommended
- **Network**: Internet connection for initial setup

### Software Requirements

- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **OpenSSL**: For SSL certificate generation
- **Git**: For repository cloning

### Installation Commands

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose openssl git

# CentOS/RHEL
sudo yum install docker docker-compose openssl git

# macOS (with Homebrew)
brew install docker docker-compose openssl git

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

## Configuration

### Environment Variables

Create or modify `.env.production` file:

```bash
# Port configuration
WEB_PORT=3000
HTTPS_PORT=443
HTTP_PORT=80

# Workspace configuration
WORKSPACE_PATH=/opt/atalanta/data/workspace

# Security settings
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Monitoring
PROMETHEUS_PORT=9090
FLUENTD_PORT=24224

# Backup settings
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
```

### SSL/TLS Configuration

#### Option 1: Self-Signed Certificates (Development/Testing)

```bash
# Certificates are automatically generated during deployment
./scripts/deploy-production.sh
```

#### Option 2: Let's Encrypt Certificates (Production)

```bash
# Install certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
sudo chown $USER:$USER nginx/ssl/*.pem
```

#### Option 3: Custom Certificates

```bash
# Copy your certificates to the nginx/ssl directory
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem
```

## Deployment Options

### 1. Basic Deployment

Minimal production setup with just the web application:

```bash
./scripts/deploy-production.sh deploy
```

### 2. Deployment with Reverse Proxy

Includes Nginx reverse proxy with SSL termination:

```bash
./scripts/deploy-production.sh deploy --with-proxy
```

### 3. Deployment with Monitoring

Includes Prometheus monitoring:

```bash
./scripts/deploy-production.sh deploy --with-monitoring
```

### 4. Full Production Deployment

Includes all components (proxy, monitoring, logging):

```bash
./scripts/deploy-production.sh deploy --with-all
```

### 5. Custom Docker Compose

For advanced configurations, use Docker Compose directly:

```bash
# Start core services
docker-compose -f docker-compose.production.yml up -d

# Start with specific profiles
docker-compose -f docker-compose.production.yml --profile with-proxy up -d

# Start all services
docker-compose -f docker-compose.production.yml --profile with-proxy --profile with-monitoring --profile with-logging up -d
```

## Security Considerations

### Container Security

1. **Non-root User**: All processes run as non-root user (UID 1001)
2. **Read-only Root Filesystem**: Container filesystem is read-only except for specific directories
3. **Resource Limits**: CPU and memory limits are enforced
4. **Security Options**: `no-new-privileges` flag prevents privilege escalation

### Network Security

1. **Custom Network**: Services communicate over isolated Docker network
2. **Port Restrictions**: Only necessary ports are exposed
3. **SSL/TLS**: All external communication is encrypted
4. **Security Headers**: Comprehensive security headers via Nginx

### Application Security

1. **Input Validation**: All user inputs are validated and sanitized
2. **CSRF Protection**: Cross-site request forgery protection
3. **Content Security Policy**: Strict CSP headers prevent XSS attacks
4. **Rate Limiting**: API endpoints have rate limiting enabled

### File System Security

1. **Path Validation**: All file paths are validated to prevent directory traversal
2. **Permission Checks**: Proper file permissions are enforced
3. **Workspace Isolation**: User files are isolated to workspace directory

## Monitoring and Logging

### Health Checks

The application includes comprehensive health checks:

```bash
# Check application health
docker exec atalanta-web-production /opt/atalanta/healthcheck.sh

# View health check logs
docker-compose -f docker-compose.production.yml logs atalanta-web
```

### Prometheus Metrics

Access Prometheus dashboard at `http://localhost:9090` (if monitoring is enabled):

- Application metrics: `/api/metrics`
- Container metrics: cAdvisor integration
- System metrics: Node exporter integration

### Log Management

Logs are collected and managed through multiple channels:

1. **Container Logs**: `docker-compose logs`
2. **Application Logs**: Structured JSON logs
3. **Nginx Logs**: Access and error logs
4. **Fluentd**: Centralized log aggregation (if enabled)

```bash
# View all logs
docker-compose -f docker-compose.production.yml logs -f

# View specific service logs
docker-compose -f docker-compose.production.yml logs -f atalanta-web

# View nginx logs
docker-compose -f docker-compose.production.yml logs -f nginx
```

## Backup and Recovery

### Automated Backups

```bash
# Create manual backup
./scripts/deploy-production.sh backup

# Backup location
ls -la backups/
```

### Backup Contents

- **Workspace Data**: All user circuits and outputs
- **Configuration Files**: Environment and compose files
- **SSL Certificates**: Security certificates
- **Application Data**: User preferences and settings

### Recovery Process

```bash
# Stop services
./scripts/deploy-production.sh stop

# Restore workspace data
tar -xzf backups/YYYYMMDD_HHMMSS/workspace.tar.gz -C data/

# Restart services
./scripts/deploy-production.sh start
```

### Volume Management

```bash
# List volumes
docker volume ls | grep atalanta

# Backup volume
docker run --rm -v atalanta_workspace:/data -v $(pwd)/backups:/backup alpine tar czf /backup/workspace-$(date +%Y%m%d).tar.gz -C /data .

# Restore volume
docker run --rm -v atalanta_workspace:/data -v $(pwd)/backups:/backup alpine tar xzf /backup/workspace-YYYYMMDD.tar.gz -C /data
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Check what's using the port
sudo netstat -tulpn | grep :3000

# Kill the process or change the port
export WEB_PORT=3001
./scripts/deploy-production.sh restart
```

#### 2. Permission Denied

```bash
# Fix workspace permissions
sudo chown -R 1001:1001 data/workspace
chmod -R 755 data/workspace
```

#### 3. SSL Certificate Issues

```bash
# Regenerate self-signed certificates
rm -f nginx/ssl/*.pem
./scripts/deploy-production.sh deploy
```

#### 4. Container Won't Start

```bash
# Check container logs
docker-compose -f docker-compose.production.yml logs atalanta-web

# Check system resources
docker system df
docker system prune -f
```

### Diagnostic Commands

```bash
# System status
./scripts/deploy-production.sh status

# Health check
docker exec atalanta-web-production /opt/atalanta/healthcheck.sh

# Resource usage
docker stats

# Network connectivity
docker exec atalanta-web-production ping -c 3 google.com
```

### Log Analysis

```bash
# Search for errors
docker-compose -f docker-compose.production.yml logs | grep -i error

# Monitor real-time logs
docker-compose -f docker-compose.production.yml logs -f --tail=100

# Export logs
docker-compose -f docker-compose.production.yml logs > atalanta-logs-$(date +%Y%m%d).log
```

## Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor application health
- Check disk space usage
- Review error logs

#### Weekly
- Update system packages
- Rotate log files
- Create data backups

#### Monthly
- Update Docker images
- Review security settings
- Performance optimization

### Update Process

```bash
# Pull latest changes
git pull origin main

# Rebuild images
docker-compose -f docker-compose.production.yml build --no-cache

# Rolling update
docker-compose -f docker-compose.production.yml up -d
```

### Performance Optimization

```bash
# Clean up unused resources
docker system prune -f

# Optimize images
docker image prune -f

# Monitor resource usage
docker stats --no-stream
```

### Security Updates

```bash
# Update base images
docker pull node:18-alpine
docker pull nginx:alpine
docker pull prom/prometheus:latest

# Rebuild with updated base images
docker-compose -f docker-compose.production.yml build --pull --no-cache
```

## Support and Documentation

### Getting Help

1. **Check Logs**: Always start with container logs
2. **Health Checks**: Use built-in health check commands
3. **Documentation**: Refer to this guide and inline comments
4. **Community**: Check project issues and discussions

### Useful Commands Reference

```bash
# Deployment
./scripts/deploy-production.sh deploy --with-all

# Status and monitoring
./scripts/deploy-production.sh status
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs -f

# Maintenance
./scripts/deploy-production.sh backup
./scripts/deploy-production.sh cleanup

# Emergency stop
docker-compose -f docker-compose.production.yml down
```

### Configuration Files

- `docker-compose.production.yml`: Main orchestration file
- `.env.production`: Environment configuration
- `nginx/nginx.conf`: Reverse proxy configuration
- `monitoring/prometheus.yml`: Monitoring configuration
- `Dockerfile.production`: Production container definition

---

For additional support or questions, please refer to the project documentation or create an issue in the project repository.