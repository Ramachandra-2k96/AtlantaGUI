# ATALANTA Test Pattern Generator - Docker Virtual Machine

🚀 **Transform your ATALANTA experience!** This Docker solution provides a virtual machine-like environment for ATALANTA that's persistent, easy to use, and works on any system with Docker.

## 🎯 What This Solves

- ❌ **No more compilation headaches** - ATALANTA comes pre-compiled
- 🔄 **Persistent workspace** - Your work survives container restarts
- 🖥️ **Virtual machine experience** - Enter a dedicated ATALANTA environment
- 🐳 **Cross-platform** - Works on Windows, Mac, Linux
- ⚡ **One-command setup** - Get started instantly

## 🚀 Quick Start (Recommended)

### Step 1: One-Time Setup
```bash
# Clone or download this repository
git clone <your-repo> # or download and extract

# Make scripts executable
chmod +x quick-start.sh run-atalanta.sh

# Start ATALANTA Virtual Machine
./quick-start.sh
```

### Step 2: Choose Option 1
When prompted, select **option 1** to start the virtual machine.

### Step 3: Work Inside ATALANTA
You'll enter a persistent workspace that looks like this:
```
📁 Workspace Status:
   Current Directory: /workspace
   User: atalanta_user
   Container: ATALANTA-Docker

📂 Available Directories:
   /workspace/circuits  - Your circuit files (.bench)
   /workspace/outputs   - ATALANTA output files
   /workspace/work      - General workspace

🔧 ATALANTA Quick Commands:
   atalanta circuit.bench          - Run ATALANTA on a circuit
   atalanta -h                     - Show ATALANTA help

🧭 Quick Navigation:
   circuits                        - Go to circuits directory
   outputs                         - Go to outputs directory
   work                           - Go to work directory
```

## 🔄 Persistent Storage

Your work is automatically saved! The `/workspace` directory persists between sessions:

- **Exit safely**: Type `exit` to leave the container
- **Return anytime**: Run `./run-atalanta.sh` to return to your work
- **Data persists**: Files in `/workspace` are never lost

## 📋 Daily Usage

### Starting ATALANTA
```bash
# Simple start
./run-atalanta.sh

# Or use the menu
./quick-start.sh
```

### Working with Circuits
```bash
# Inside the container:
circuits                           # Go to circuits directory
atalanta my_circuit.bench          # Run ATALANTA
outputs                           # Check results
```

### Managing Your Work
```bash
# Check system status
status

# Check what's mounted
mount-check

# Clean outputs if needed
clean-outputs

# Get Docker help
help-docker
```

## 🛠️ Advanced Usage

### Local Directory Mounting
Mount your local directories directly:
```bash
# Create local workspace
mkdir -p local-workspace/{circuits,outputs,work}

# Run with local mounting
docker run -it --name atalanta-local \
  -v $(pwd)/local-workspace:/workspace \
  atalanta:latest
```

### Docker Compose Options
```bash
# Standard persistent mode
docker-compose up atalanta

# Development mode
docker-compose --profile dev up atalanta-dev

# Local directory mode
docker-compose --profile local up atalanta-local
```

### Manual Docker Commands
```bash
# Build image
docker build -t atalanta:latest .

# Create persistent container
docker run -it --name atalanta-vm \
  -v atalanta_workspace:/workspace \
  atalanta:latest

# Reconnect to existing container
docker exec -it atalanta-vm /bin/bash

# Start stopped container
docker start atalanta-vm && docker exec -it atalanta-vm /bin/bash
```

## 🔧 Container Management

### Basic Operations
```bash
# Check running containers
docker ps

# Stop container
docker stop atalanta-container

# Start stopped container
docker start atalanta-container

# Remove container (keeps data)
docker rm atalanta-container

# Remove everything (loses data!)
docker volume rm atalanta_workspace
```

### Cleanup Options
Use the quick-start script for guided cleanup:
```bash
./quick-start.sh
# Choose option 5 for cleanup menu
```

## 📁 Directory Structure

### Inside Container
```
/workspace/
├── circuits/     # Your .bench files
├── outputs/      # ATALANTA results
└── work/         # General workspace

/opt/atalanta/    # ATALANTA installation
└── bin/atalanta  # ATALANTA binary
```

### Host Machine
```
project/
├── Dockerfile
├── docker-compose.yml
├── quick-start.sh
├── run-atalanta.sh
├── entrypoint.sh
└── [ATALANTA source files]
```

## 🎓 ATALANTA Usage Examples

### Basic Test Generation
```bash
# Inside the container
circuits
atalanta s27.bench              # Run on sample circuit
outputs                         # Check results
ls -la                         # See generated files
```

### Working with Your Circuits
```bash
# Copy circuit to container (from host)
docker cp my_circuit.bench atalanta-container:/workspace/circuits/

# Or mount local directory
docker run -v $(pwd)/my-circuits:/workspace/circuits atalanta:latest

# Run ATALANTA
atalanta /workspace/circuits/my_circuit.bench
```

## 🚨 Troubleshooting

### Container Won't Start
```bash
# Check if Docker is running
docker --version

# Rebuild image
docker build -t atalanta:latest .

# Check for port conflicts
docker ps -a
```

### Data Not Persisting
```bash
# Check volumes
docker volume ls

# Verify mount points
mount-check  # (inside container)

# Use named volumes (recommended)
docker run -v atalanta_workspace:/workspace atalanta:latest
```

### ATALANTA Errors
```bash
# Check ATALANTA installation
which atalanta
atalanta -h

# Verify file permissions
ls -la /workspace/circuits/
```

## 🔄 Updating ATALANTA

To update the Docker image:
```bash
# Rebuild with latest changes
docker build -t atalanta:latest .

# Or pull from registry (if published)
docker pull your-username/atalanta:latest
```

## 📦 Publishing Your Image

See `DOCKER_GUIDE.md` for instructions on publishing to Docker Hub.

## 💡 Tips & Best Practices

1. **Use persistent volumes** for important work
2. **Exit gracefully** with `exit` command
3. **Check status** regularly with `status` command
4. **Mount local directories** when sharing files frequently
5. **Backup important circuits** outside the container

## 📞 Support

- 📖 Read `DOCKER_GUIDE.md` for detailed setup
- 🐳 Check Docker documentation for container issues
- 🔧 Use `help-docker` command inside container
- 📝 Check ATALANTA man pages with `man atalanta`

---

**🎉 Enjoy your hassle-free ATALANTA experience!**
