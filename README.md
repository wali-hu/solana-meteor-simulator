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
  * [Real Simulation (Meteora)](#real-simulation-meteora)
  * [Orca Mock Simulation](#orca-mock-simulation)
  * [SOL/USDC Swap Simulation](#solusdc-swap-simulation)
* [File Structure](#file-structure)
* [Development](#development)
* [License](#license)

---

## Features

* **Pool Discovery**: Locate on-chain Meteora DLMM pools via the Universal Search API with retries and fallback.
* **Mock Mode**: In-memory pool simulation without network calls.
* **Real Mode**: On-chain state cloning + transaction simulation against a live or local Solana cluster.
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

### Real Simulation (Meteora)

Clone on-chain pool state and simulate without sending:

```bash
npm run simulator -- meteora-swap \
  --token-a <TOKEN_A_MINT> \
  --token-b <TOKEN_B_MINT> \
  --input-amount 10 \
  --slippage 1
```

### Orca Mock Simulation

Simulate an Orca swap in-memory:

```bash
npm run simulator -- mock-orca \
  --token-a <TOKEN_A_MINT> \
  --token-b <TOKEN_B_MINT> \
  --input-amount 5 \
  --slippage 1
```

### SOL/USDC Swap Simulation

Discover the SOL/USDC DLMM pool, build a VersionedTransaction, and simulate:

```bash
npm run simulator -- sol-usdc-swap
```

---

## File Structure

```
├── simulator/
│   ├── src/
│   │   ├── index.ts           # CLI entry point
│   │   ├── meteora.ts         # Build & quote functions for Meteora pools
│   │   ├── mockMeteoraSimulator.ts  # In-memory Meteora mocks
│   │   ├── mockSimulator.ts   # In-memory Orca mocks
│   │   ├── poolDiscovery.ts   # API + fallback logic for SOL/USDC pool
│   │   └── solUsdcSwap.ts     # SOL/USDC swap assembly & simulation flow
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
* **Run tests**: `npm test` (if tests added)

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
