import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getOrca, OrcaPoolConfig, OrcaPool } from '@orca-so/sdk';
import Decimal from 'decimal.js';

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
  
  // Search for the pool in Orca's config
  for (const poolId of Object.values(OrcaPoolConfig)) {
    try {
      const pool = orca.getPool(poolId);
      const poolTokenA = await pool.getTokenA();
      const poolTokenB = await pool.getTokenB();
      
      // Check if this pool matches our tokens (in either order)
      if (
        (poolTokenA.mint.equals(tokenAMint) && poolTokenB.mint.equals(tokenBMint)) ||
        (poolTokenA.mint.equals(tokenBMint) && poolTokenB.mint.equals(tokenAMint))
      ) {
        return pool;
      }
    } catch (error) {
      // Skip pools that fail to load
      continue;
    }
  }
  
  return null;
}

export async function buildOrcaSwapTransaction(
  connection: Connection,
  userWallet: PublicKey,
  poolConfig: PoolConfig,
  inputAmount: number,
  slippage: number = 0.5
): Promise<Transaction> {
  // Get the Orca pool
  const pool = await getOrcaPool(connection, poolConfig.tokenAMint, poolConfig.tokenBMint);
  
  if (!pool) {
    throw new Error('Pool not found for the specified tokens');
  }
  
  // Determine which token we're swapping from
  const tokenA = await pool.getTokenA();
  const tokenB = await pool.getTokenB();
  
  const isAtoB = poolConfig.tokenAMint.equals(tokenA.mint);
  
  // Create the quote
  const inputToken = isAtoB ? tokenA : tokenB;
  const outputToken = isAtoB ? tokenB : tokenA;
  
  // Convert amount to proper decimal places
  const scaledAmount = new Decimal(inputAmount).mul(
    new Decimal(10).pow(inputToken.scale)
  );
  
  // Get quote
  const slippageDecimal = new Decimal(slippage).div(100);
  
  try {
    // Build the swap transaction
    const swapPayload = await pool.swap(
      userWallet,
      inputToken,
      new Decimal(scaledAmount.toFixed(0)),
      slippageDecimal
    );
    
    return swapPayload.transaction;
  } catch (error) {
    console.error('Error building swap transaction:', error);
    throw new Error(`Failed to build Orca swap transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}