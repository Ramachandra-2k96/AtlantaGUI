# ATALANTA Web GUI

A modern web-based interface for the ATALANTA Test Pattern Generator, providing a VS Code-like experience for circuit designers.

## Quick Start

### Option 1: Single Command (Recommended)
```bash
# Start the web interface with persistent storage
docker run -p 3000:3000 -v atalanta_data:/workspace atalanta-web-gui:latest

# Access the web interface at: http://localhost:3000
```

### Option 2: Using Docker Compose
```bash
# Start the web interface
docker-compose up atalanta-web

# Access the web interface at: http://localhost:3000
```

### Option 3: Using the Quick Start Script
```bash
# Build and start the web interface
./run-web-gui.sh

# Or with custom port
./run-web-gui.sh web --port 8080

# Start CLI mode
./run-web-gui.sh cli
```

## Building the Image

### Manual Build
```bash
# Build the web GUI image
docker build -f Dockerfile.web -t atalanta-web-gui:latest .
```

### Using Build Script
```bash
# Build with cache
./docker-build-web.sh

# Build without cache
./docker-build-web.sh --no-cache
```

## Usage Modes

### Web Interface Mode (Default)
Provides a modern web-based GUI similar to VS Code:
- File explorer with drag-and-drop support
- Integrated terminal
- Code editor with syntax highlighting
- Graphical ATALANTA runner
- Results viewer

```bash
docker run -p 3000:3000 -v atalanta_data:/workspace atalanta-web-gui:latest web
```

### CLI Mode
Traditional command-line interface with enhanced features:
```bash
docker run -it -v atalanta_data:/workspace atalanta-web-gui:latest cli
```

### Health Check
Verify that all components are working correctly:
```bash
docker run --rm atalanta-web-gui:latest health
```

## Data Persistence

### Named Volume (Recommended)
Uses Docker named volumes for automatic data persistence:
```bash
docker run -p 3000:3000 -v atalanta_data:/workspace atalanta-web-gui:latest
```

### Local Directory Binding
Bind a local directory for direct file access:
```bash
# Create local workspace
mkdir -p ./my-circuits

# Run with local binding
docker run -p 3000:3000 -v $(pwd)/my-circuits:/workspace/circuits atalanta-web-gui:latest
```

### Docker Compose Profiles
```bash
# Default web interface with named volume
docker-compose up atalanta-web

# Web interface with local directory binding
docker-compose --profile local up atalanta-web-local

# CLI mode
docker-compose --profile cli up atalanta-web-cli
```

## Container Architecture

The container includes:
- **ATALANTA Binary**: Original C++ test pattern generator
- **Node.js Runtime**: Version 18.x LTS for web application
- **Next.js Application**: Modern React-based web interface
- **System Tools**: vim, nano, git, tree, and other utilities

### Multi-stage Build
1. **Stage 1**: Builds the ATALANTA binary from source
2. **Stage 2**: Creates the web-enabled container with Node.js and Next.js

## Directory Structure

```
/workspace/
├── circuits/     # Your .bench circuit files
├── outputs/      # ATALANTA output files (.test, .vec, .log)
└── work/         # General workspace

/app/             # Next.js web application
/opt/atalanta/    # ATALANTA binary and documentation
```

## Environment Variables

- `NODE_ENV=production` - Next.js production mode
- `NEXT_TELEMETRY_DISABLED=1` - Disable Next.js telemetry
- `ATALANTA_HOME=/opt/atalanta` - ATALANTA installation directory
- `WORKSPACE=/workspace` - User workspace directory

## Port Configuration

- **Default Port**: 3000
- **Custom Port**: Use `-p HOST_PORT:3000` to map to different host port

```bash
# Run on port 8080
docker run -p 8080:3000 -v atalanta_data:/workspace atalanta-web-gui:latest
```

## Advanced Usage

### Multiple Containers
Run multiple instances with different ports:
```bash
# Instance 1 on port 3000
docker run -d --name atalanta-web-1 -p 3000:3000 -v atalanta_data_1:/workspace atalanta-web-gui:latest

# Instance 2 on port 3001
docker run -d --name atalanta-web-2 -p 3001:3000 -v atalanta_data_2:/workspace atalanta-web-gui:latest
```

### Development Mode
For development with source code changes:
```bash
# Mount source code for development
docker run -p 3000:3000 -v atalanta_data:/workspace -v $(pwd):/opt/atalanta-source:ro atalanta-web-gui:latest
```

### Resource Limits
Set memory and CPU limits:
```bash
docker run -p 3000:3000 -v atalanta_data:/workspace --memory=1g --cpus=2 atalanta-web-gui:latest
```

## Troubleshooting

### Container Won't Start
```bash
# Check container health
docker run --rm atalanta-web-gui:latest health

# View container logs
docker logs atalanta-web-gui
```

### Port Already in Use
```bash
# Use different port
docker run -p 3001:3000 -v atalanta_data:/workspace atalanta-web-gui:latest

# Or stop conflicting container
docker stop $(docker ps -q --filter "publish=3000")
```

### Permission Issues
```bash
# Check volume permissions
docker run --rm -v atalanta_data:/workspace atalanta-web-gui:latest ls -la /workspace

# Fix permissions if needed
docker run --rm -v atalanta_data:/workspace atalanta-web-gui:latest chown -R atalanta_user:atalanta_user /workspace
```

### Build Issues
```bash
# Clean build without cache
./docker-build-web.sh --no-cache

# Or manually
docker build --no-cache -f Dockerfile.web -t atalanta-web-gui:latest .
```

## Container Management

### Start/Stop
```bash
# Start in background
docker run -d --name atalanta-web -p 3000:3000 -v atalanta_data:/workspace atalanta-web-gui:latest

# Stop container
docker stop atalanta-web

# Start existing container
docker start atalanta-web

# Remove container
docker rm atalanta-web
```

### Data Backup
```bash
# Backup workspace data
docker run --rm -v atalanta_data:/workspace -v $(pwd):/backup atalanta-web-gui:latest tar czf /backup/atalanta-backup.tar.gz -C /workspace .

# Restore workspace data
docker run --rm -v atalanta_data:/workspace -v $(pwd):/backup atalanta-web-gui:latest tar xzf /backup/atalanta-backup.tar.gz -C /workspace
```

## Features

### Current Features (Task 1 Complete)
- ✅ Multi-stage Docker build with ATALANTA + Node.js
- ✅ Web server and CLI mode support
- ✅ Named volume persistence
- ✅ Health check system
- ✅ Docker Compose configuration
- ✅ Quick start scripts

### Upcoming Features (Future Tasks)
- 🔄 Next.js application with TypeScript
- 🔄 VS Code-like file explorer
- 🔄 Integrated terminal with xterm.js
- 🔄 Monaco code editor with .bench syntax
- 🔄 Graphical ATALANTA runner
- 🔄 Enhanced results viewer
- 🔄 Project management system

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 1.1**: ✅ Single Docker command starts both Next.js web server and ATALANTA CLI
- **Requirement 1.2**: ✅ Named Docker volume automatically created for persistent data storage
- **Requirement 1.3**: ✅ Web interface accessible at `http://localhost:3000`
- **Requirement 1.4**: ✅ Container restart preserves all user files and project data

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Run health check: `docker run --rm atalanta-web-gui:latest health`
3. View container logs: `docker logs atalanta-web-gui`
4. Verify Docker is running: `docker info`