#!/bin/bash

# Privacy Compliance Evaluation - Benchmark Runner Script
# This script helps run all experimental evaluations for the research paper

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_msg() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_title() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Check if MongoDB is running
check_mongodb() {
    print_msg "Checking MongoDB connection..."

    if ! command -v mongo &> /dev/null && ! command -v mongosh &> /dev/null; then
        print_warning "MongoDB client not found in PATH"
        print_msg "Assuming MongoDB is running via Docker..."
        return 0
    fi

    if mongo --eval "db.adminCommand('ping')" &> /dev/null || mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
        print_msg "✓ MongoDB is running"
    else
        print_error "MongoDB is not running!"
        print_msg "Starting MongoDB via Docker Compose..."
        docker-compose up -d db
        sleep 5
    fi
}

# Check if node_modules exists
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        print_msg "Installing dependencies..."
        npm install
    else
        print_msg "✓ Dependencies already installed"
    fi
}

# Run complete benchmark suite
run_complete_benchmark() {
    local dataset_size=${1:-MEDIUM}

    print_title "Running Complete Benchmark Suite ($dataset_size dataset)"

    print_msg "This will measure:"
    echo "  - Latency (cache hit, cache miss, hash computation, nested set queries)"
    echo "  - Throughput (concurrent users: 10, 50, 100+)"
    echo "  - Resource usage (CPU, memory)"
    echo "  - Scalability analysis"
    echo ""

    print_msg "Estimated time: 5-10 minutes"
    echo ""

    npm run benchmark $dataset_size

    print_msg "✓ Benchmark completed! Results saved to ./results/"
}

# Run comparative baseline analysis
run_comparative() {
    print_title "Running Comparative Baseline Analysis"

    print_msg "Comparing approaches:"
    echo "  1. Proposed (Hash Cache + Nested Set)"
    echo "  2. No Cache Baseline"
    echo "  3. Flat Hierarchy Baseline"
    echo ""

    npm run comparative

    print_msg "✓ Comparative analysis completed!"
}

# Start API server
start_api_server() {
    print_title "Starting API Server"

    print_msg "API will be available at: http://localhost:3000"
    print_msg "API documentation: http://localhost:3000/"
    print_msg "Health check: http://localhost:3000/health"
    echo ""
    print_msg "Press Ctrl+C to stop the server"
    echo ""

    npm run api
}

# Start multi-instance deployment
start_scalability_test() {
    print_title "Starting Multi-Instance Scalability Setup"

    print_msg "Starting services:"
    echo "  - MongoDB (port 27017)"
    echo "  - Privacy Validator 1 (port 3001)"
    echo "  - Privacy Validator 2 (port 3002)"
    echo "  - Privacy Validator 3 (port 3003)"
    echo "  - Nginx Load Balancer (port 8080)"
    echo ""

    docker-compose -f docker-compose.scalability.yml up -d

    sleep 3

    print_msg "✓ Services started!"
    print_msg "Load balancer endpoint: http://localhost:8080"
    print_msg ""
    print_msg "To test load balancing:"
    echo '  curl -X POST http://localhost:8080/api/evaluate \\'
    echo '    -H "Content-Type: application/json" \\'
    echo '    -d '"'"'{"userId":"<USER_ID>","appId":"<APP_ID>"}'"'"
    echo ""
    print_msg "To view logs:"
    echo "  docker-compose -f docker-compose.scalability.yml logs -f"
    echo ""
    print_msg "To stop services:"
    echo "  docker-compose -f docker-compose.scalability.yml down"
}

# Generate test data
generate_test_data() {
    local size=${1:-MEDIUM}

    print_title "Generating Test Data ($size)"

    print_msg "This will create synthetic users and apps for testing"

    node -e "
    require('dotenv').config();
    require('./src/services/mongoose');
    const Generator = require('./src/generators/test-data-generator').default;

    (async () => {
        await Generator.generatePresetDataset('$size', true);
        const stats = await Generator.getDatasetStats();
        Generator.printDatasetStats(stats);
        process.exit(0);
    })();
    "
}

# Show menu
show_menu() {
    print_title "Privacy Compliance Evaluation - Benchmark Suite"

    echo "Select an option:"
    echo ""
    echo "  1) Run Complete Benchmark Suite (MEDIUM dataset)"
    echo "  2) Run Complete Benchmark Suite (LARGE dataset)"
    echo "  3) Run Comparative Baseline Analysis"
    echo "  4) Start API Server"
    echo "  5) Start Multi-Instance Deployment"
    echo "  6) Generate Test Data"
    echo "  7) Run All Evaluations (Complete + Comparative)"
    echo "  8) Open Web UI Documentation"
    echo "  9) View Results Directory"
    echo "  0) Exit"
    echo ""
}

# Open web UI
open_web_ui() {
    print_title "Opening Web UI"

    print_msg "Starting API server in background..."
    npm run api &
    API_PID=$!

    sleep 3

    print_msg "Opening web interface..."

    # Detect OS and open browser
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open src/web/index.html
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open src/web/index.html
    else
        print_msg "Please open src/web/index.html in your browser"
    fi

    print_msg "Web UI opened. API server running with PID: $API_PID"
    print_msg "Press Ctrl+C to stop the API server"

    wait $API_PID
}

# View results
view_results() {
    print_title "Results Directory"

    if [ ! -d "results" ]; then
        print_warning "No results directory found. Run benchmarks first!"
        return
    fi

    print_msg "Recent benchmark results:"
    echo ""
    ls -lht results/ | head -20
    echo ""

    # Detect OS and open directory
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open results/
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open results/
    else
        print_msg "Results are in: ./results/"
    fi
}

# Main script
main() {
    # Check prerequisites
    check_dependencies
    check_mongodb

    # If argument provided, run directly
    if [ $# -gt 0 ]; then
        case $1 in
            "benchmark")
                run_complete_benchmark ${2:-MEDIUM}
                ;;
            "comparative")
                run_comparative
                ;;
            "api")
                start_api_server
                ;;
            "scalability")
                start_scalability_test
                ;;
            "generate")
                generate_test_data ${2:-MEDIUM}
                ;;
            "all")
                run_complete_benchmark MEDIUM
                run_comparative
                ;;
            "web")
                open_web_ui
                ;;
            *)
                print_error "Unknown command: $1"
                echo "Usage: $0 [benchmark|comparative|api|scalability|generate|all|web]"
                exit 1
                ;;
        esac
        exit 0
    fi

    # Interactive menu
    while true; do
        show_menu
        read -p "Enter choice [0-9]: " choice

        case $choice in
            1)
                run_complete_benchmark MEDIUM
                ;;
            2)
                run_complete_benchmark LARGE
                ;;
            3)
                run_comparative
                ;;
            4)
                start_api_server
                ;;
            5)
                start_scalability_test
                ;;
            6)
                read -p "Enter dataset size [SMALL/MEDIUM/LARGE/XLARGE]: " size
                generate_test_data ${size:-MEDIUM}
                ;;
            7)
                run_complete_benchmark MEDIUM
                run_comparative
                ;;
            8)
                open_web_ui
                ;;
            9)
                view_results
                ;;
            0)
                print_msg "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac

        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main
main "$@"