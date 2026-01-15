#!/bin/bash
# PocketBase Docker Setup Script
# Quickly spin up a PocketBase instance with Docker

set -e

echo "🚀 Setting up PocketBase with Docker..."
echo "========================================"

# Configuration
CONTAINER_NAME="pocketbase"
PORT="8090"
DATA_DIR="./pb_data"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Stop and remove existing container if it exists
if docker ps -a | grep -q "$CONTAINER_NAME"; then
    echo "⚠️  Stopping existing PocketBase container..."
    docker stop "$CONTAINER_NAME" > /dev/null 2>&1
    docker rm "$CONTAINER_NAME" > /dev/null 2>&1
fi

# Create data directory
echo "📁 Creating data directory: $DATA_DIR"
mkdir -p "$DATA_DIR"

# Start new container
echo "🐳 Starting PocketBase container..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -p "$PORT:8090" \
    -v "$DATA_DIR:/pb/pb_data" \
    ghcr.io/pocketbase/pocketbase:latest serve --http=0.0.0.0:8090

echo "========================================"
echo "✅ PocketBase is starting up!"
echo ""
echo "🌐 Admin UI: http://localhost:$PORT/_/"
echo "📖 API Docs: http://localhost:$PORT/api/docs"
echo "📁 Data directory: $DATA_DIR"
echo ""
echo "To view logs: docker logs -f $CONTAINER_NAME"
echo "To stop: docker stop $CONTAINER_NAME"
echo ""
echo "⏳ Waiting for PocketBase to be ready..."
sleep 3

# Check if container is running
if docker ps | grep -q "$CONTAINER_NAME"; then
    echo "✅ PocketBase is running successfully!"
else
    echo "❌ Something went wrong. Check logs with: docker logs $CONTAINER_NAME"
    exit 1
fi
