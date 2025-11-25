#!/bin/bash
# Build script optimized for Mac (typically has more RAM/CPU cores)

set -e

echo "Building on Mac with optimized settings..."

cd src-tauri

# Macs typically have more cores and RAM, so we can use more parallelism
# Adjust CARGO_BUILD_JOBS based on your Mac's CPU cores (default: use all cores)
# For 8GB+ RAM Macs, you can use more jobs
export CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-$(sysctl -n hw.ncpu)}

# Standard codegen units for Mac (faster compilation)
export RUSTFLAGS=""

# Build
cargo build "$@"
