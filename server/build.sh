#!/bin/bash

echo "Starting server build process..."

# Navigate to server directory
cd server

# Install dependencies
echo "Installing dependencies..."
npm ci

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate --schema=prisma/schema.prisma

# Build TypeScript
echo "Building TypeScript..."
npm run build

echo "Build complete!"
