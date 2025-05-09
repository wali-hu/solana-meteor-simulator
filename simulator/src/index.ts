// index.ts
import * as dotenv from 'dotenv';
dotenv.config();

import { Connection, PublicKey } from '@solana/web3.js';
import { findPoolForToken } from './meteora';
import { simulateSwap } from './meteoraSimulator';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: ts-node index.ts <TOKEN_MINT> <AMOUNT_IN_USDC>');
    process.exit(1);
  }

  const [tokenMintArg, amountArg] = args;
  const tokenMint = new PublicKey(tokenMintArg);
  const amount = parseFloat(amountArg);
  if (isNaN(amount) || amount <= 0) {
    console.error('ERROR: <AMOUNT_IN_USDC> must be a positive number.');
    process.exit(1);
  }

  // 1. Connect to mainnet-beta
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

  // 2. Find the appropriate Meteora pool
  const pool = await findPoolForToken(connection, tokenMint);
  if (!pool) {
    console.error(`No Meteora pool found for token mint ${tokenMint.toBase58()}`);
    process.exit(1);
  }

  // 3. Simulate the USDC→token swap
  const { estimatedOutTokens, computeUnits, error } = await simulateSwap(
    connection,
    pool,
    amount
  );

  if (error) {
    console.error('Simulation error:', error);
    process.exit(1);
  }

  console.log(`\n=== Swap Simulation Results ===`);
  console.log(`Input:  ${amount.toFixed(6)} USDC`);
  console.log(`Output: ${estimatedOutTokens.toFixed(6)} tokens`);
  console.log(`Compute Units Consumed: ${computeUnits}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
