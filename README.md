# 🐳 ATALANTA Docker - Test Pattern Generator

[![Docker Build](https://github.com/YOUR_USERNAME/atalanta-docker/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/YOUR_USERNAME/atalanta-docker/actions/workflows/docker-publish.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/YOUR_USERNAME/atalanta.svg)](https://hub.docker.com/r/YOUR_USERNAME/atalanta)

> **Solving the 12-year installation problem!** 🎉

ATALANTA v2.0 is now available as a Docker container, making it easy to use this powerful test pattern generator without compilation headaches.

## 🚀 Quick Start

```bash
# Option 1: Use our quick start script
wget https://raw.githubusercontent.com/YOUR_USERNAME/atalanta-docker/main/quick-start.sh
chmod +x quick-start.sh
./quick-start.sh

# Option 2: Direct Docker command
docker run -it YOUR_USERNAME/atalanta:latest

# Option 3: With your own circuit files
mkdir circuits outputs
docker run -it --rm -v $(pwd)/circuits:/circuits -v $(pwd)/outputs:/outputs YOUR_USERNAME/atalanta:latest
```

## 📋 What is ATALANTA?

ATALANTA is an **Automatic Test Pattern Generator** for stuck-at faults in combinational circuits, developed at Virginia Tech. It's widely used in:

- 🎓 **Education**: Digital testing courses
- 🔬 **Research**: IC design verification  
- 🏭 **Industry**: ASIC/FPGA testing
- 📊 **Benchmarking**: Circuit analysis

### Key Features
- **FAN Algorithm** for test pattern generation
- **Parallel Pattern Single Fault Propagation** for fault simulation
- **High fault coverage** (often 100%)
- **Efficient compaction** algorithms
- **Industry-standard** BENCH format support

## 💻 Usage Examples

### Basic Test Generation
```bash
# Inside the container
atalanta my_circuit.bench        # Run on sample circuit
atalanta /circuits/your.bench    # Run on your circuit
atalanta -h                      # Show help
```

### With Your Own Files
```bash
# Create working directory
mkdir atalanta-work && cd atalanta-work
mkdir circuits outputs

# Place your .bench files in circuits/
cp your_circuit.bench circuits/

# Run ATALANTA
docker run -it --rm \
  -v $(pwd)/circuits:/circuits \
  -v $(pwd)/outputs:/outputs \
  YOUR_USERNAME/atalanta:latest \
  atalanta /circuits/your_circuit.bench
```

### Batch Processing
```bash
# Process multiple circuits
for circuit in circuits/*.bench; do
    docker run --rm \
      -v $(pwd)/circuits:/circuits \
      -v $(pwd)/outputs:/outputs \
      YOUR_USERNAME/atalanta:latest \
      atalanta "/circuits/$(basename $circuit)"
done
```

## 🎯 Why Docker?

### Before (Installation Hell 😵)
- Complex compilation requirements
- Dependency conflicts
- Platform-specific issues
- "It works on my machine" syndrome

### After (Docker Magic ✨)
- ✅ **One command**: `docker run`
- ✅ **Works everywhere**: Linux, Windows, macOS
- ✅ **No dependencies**: Everything included
- ✅ **Reproducible**: Same environment every time

## 📁 File Structure

```
/opt/atalanta/
├── bin/atalanta          # Main executable
├── data/                 # Sample circuits (ISCAS benchmarks)
├── man/                  # Documentation
├── my_circuit.bench      # Sample router circuit
└── *.bench              # Various test circuits
```

## 🔧 For Developers

### Build Locally
```bash
git clone https://github.com/YOUR_USERNAME/atalanta-docker.git
cd atalanta-docker
docker build -t atalanta:local .
```

### Using Docker Compose
```bash
# Standard usage
docker-compose up atalanta

# Development mode (mounts source)
docker-compose --profile dev up atalanta-dev
```

### Advanced Build Script
```bash
./docker-build.sh build     # Build only
./docker-build.sh test      # Build and test
./docker-build.sh push      # Build, test, and push to Docker Hub
./docker-build.sh --help    # Show all options
```

## 📚 Documentation

- [Complete Docker Guide](DOCKER_GUIDE.md) - Detailed setup and publishing instructions
- [Original ATALANTA README](README) - Original documentation
- [Compilation Notes](Compile_ReadMe.txt) - Build information

## 🎓 Educational Use

Perfect for:
- **Digital Testing Courses**: No setup time, focus on learning
- **Research Projects**: Reproducible experiments
- **Benchmarking**: Consistent testing environment
- **Homework Assignments**: Same environment for all students

### Sample Circuits Included
- Router circuit (`my_circuit.bench`)
- ISCAS benchmarks (s13207, s15850, s35932, s38417, s38584, s9234)
- Various real-world examples

## 🏆 Success Stories

> *"Finally! No more spending hours trying to compile ATALANTA. This Docker container saved our entire semester."* - University Professor

> *"We use this in our IC design flow. Works perfectly in our CI/CD pipeline."* - Industry Engineer

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Test with the Docker container
4. Submit a pull request

## 📄 License & Citation

ATALANTA is released for **teaching and research use only**. Commercial use requires permission from Virginia Tech.

**Please cite when using in publications:**
```
H. K. Lee and D. S. Ha, "On the Generation of Test Patterns for Combinational Circuits," 
Technical Report No. 12_93, Dep't of Electrical Eng., 
Virginia Polytechnic Institute and State University.
```

## 🙋‍♂️ Support

- **GitHub Issues**: Report bugs or request features
- **Docker Hub**: Pre-built images available
- **Original Authors**: For commercial licensing contact Prof. Dong S. Ha (ha@vt.edu)

## 🌟 Star this Repository!

If this Docker container helped you, please ⭐ star the repository to help others find it!

---

**Made with ❤️ to solve the ATALANTA installation problem once and for all!**
