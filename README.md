# Solana Meteor Simulator

A CLI-based simulation tool for Solana blockchain swaps using Meteora DLMM and Orca AMM pools. The simulator supports both **mock** (in-memory) and **real** (on-chain) modes to predict compute unit consumption, token outputs, and logs without broadcasting transactions.

---

## Table of Contents

* [Features](#features)
* [Prerequisites](#prerequisites)
* [Installation](#installation)
* [Configuration](#configuration)
* [Usage](#usage)

  * [Mock Simulation (Meteora)](#mock-simulation-meteora)
* [File Structure](#file-structure)
* [Development](#development)
* [License](#license)

---

## Features

* **Simulation**: In-memory pool simulation On-chain state cloning + transaction simulation.
* **Compute Unit Reporting**: Track Solana compute units consumed for each simulated transaction.
* **Detailed Logs**: Retrieve program logs to inspect swap execution paths.

---

## Prerequisites

* **Node.js** v16+
* **npm** or **yarn**
* Solana CLI (`solana`) for localnet/devnet setup (optional for real mode)

---

## Installation

```bash
git clone https://github.com/wali-hu/solana-meteor-simulator.git
cd solana-meteor-simulator
npm install
```

---

## Configuration

Create a `.env` file in the project root with the following variables:

```dotenv
# RPC endpoint (Mainnet, Devnet, or localnet)
RPC_ENDPOINT=https://api.mainnet-beta.solana.com

# Base58-encoded wallet private key (32-byte array)
WALLET_PRIVATE_KEY=<YOUR_BASE58_PRIVATE_KEY>

# Meteora Universal Search API base URL
METEORA_API_URL=https://universal-search-api.meteora.ag/pool
```

---

## Usage

All commands are invoked via the `simulator` script defined in `package.json`.

### Mock Simulation (Meteora)

Simulate a Meteora swap entirely in-memory:

```bash
npm run simulator -- mock-meteora \
  --token-a <TOKEN_A_MINT> \
  --token-b <TOKEN_B_MINT> \
  --input-amount 10 \
  --slippage 1
```

## File Structure

```
├── simulator/
│   ├── src/
│   │   ├── index.ts           # CLI entry point
│   │   ├── meteora.ts         # Build & quote functions for Meteora pools
│   │   ├── mockMeteoraSimulator.ts  # In-memory Meteora mocks
│   └── tsconfig.json
├── program/                   # Anchor/Rust Meteor Pool contract
├── .env                       # Environment variables (not in repo)
├── package.json               # Scripts & dependencies
└── README.md                  # (this file)
```

---

## Development

* **Lint & format**: `npm run lint:fix`
* **Build TS**: `npm run build:simulator`
* **Run tests**: `npm test`

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
