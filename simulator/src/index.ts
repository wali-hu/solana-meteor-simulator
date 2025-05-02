#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();  // Load .env variables

import { program } from 'commander';
import {
  Connection,
  Keypair,
  SimulateTransactionConfig,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';

import { mockOrcaSwapSimulation } from './mockSimulator';
import { mockMeteoraSwapSimulation } from './mockMeteoraSimulator';
import { buildMeteoraSwapTransaction } from './meteora';
import { runSolUsdcSwapSimulation } from './solUsdcSwap';

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

  // Mock Orca swap
  program
    .command('mock-orca')
    .description('Simulate an Orca swap without sending a transaction')
    .requiredOption('--token-a <address>')
    .requiredOption('--token-b <address>')
    .requiredOption('--input-amount <amount>')
    .option('--slippage <percent>', 'Slippage tolerance', '1')
    .action(async (opts) => {
      const result = await mockOrcaSwapSimulation(
        defaultConnection,
        wallet,
        opts.tokenA,
        opts.tokenB,
        parseFloat(opts.inputAmount),
        parseFloat(opts.slippage)
      );
      console.log('\nMock Orca Swap Simulation Results:');
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

  // Mock Meteora swap
  program
    .command('mock-meteora')
    .description('Simulate a Meteora swap without sending a transaction')
    .requiredOption('--token-a <address>')
    .requiredOption('--token-b <address>')
    .requiredOption('--input-amount <amount>')
    .option('--slippage <percent>', 'Slippage tolerance', '1')
    .action(async (opts) => {
      const result = await mockMeteoraSwapSimulation(
        defaultConnection,
        wallet,
        opts.tokenA,
        opts.tokenB,
        parseFloat(opts.inputAmount),
        parseFloat(opts.slippage)
      );
      console.log('\nMock Meteora Swap Simulation Results:');
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

  // Real Meteora swap simulation (on-chain data, no broadcast)
  program
    .command('meteora-swap')
    .description('Simulate a real Meteora swap (no execution)')
    .requiredOption('--token-a <address>')
    .requiredOption('--token-b <address>')
    .requiredOption('--input-amount <amount>')
    .option('--slippage <percent>', 'Slippage tolerance', '1')
    .option('--rpc-url <url>', 'Override RPC endpoint')
    .option('--real', 'Use real Meteora pool discovery and instructions')
    .action(async (opts) => {
      try {
        // Choose default or custom connection
        const connection = opts.rpcUrl
          ? new Connection(opts.rpcUrl, 'confirmed')
          : defaultConnection;

        // Build the legacy Transaction
        const tx: Transaction | null = await buildMeteoraSwapTransaction(
          connection,
          wallet,
          opts.tokenA,
          opts.tokenB,
          parseFloat(opts.inputAmount),
          parseFloat(opts.slippage)
        );
        if (!tx) {
          console.error('Failed to build Meteora swap transaction');
          return;
        }

        // Convert to a VersionedTransaction
        const messageV0 = new TransactionMessage({
          payerKey: wallet.publicKey,
          recentBlockhash: tx.recentBlockhash!,
          instructions: tx.instructions,
        }).compileToV0Message();

        const versionedTx = new VersionedTransaction(messageV0);

        // Simulate using the new overload and config
        const simulation = await connection.simulateTransaction(
          versionedTx,
          simConfig
        );

        console.log('\nMeteora Swap Simulation Results:');
        console.log(`Success: ${simulation.value.err == null}`);
        console.log(
          `Compute Units: ${simulation.value.unitsConsumed ?? 'N/A'}`
        );
        if (simulation.value.err) {
          console.log(`Error: ${JSON.stringify(simulation.value.err)}`);
        }
        console.log('\nTransaction Logs:');
        simulation.value.logs?.forEach((log) => console.log(log));
      } catch (err) {
        console.error('Meteora swap simulation failed:', err);
      }
    });

  program
    .command('sol-usdc-swap')
    .description('Discover SOL/USDC DLMM pool on Mainnet and simulate swap')
    .action(async () => {
      try {
        await runSolUsdcSwapSimulation();
      } catch (err) {
        console.error('Error:', err);
      }
    });

  // Parse CLI args and run
  await program.parseAsync(process.argv);
}

main().catch(console.error);
