# ATALANTA Test Pattern Generator Docker Image
# This Dockerfile creates a persistent containerized environment for ATALANTA v2.0
# ATALANTA is an automatic test pattern generator for stuck-at faults in combinational circuits

FROM ubuntu:20.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Set up the environment
ENV ATALANTA_HOME=/opt/atalanta
ENV ATALANTA_MAN=/opt/atalanta
ENV PATH="${PATH}:/opt/atalanta/bin"
ENV WORKSPACE=/workspace

# Install necessary packages for a full development environment
RUN apt-get update && apt-get install -y \
    build-essential \
    g++ \
    gcc \
    make \
    vim \
    nano \
    less \
    man-db \
    tree \
    git \
    htop \
    curl \
    wget \
    file \
    bc \
    && rm -rf /var/lib/apt/lists/*

# Create directories
RUN mkdir -p /opt/atalanta/bin /workspace/circuits /workspace/outputs /workspace/work

# Set working directory
WORKDIR /opt/atalanta

# Copy source code
COPY . /opt/atalanta/

# Fix makefile for modern g++ compiler if needed
RUN sed -i 's/CC=cc/CC=g++/' makefile

# Add compatibility flags for older C++ code
RUN sed -i 's/CFLAGS = -O -g/CFLAGS = -O -g -fpermissive -Wno-write-strings/' makefile

# Clean any existing builds
RUN make clean 2>/dev/null || true

# Compile ATALANTA with error handling
RUN make atalanta || (echo "Initial build failed, trying with additional flags..." && \
    sed -i 's/g++ $(CFLAGS)/g++ $(CFLAGS) -std=c++98/' makefile && \
    make clean && make atalanta)

# Install the binary
RUN cp atalanta bin/atalanta

# Create a test user (optional, for better security)
RUN useradd -m -s /bin/bash atalanta_user && \
    chown -R atalanta_user:atalanta_user /opt/atalanta && \
    chown -R atalanta_user:atalanta_user /workspace

# Copy the entrypoint script
COPY entrypoint.sh /opt/atalanta/entrypoint.sh
RUN chmod +x /opt/atalanta/entrypoint.sh

# Switch to the atalanta user
USER atalanta_user

# Set the working directory to workspace
WORKDIR /workspace

# Set the entrypoint
ENTRYPOINT ["/opt/atalanta/entrypoint.sh"]

# Default command
CMD ["/bin/bash"]
