import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getOrca, OrcaPoolConfig, OrcaPool } from '@orca-so/sdk';
import Decimal from 'decimal.js';
import chalk from 'chalk';

export interface PoolConfig {
  address: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  protocol: 'orca';
}

export async function getOrcaPool(
  connection: Connection,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey
): Promise<OrcaPool | null> {
  const orca = getOrca(connection);
  console.log(chalk.cyan(`Searching for Orca pool with tokens:
    TokenA: ${tokenAMint.toString()} 
    TokenB: ${tokenBMint.toString()}`));
  
  // Search for the pool in Orca's config
  let poolsChecked = 0;
  let poolsWithErrors = 0;
  
  for (const poolId of Object.values(OrcaPoolConfig)) {
    try {
      poolsChecked++;
      const pool = orca.getPool(poolId);
      const poolTokenA = await pool.getTokenA();
      const poolTokenB = await pool.getTokenB();
      
      console.log(chalk.gray(`Checking pool ${poolId}:
        Pool TokenA: ${poolTokenA.mint.toString()}
        Pool TokenB: ${poolTokenB.mint.toString()}`));
      
      // Check if this pool matches our tokens (in either order)
      if (
        (poolTokenA.mint.equals(tokenAMint) && poolTokenB.mint.equals(tokenBMint)) ||
        (poolTokenA.mint.equals(tokenBMint) && poolTokenB.mint.equals(tokenAMint))
      ) {
        console.log(chalk.green(`Found matching pool: ${poolId}`));
        return pool;
      }
    } catch (error) {
      poolsWithErrors++;
      // Skip pools that fail to load
      continue;
    }
  }
  
  console.log(chalk.yellow(`Checked ${poolsChecked} pools, ${poolsWithErrors} had errors, no matching pool found.`));
  return null;
}

export async function buildOrcaSwapTransaction(
  connection: Connection,
  userWallet: PublicKey,
  poolConfig: PoolConfig,
  inputAmount: number,
  slippage: number = 0.5
): Promise<Transaction> {
  console.log(chalk.cyan("Starting to build Orca swap transaction..."));
  
  // Get the Orca pool
  console.log(chalk.cyan("Searching for matching pool..."));
  const pool = await getOrcaPool(connection, poolConfig.tokenAMint, poolConfig.tokenBMint);
  
  if (!pool) {
    console.log(chalk.red("No matching pool found for the specified tokens"));
    throw new Error('Pool not found for the specified tokens');
  }
  
  console.log(chalk.green("Pool found! Getting token information..."));
  
  // Determine which token we're swapping from
  try {
    const tokenA = await pool.getTokenA();
    console.log(chalk.cyan(`TokenA: ${tokenA.mint.toString()}, scale: ${tokenA.scale}`));
    
    const tokenB = await pool.getTokenB();
    console.log(chalk.cyan(`TokenB: ${tokenB.mint.toString()}, scale: ${tokenB.scale}`));
    
    const isAtoB = poolConfig.tokenAMint.equals(tokenA.mint);
    console.log(chalk.cyan(`Swap direction: ${isAtoB ? 'A to B' : 'B to A'}`));
    
    // Create the quote
    const inputToken = isAtoB ? tokenA : tokenB;
    const outputToken = isAtoB ? tokenB : tokenA;
    
    // Convert amount to proper decimal places
    const scaledAmount = new Decimal(inputAmount).mul(
      new Decimal(10).pow(inputToken.scale)
    );
    console.log(chalk.cyan(`Input amount: ${inputAmount}, scaled: ${scaledAmount.toString()}`));
    
    // Get quote
    const slippageDecimal = new Decimal(slippage).div(100);
    console.log(chalk.cyan(`Slippage: ${slippage}%, as decimal: ${slippageDecimal.toString()}`));
    
    console.log(chalk.cyan("Building swap transaction..."));
    console.log(chalk.cyan(`Using wallet: ${userWallet.toString()}`));
    
    // Build the swap transaction
    try {
      const swapPayload = await pool.swap(
        userWallet,
        inputToken,
        new Decimal(scaledAmount.toFixed(0)),
        slippageDecimal
      );
      
      console.log(chalk.green("Swap transaction built successfully!"));
      return swapPayload.transaction;
    } catch (error) {
      console.error(chalk.red('Error in pool.swap():'), error);
      throw new Error(`Failed in pool.swap(): ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    console.error(chalk.red('Error during swap transaction build:'), error);
    throw new Error(`Failed to build Orca swap transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}