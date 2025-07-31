# ATALANTA Docker Image

[![Docker Build](https://img.shields.io/docker/build/your-username/atalanta.svg)](https://hub.docker.com/r/your-username/atalanta)
[![Docker Pulls](https://img.shields.io/docker/pulls/your-username/atalanta.svg)](https://hub.docker.com/r/your-username/atalanta)

A Dockerized version of ATALANTA v2.0 - An automatic test pattern generator for stuck-at faults in combinational circuits.

## About ATALANTA

ATALANTA is a well-known test pattern generation tool that employs the FAN algorithm for test pattern generation and the parallel pattern single fault propagation technique for fault simulation. It was developed at Virginia Tech and is widely used in the digital circuit testing community.

## Quick Start

### Pull and Run the Pre-built Image

```bash
# Pull the image from Docker Hub
docker pull your-username/atalanta:latest

# Run ATALANTA container interactively
docker run -it your-username/atalanta:latest

# Run ATALANTA with a specific circuit file
docker run -it -v /path/to/your/circuits:/circuits your-username/atalanta:latest atalanta /circuits/your_circuit.bench
```

### Build from Source

```bash
# Clone this repository
git clone https://github.com/your-username/atalanta-docker.git
cd atalanta-docker

# Build the Docker image
docker build -t atalanta:latest .

# Run the container
docker run -it atalanta:latest
```

## Usage

### Basic Usage

Once inside the container, you can use ATALANTA as follows:

```bash
# Run ATALANTA on a test circuit
atalanta my_circuit.bench

# View help
atalanta -h
```

### Working with Your Own Circuit Files

To use your own circuit files, mount them as a volume:

```bash
# Mount your circuit directory
docker run -it -v /path/to/your/circuits:/circuits atalanta:latest

# Inside the container
cd /circuits
atalanta your_circuit.bench
```

### Available Test Circuits

The container includes several example circuits:
- `my_circuit.bench` - Sample router circuit
- Various ISCAS benchmark circuits in the `data/` directory

## Environment Variables

The container sets up the following environment variables:
- `ATALANTA_HOME=/opt/atalanta` - ATALANTA installation directory
- `ATALANTA_MAN=/opt/atalanta` - Manual pages directory
- `PATH` includes `/opt/atalanta/bin` - ATALANTA binary location

## File Structure

```
/opt/atalanta/
├── bin/
│   └── atalanta          # Main executable
├── data/                 # Test circuits and examples
├── atalanta_tutorials/   # Documentation and tutorials
├── man/                  # Manual pages
└── *.bench              # Sample circuit files
```

## Development

### Building the Image Locally

```bash
# Build with custom tag
docker build -t my-atalanta:dev .

# Build with build arguments (if needed)
docker build --build-arg UBUNTU_VERSION=20.04 -t atalanta:ubuntu20 .
```

### Contributing

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ATALANTA source code is released for teaching and research use only. Any publication using ATALANTA should cite the appropriate references. The source code belongs to Virginia Tech.

**Note**: This program may not be reproduced nor used for any commercial product without written permission from Prof. Dong S. Ha.

## Citation

If you use ATALANTA in your research, please cite:

```
H. K. Lee and D. S. Ha, "On the Generation of Test Patterns for Combinational Circuits," 
Technical Report No. 12_93, Dep't of Electrical Eng., 
Virginia Polytechnic Institute and State University.
```

## Contact

For commercial use or bug reports, contact:
- Prof. Dong S. Ha
- Department of Electrical and Computer Engineering
- Virginia Tech, Blacksburg, VA 24061
- Email: ha@vt.edu

## Troubleshooting

### Common Issues

1. **Permission Denied**: Make sure you're running Docker with appropriate permissions
2. **File Not Found**: Ensure your circuit files are properly mounted as volumes
3. **Compilation Issues**: The Dockerfile handles most compilation dependencies automatically

### Getting Help

- Check the container logs: `docker logs <container-id>`
- Run with verbose output: `docker run -it atalanta:latest atalanta -v your_circuit.bench`
- Access the manual: Inside the container, the manual pages are available

## Version History

- **v2.0**: Latest version with improved algorithms and bug fixes
- **v1.1**: Added shuffling compaction and learning features
- **v1.0**: Original release by H. K. Lee

---

**Disclaimer**: This Docker image is provided for educational and research purposes. Users are responsible for complying with ATALANTA's licensing terms.
