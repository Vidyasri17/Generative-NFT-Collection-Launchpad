# Multi-stage Dockerfile for NFT Launchpad
# Stage 1: Contracts (Hardhat)
FROM node:18-alpine AS contracts

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY hardhat.config.js ./
COPY .env.example ./

# Install dependencies
RUN npm install

# Copy contracts and scripts
COPY contracts ./contracts
COPY scripts ./scripts
COPY test ./test

# Compile contracts
RUN npm run compile

# Expose Hardhat port
EXPOSE 8545

# Start Hardhat network
CMD ["npx", "hardhat", "node"]

# Stage 2: Frontend (Next.js)
FROM node:18-alpine AS frontend

WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend code
COPY frontend ./

# Build frontend
RUN npm run build

# Expose Next.js port
EXPOSE 3000

# Start Next.js dev server
CMD ["npm", "run", "dev"]

# Stage 3: Development stage (all tools)
FROM node:18-alpine AS development

WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies
RUN npm install

# Compile contracts
RUN npm run compile

EXPOSE 8545 3000

CMD ["npm", "run", "node"]
