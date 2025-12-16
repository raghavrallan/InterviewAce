#!/bin/bash

echo "========================================"
echo "   InterviewAce - Starting Application"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "[1/2] Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm run install:all
fi

echo ""
echo "[2/2] Creating .env if not exists..."
if [ ! -f ".env" ]; then
    echo "Using existing .env configuration..."
fi

echo ""
echo "========================================"
echo "   InterviewAce is starting..."
echo "========================================"
echo ""
echo "The Electron window will open shortly..."
echo "Only the Electron app will be visible!"
echo ""
echo "Press Ctrl+C to stop all services"
echo "========================================"
echo ""

npm run dev
