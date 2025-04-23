import { Command } from 'commander';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { simulateSwap, displaySimulationResults } from './simulator';
import { buildOrcaSwapTransaction, PoolConfig } from './pools';
import { createDummyWallet, saveWalletToFile, loadWalletFromEnv } from './utils';
import chalk from 'chalk';
import * as dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('solana-meteor-simulator')
  .description('Solana transaction simulation tool')
  .version('0.1.0');

program
  .command('create-wallet')
  .description('Create a new dummy wallet')
  .option('-o, --output <filename>', 'Output file for wallet', 'dummy-wallet.key')
  .action(async (options) => {
    console.log(chalk.cyan('Creating new dummy wallet...'));
    const wallet = createDummyWallet();
    saveWalletToFile(wallet, options.output);
    console.log(chalk.green('Done! Wallet public key:'), wallet.publicKey.toString());
  });

program
  .command('simulate-swap')
  .description('Simulate a token swap on a liquidity pool')
  .requiredOption('-a, --token-a <address>', 'First token mint address')
  .requiredOption('-b, --token-b <address>', 'Second token mint address')
  .requiredOption('-i, --input-amount <amount>', 'Amount to swap (in standard units)')
  .option('-s, --slippage <percentage>', 'Slippage tolerance percentage', '0.5')
  .option('-r, --rpc <url>', 'RPC endpoint URL', process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com')
  .action(async (options) => {
    try {
      // Setup connection
      console.log(chalk.cyan(`Connecting to RPC: ${options.rpc}`));
      const connection = new Connection(options.rpc);
      
      // Load wallet
      let wallet: Keypair;
      try {
        wallet = loadWalletFromEnv();
        console.log(chalk.green('Using wallet from .env file:'), wallet.publicKey.toString());
      } catch (e) {
        console.log(chalk.yellow('No wallet in .env, creating dummy wallet...'));
        wallet = createDummyWallet();
        console.log(chalk.green('Using dummy wallet:'), wallet.publicKey.toString());
      }
      
      // Create pool config
      const tokenAMint = new PublicKey(options.tokenA || options['token-a']);
      const tokenBMint = new PublicKey(options.tokenB || options['token-b']);
      
      console.log(chalk.cyan('\nPool Parameters:'));
      console.log(`Token A: ${tokenAMint.toString()}`);
      console.log(`Token B: ${tokenBMint.toString()}`);
      console.log(`Input Amount: ${options.inputAmount}`);
      console.log(`Slippage: ${options.slippage}%`);
      
      const poolConfig: PoolConfig = {
        address: new PublicKey('11111111111111111111111111111111'), // Placeholder, will be determined by Orca SDK
        tokenAMint,
        tokenBMint,
        protocol: 'orca'
      };
      
      // Build swap transaction
      console.log(chalk.cyan('\nBuilding Orca swap transaction...'));
      const transaction = await buildOrcaSwapTransaction(
        connection,
        wallet.publicKey,
        poolConfig,
        parseFloat(options.inputAmount),
        parseFloat(options.slippage)
      );
      
      // Run simulation
      const result = await simulateSwap(connection, transaction);
      
      // Display results
      displaySimulationResults(result);
      
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red('Error:'), error.message);
      } else {
        console.error(chalk.red('Error:'), String(error));
      }
      process.exit(1);
    }
  });

program.parse();