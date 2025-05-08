#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();  // Load .env variables

import { program } from 'commander';
import {
  Connection,
  Keypair,
  SimulateTransactionConfig,

} from '@solana/web3.js';
import bs58 from 'bs58';

import { meteoraSwapSimulation } from './meteoraSimulator';


// Simulation config for the new overload
const simConfig: SimulateTransactionConfig = {
  replaceRecentBlockhash: true,
  sigVerify: false,
  commitment: 'confirmed',
};

// Default Solana connection (can be overridden per-command)
const defaultConnection = new Connection(
  process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

// Load or generate wallet
const wallet = process.env.WALLET_PRIVATE_KEY
  ? Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY))
  : Keypair.generate();

async function main() {
  program
    .version('1.0.0')
    .description('Solana transaction simulator for Orca and Meteora swaps');

  

  // Meteora swap
  program
    .command('meteora-swap')
    .description('Simulate a Meteora swap without sending a transaction')
    .requiredOption('--token-a <address>')
    .requiredOption('--token-b <address>')
    .requiredOption('--input-amount <amount>')
    .option('--slippage <percent>', 'Slippage tolerance', '1')
    .action(async (opts) => {
      const result = await meteoraSwapSimulation(
        defaultConnection,
        wallet,
        opts.tokenA,
        opts.tokenB,
        parseFloat(opts.inputAmount),
        parseFloat(opts.slippage)
      );
      console.log('\nMeteora Swap Simulation Results:');
      console.log(`Success: ${result.success}`);
      console.log(`Compute Units: ${result.computeUnits ?? 'N/A'}`);
      if (result.outputAmount != null) {
        console.log(`Output Amount: ${result.outputAmount}`);
      }
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      console.log('\nTransaction Logs:');
      result.logs.forEach((log) => console.log(log));
    });


  // Parse CLI args and run
  await program.parseAsync(process.argv);
}

main().catch(console.error);
