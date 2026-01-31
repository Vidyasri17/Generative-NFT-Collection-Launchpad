# NFT Collection Launchpad

A comprehensive NFT launchpad project featuring a grounded ERC-721 Smart Contract, optimized off-chain scripts for Merkle Trees & IPFS, and a sleek Next.js Minting DApp.

## Features

- **Smart Contract**: ERC-721, Ownable, ERC-2981 Royalties, Pausable, Merkle Whitelist.
- **Gas Efficient**: Optimized using Merkle Trees for allowlists instead of on-chain storage.
- **Frontend**: Next.js 14, TypeScript, TailwindCSS, RainbowKit, Wagmi.
- **Off-Chain Scripts**:
    - `deploy.js`: Smart contract deployment.
    - `generateMetadata.js`: Generative art & metadata creation.
    - `merkleTree.js`: Merkle root generation.
    - `uploadIPFS.js`: IPFS upload utility.
- **Dockerized**: Full docker-compose setup for easy testing.

## Prerequisites

- Node.js & npm
- Docker & Docker Compose

## Quick Start (Docker)

1.  **Clone the repository**
2.  **Start Services**:
    ```bash
    docker-compose up --build
    ```
    This will start the Hardhat Node and the Frontend.
    - Frontend: `http://localhost:3000`
    - Hardhat Node: `http://localhost:8545`

## Manual Setup

### 1. Smart Contract

```bash
npm install
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network localhost
```

### 2. Off-Chain Scripts

Generate Allowlist Merkle Root:
```bash
node scripts/merkleTree.js
```

Generate Metadata:
```bash
node scripts/generateMetadata.js
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Configuration

- **Environment Variables**: Check `.env.example`.
- **Allowlist**: Update `scripts/allowlist.json` to manage whitelisted addresses.
- **Contract Address**: After deployment, update `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env` or `docker-compose.yml`.

## Architecture

- `contracts/`: Solidity smart contracts.
- `frontend/`: Next.js DApp.
- `scripts/`: Deployment and utility scripts.
- `test/`: Hardhat unit tests.
