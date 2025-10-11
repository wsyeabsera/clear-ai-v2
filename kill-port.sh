#!/bin/bash

# Kill process running on a given port
# Usage: ./kill-port.sh <port>

# Check if port argument is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <port>"
  echo "Example: $0 4000"
  exit 1
fi

PORT=$1

# Find process using the port
PID=$(lsof -ti :$PORT)

if [ -z "$PID" ]; then
  echo "No process found running on port $PORT"
  exit 0
fi

echo "Found process(es) running on port $PORT: $PID"

# Kill the process
kill -9 $PID

# Verify it's killed
sleep 1
STILL_RUNNING=$(lsof -ti :$PORT)

if [ -z "$STILL_RUNNING" ]; then
  echo "✓ Successfully killed process on port $PORT"
  exit 0
else
  echo "⚠️  Process may still be running. Try running with sudo:"
  echo "   sudo $0 $PORT"
  exit 1
fi


