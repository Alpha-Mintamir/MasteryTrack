#!/bin/bash
# Build script optimized for low-memory systems (1GB RAM)

set -e

echo "Building with low-memory optimizations..."
echo "This will take longer but should prevent OOM/hangs"

cd src-tauri

# Set environment variables to limit memory usage
export CARGO_BUILD_JOBS=1
export RUSTFLAGS="-C codegen-units=1"

# Build with verbose output to see progress
cargo build --verbose "$@"
