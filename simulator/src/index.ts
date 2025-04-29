import dotenv from 'dotenv';
import { program } from 'commander';
import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { mockOrcaSwapSimulation } from './mockSimulator';
import { mockMeteoraSwapSimulation } from './mockMeteoraSimulator';
import { buildMeteoraSwapTransaction } from './meteora';

dotenv.config();

// Create connection to Solana network
const connection = new Connection(process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com');

// Load wallet from private key in .env
const wallet = process.env.WALLET_PRIVATE_KEY 
  ? Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY))
  : Keypair.generate(); // Generate a new keypair if none provided

async function main() {
  program
    .version('0.1.0')
    .description('Solana transaction simulator for Orca and Meteora swaps');

  // Existing Orca commands
  program
    .command('mock-orca')
    .description('Simulate an Orca swap without sending a transaction')
    .requiredOption('--token-a <address>', 'Token A address')
    .requiredOption('--token-b <address>', 'Token B address')
    .requiredOption('--input-amount <amount>', 'Input amount')
    .option('--slippage <percentage>', 'Slippage tolerance percentage', '1')
    .action(async (options) => {
      const result = await mockOrcaSwapSimulation(
        connection,
        wallet,
        options.tokenA,
        options.tokenB,
        parseFloat(options.inputAmount),
        parseFloat(options.slippage)
      );
      
      console.log('\nMock Orca Swap Simulation Results:');
      console.log(`Success: ${result.success}`);
      console.log(`Compute Units: ${result.computeUnits || 'N/A'}`);
      if (result.outputAmount) {
        console.log(`Output Amount: ${result.outputAmount}`);
      }
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      console.log('\nTransaction Logs:');
      result.logs.forEach((log: string) => console.log(log));
    });

  // New Meteora commands
  program
    .command('mock-meteora')
    .description('Simulate a Meteora swap without sending a transaction')
    .requiredOption('--token-a <address>', 'Token A address')
    .requiredOption('--token-b <address>', 'Token B address')
    .requiredOption('--input-amount <amount>', 'Input amount')
    .option('--slippage <percentage>', 'Slippage tolerance percentage', '1')
    .action(async (options) => {
      const result = await mockMeteoraSwapSimulation(
        connection,
        wallet,
        options.tokenA,
        options.tokenB,
        parseFloat(options.inputAmount),
        parseFloat(options.slippage)
      );
      
      console.log('\nMock Meteora Swap Simulation Results:');
      console.log(`Success: ${result.success}`);
      console.log(`Compute Units: ${result.computeUnits || 'N/A'}`);
      if (result.outputAmount) {
        console.log(`Output Amount: ${result.outputAmount}`);
      }
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      console.log('\nTransaction Logs:');
      result.logs.forEach(log => console.log(log));
    });

  program
    .command('meteora-swap')
    .description('Simulate a real Meteora swap (no execution)')
    .requiredOption('--token-a <address>', 'Token A address')
    .requiredOption('--token-b <address>', 'Token B address')
    .requiredOption('--input-amount <amount>', 'Input amount')
    .option('--slippage <percentage>', 'Slippage tolerance percentage', '1')
    .action(async (options) => {
      try {
        // Build a Meteora swap transaction
        const transaction = await buildMeteoraSwapTransaction(
          connection,
          wallet,
          options.tokenA,
          options.tokenB,
          parseFloat(options.inputAmount),
          parseFloat(options.slippage)
        );
        
        if (!transaction) {
          console.error('Failed to build Meteora swap transaction');
          return;
        }
        
        // Simulate the transaction
        const simulation = await connection.simulateTransaction(transaction);
        
        console.log('\nMeteora Swap Simulation Results:');
        console.log(`Success: ${simulation.value.err ? false : true}`);
        console.log(`Compute Units: ${simulation.value.unitsConsumed || 'N/A'}`);
        
        if (simulation.value.err) {
          console.log(`Error: ${JSON.stringify(simulation.value.err)}`);
        }
        
        console.log('\nTransaction Logs:');
        simulation.value.logs?.forEach(log => console.log(log));
      } catch (error) {
        console.error('Meteora swap simulation failed:', error);
      }
    });

  await program.parseAsync(process.argv);
}

main().catch(console.error);