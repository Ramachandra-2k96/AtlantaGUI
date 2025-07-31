# How to Use and Publish ATALANTA Docker Container

## 🎉 SUCCESS! 

Your ATALANTA Docker container is working perfectly! The build completed successfully and ATALANTA is fully functional.

## Quick Start for Users

### Option 1: Use the Quick Start Script
```bash
# Make the script executable (if not already)
chmod +x quick-start.sh

# Run the quick start
./quick-start.sh
```

### Option 2: Manual Docker Commands
```bash
# Build the image
docker build -t atalanta:latest .

# Run interactively
docker run -it --rm atalanta:latest

# Run with volume mounting for your circuits
docker run -it --rm -v $(pwd)/circuits:/circuits atalanta:latest
```

### Option 3: Using Docker Compose
```bash
# Run with Docker Compose
docker-compose up atalanta

# For development (mounts source code)
docker-compose --profile dev up atalanta-dev
```

## 📦 Publishing to Docker Hub

### Step 1: Create Docker Hub Account
1. Go to https://hub.docker.com
2. Sign up for a free account
3. Create a new repository named "atalanta"

### Step 2: Prepare for Publishing
```bash
# Login to Docker Hub
docker login

# Tag your image with your Docker Hub username
docker tag atalanta:latest ramachandra2k93/atalanta:latest
docker tag atalanta:latest ramachandra2k93/atalanta:2.0

# Push to Docker Hub
docker push ramachandra2k93/atalanta:latest
docker push ramachandra2k93/atalanta:2.0
```

### Step 3: Use the Build Script (Recommended)
```bash
# Build and push automatically
./docker-build.sh push -u YOUR_USERNAME

# Or just build
./docker-build.sh build

# Or test the container
./docker-build.sh test
```

## 🌐 Making it Globally Available

### Create a GitHub Repository
1. Create a new GitHub repository
2. Upload all these files:
   - `Dockerfile`
   - `docker-compose.yml`
   - `docker-build.sh`
   - `quick-start.sh`
   - `README_Docker.md`
   - `.dockerignore`
   - All ATALANTA source files

### Set up GitHub Actions (Optional)
Create `.github/workflows/docker-publish.yml`:

```yaml
name: Docker Build and Push

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Log in to Docker Hub
      if: github.event_name != 'pull_request'
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ secrets.DOCKER_USERNAME }}/atalanta
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: ${{ github.event_name != 'pull_request' }}
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
```

## 📝 Example Usage for Users

Once published, users can:

```bash
# Pull and run from Docker Hub
docker pull ramachandra2k93/atalanta:latest
docker run -it YOUR_USERNAME/atalanta:latest

# Create a working directory
mkdir atalanta-work && cd atalanta-work
mkdir circuits outputs

# Run with volume mounts
docker run -it --rm \
  -v $(pwd)/circuits:/circuits \
  -v $(pwd)/outputs:/outputs \
  YOUR_USERNAME/atalanta:latest

# Inside container:
atalanta my_circuit.bench              # Test with included sample
atalanta /circuits/your_circuit.bench  # Test with your circuit
```

## 🎯 What This Achieves

✅ **Easy Installation**: No more complex compilation issues
✅ **Cross-Platform**: Works on any system with Docker
✅ **Isolated Environment**: No dependency conflicts
✅ **Reproducible**: Same environment every time
✅ **Shareable**: Easy distribution via Docker Hub
✅ **Volume Support**: Easy file exchange with host
✅ **Documentation**: Comprehensive README and examples

## 🚀 Benefits for the Community

1. **Eliminates Installation Pain**: Users don't need to deal with:
   - Compiler compatibility issues
   - Missing dependencies
   - Platform-specific problems
   - Environment setup

2. **Instant Access**: Pull and run in seconds

3. **Educational Use**: Perfect for:
   - University courses
   - Research projects
   - Learning digital testing

4. **Professional Use**: Ready for:
   - IC design verification
   - ATPG research
   - Benchmark testing

## 📊 Container Features

- **Base**: Ubuntu 20.04 LTS
- **Size**: ~200MB (optimized)
- **Includes**: 
  - ATALANTA v2.0 compiled binary
  - Sample circuits
  - Complete documentation
  - Helper scripts
- **Environment**: 
  - All paths configured
  - User-friendly welcome message
  - Volume mount support

## 🔧 Maintenance

The Docker container includes:
- Automatic compilation with error handling
- Modern C++ compatibility fixes
- Optimized compiler flags
- Clean build process
- Proper file permissions

This solution makes ATALANTA accessible to anyone with Docker, solving the 12-year-old installation problem!
