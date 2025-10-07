# Privacy Compliance Execution for Fog Computing

A **privacy compliance evaluation system** for fog computing environments that validates whether applications comply with user privacy preferences. Features hash-based edge caching, nested set model for hierarchical policies, and comprehensive security evaluation.

## Key Features

- **Hash-based Edge Caching**: MD5 cache with TTL for ultra-low latency (2.36 ms)
- **Nested Set Model**: Efficient hierarchical attribute/purpose queries
- **Fog Computing Architecture**: IoT → Edge → Fog → Cloud (4-tier)
- **Security**: MITM attack resistance, cache poisoning prevention
- **Real-time**: Sub-3ms privacy evaluation suitable for IoT

## Quick Start

```bash
# Install dependencies
npm install

# Start MongoDB
mongod --dbpath ~/data/db --fork

# Generate test data
npx babel-watch src/generators/quick-test-data.js

# Start API server
npm run api

# Run development mode
npm run dev
```

## Architecture

```
IoT Devices (20) → Edge Nodes (5) → Fog Nodes (3) → Cloud (MongoDB)
   2.35 ms            10.48 ms         52.25 ms        11.43 ms
                      [Edge Cache: 100% hit rate]
                      Total: 2.36 ms end-to-end
```

## Benchmarks

```bash
# Performance benchmarks
npm run benchmark MEDIUM

# Baseline comparisons
npm run comparative

# Fog layer latency simulation
npm run fog-benchmark

# Security evaluation
npx babel-watch src/benchmarks/mitm-attack-simulation.js
```

## Performance Results

### Cloud Processing (without fog)
- **Cache Hit**: 0.44 ms (mean), 0.74 ms (P95)
- **Cache Miss**: 2.79 ms (mean), 4.07 ms (P95)
- **Throughput**: 440-500 req/s
- **Resource**: 299 MB memory, 1.7 CPU cores

### Fog Layer Latency (IoT→Edge→Fog→Cloud)
- **IoT → Edge**: 2.35 ms (WiFi/Bluetooth)
- **Edge → Fog**: 10.48 ms (LAN/Metro)
- **Fog → Cloud**: 52.25 ms (WAN/Internet)
- **Total with Edge Cache**: **2.36 ms** (33.9× speedup vs direct IoT→Cloud)
- **Latency Reduction**: 97.6% (from ~80ms to 2.36ms)

### Security (MITM Resistance)
- **Request Tampering**: ✅ PROTECTED (hash integrity)
- **Cache Poisoning**: ✅ PROTECTED (0/1000 collisions)
- **Replay Attack**: ✅ PROTECTED (TTL + hash invalidation)
- **Success Rate**: 91.7% (11/12 tests passed)

## API Endpoints

```
POST   /api/evaluate              - Privacy compliance evaluation
GET    /api/users                 - List users
POST   /api/users                 - Create user with preferences
PUT    /api/users/:id/preferences - Update user preferences
GET    /api/apps                  - List applications
POST   /api/apps                  - Create application
GET    /api/policy                - Get privacy policy hierarchy
GET    /api/cache/stats           - Cache statistics
DELETE /api/cache                 - Clear cache
```

## Project Structure

```
src/
├── models/              # MongoDB schemas (User, App, Policy, Cache)
├── helpers/             # Privacy evaluation logic (nested set queries)
├── services/            # Database connection
├── api/                 # RESTful API server
├── benchmarks/          # Performance & security benchmarks
│   ├── latency-benchmark.js
│   ├── throughput-benchmark.js
│   ├── fog-layer-benchmark.js
│   └── mitm-attack-simulation.js
├── baselines/           # Baseline comparisons (no-cache, flat-hierarchy)
├── simulation/          # Fog computing simulation (NEW)
│   ├── network-latency-simulator.js
│   └── fog-layer-simulator.js
├── generators/          # Test data generators
└── web/                 # Web UI prototype
```

## Documentation

- **[CLAUDE.md](CLAUDE.md)**: Complete project overview and architecture
- **[BENCHMARKING.md](BENCHMARKING.md)**: Performance testing guide
- **[FOG_LAYER_SIMULATION_REPORT.md](FOG_LAYER_SIMULATION_REPORT.md)**: Fog computing evaluation (25+ pages)
- **[FOG_LATENCY_TABLES.md](FOG_LATENCY_TABLES.md)**: Detailed latency tables
- **[MITM_ATTACK_EVALUATION.md](MITM_ATTACK_EVALUATION.md)**: Security evaluation (25 pages)
- **[IMPLEMENTATION_SUMMARY_FOR_PAPER.md](IMPLEMENTATION_SUMMARY_FOR_PAPER.md)**: Research checklist

## Research Contributions

1. **Hash-based Edge Caching for Privacy**: 32.4× speedup with edge cache
2. **Fog Layer Simulation**: Realistic IoT→Edge→Fog→Cloud latency modeling
3. **Real-time Privacy Compliance**: Sub-3ms evaluation for IoT environments
4. **Security Evaluation**: MITM attack resistance with 91.7% protection rate

## Technology Stack

- **Backend**: Node.js, Express.js, Babel
- **Database**: MongoDB with Mongoose
- **Caching**: MD5 hash-based with TTL
- **Data Model**: Nested Set Model for hierarchical queries
- **Load Balancing**: Nginx (for horizontal scaling)
- **Containerization**: Docker Compose

## Scalability

### Horizontal Scaling
```bash
docker-compose -f docker-compose.scalability.yml up -d
```
- 3 fog validator instances behind Nginx load balancer
- Shared MongoDB backend
- Projected: ~1,446 req/s (3× single instance)

### Vertical Scaling
- 83% CPU headroom (using 1.7/8 cores)
- 98% memory headroom (using 299MB/16GB)
- Can handle 4-5× more load on single instance

## Development

```bash
# Build (transpile with Babel)
npm run build

# Production
npm start

# Linting
npm run lint
```

## Database

- **MongoDB URL**: Set in `.env` as `MONGODB_URL`
- **Default**: `mongodb://localhost:27017/privacy-policy`

```bash
# Local MongoDB
mongod --dbpath ~/data/db --logpath ~/data/mongodb.log &

# Docker MongoDB
docker-compose up -d db
```

## License

ISC

## Citation

If you use this system in your research, please cite:

```
Privacy Compliance Execution for Fog Computing
Hash-based Edge Caching with Nested Set Model
2025
```

## Contact

For questions or collaboration, please open an issue on GitHub.
