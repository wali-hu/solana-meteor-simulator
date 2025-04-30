import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction, 
  SystemProgram, 
  Keypair 
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

// Meteora program IDs
export const METEORA_DLMM_PROGRAM_ID = new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo');
const METEORA_API_URL =
  process.env.METEORA_API_URL ||
  'https://universal-search-api.meteora.ag/pool';


// Interface for Meteora pool data
interface MeteoraPool {
  address: string;
  tokenA: { mint: string; decimals: number };
  tokenB: { mint: string; decimals: number };
  fee: number;
}

// Token info cache to avoid duplicate fetches
const tokenInfoCache = new Map<string, {
  address: string;
  decimals: number;
  symbol: string;
}>();

/**
 * Fetch token information from the Solana blockchain
 */
async function getTokenInfo(connection: Connection, mintAddress: string) {
  if (tokenInfoCache.has(mintAddress)) {
    return tokenInfoCache.get(mintAddress);
  }

  try {
    // Get token metadata from the Solana chain
    const mintPubkey = new PublicKey(mintAddress);
    const tokenMintInfo = await connection.getParsedAccountInfo(mintPubkey);
    
    if (!tokenMintInfo.value || !tokenMintInfo.value.data) {
      throw new Error(`Failed to get token info for ${mintAddress}`);
    }
    
    // @ts-ignore - The parsed data structure is not fully typed in Solana web3.js
    const data = tokenMintInfo.value.data.parsed.info;
    const decimals = data.decimals;
    const symbol = data.symbol || 'UNKNOWN';
    
    const tokenInfo = {
      address: mintAddress,
      decimals,
      symbol
    };
    
    tokenInfoCache.set(mintAddress, tokenInfo);
    return tokenInfo;
  } catch (error) {
    console.error(`Error fetching token info for ${mintAddress}:`, error);
    
    // For native SOL, which isn't actually an SPL token
    if (mintAddress === 'So11111111111111111111111111111111111111112') {
      const solInfo = {
        address: mintAddress,
        decimals: 9,
        symbol: 'SOL'
      };
      tokenInfoCache.set(mintAddress, solInfo);
      return solInfo;
    }
    
    // For USDC, which is commonly used
    if (mintAddress === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
      const usdcInfo = {
        address: mintAddress,
        decimals: 6,
        symbol: 'USDC'
      };
      tokenInfoCache.set(mintAddress, usdcInfo);
      return usdcInfo;
    }
    
    throw error;
  }
}

/**
 * Search for a Meteora DLMM pool via Universal Search API
 */
async function findMeteoraPool(
  tokenAMint: string,
  tokenBMint: string
): Promise<MeteoraPool | null> {
  try {
    const response = await axios.get(`${METEORA_API_URL}/search`, {
      params: {
        q: [tokenAMint, tokenBMint].join(','),        // comma-separated mints
        query_by: 'pool_mint,pool_name,token_mints',                    // search by token mints
        sort_by: 'tvl:desc',                         // highest liquidity first
        facet_by: 'pool_type'                        // group by pool type
      }
    }); // axios GET with params :contentReference[oaicite:7]{index=7}

    // Universal Search returns pools under data.pools or top-level pools
    const pools: any[] =
      response.data.data?.pools || response.data.pools || [];

    const dlmmPools = pools.filter(p => p.pool_type === 'DLMM' || p.facet === 'DLMM');

    if (dlmmPools.length === 0) {
      console.log(`No DLMM pool found for ${tokenAMint}/${tokenBMint}`);
      return null;
    }

    const best = dlmmPools[0];
    return {
      address: best.address,
      tokenA: { mint: best.tokenA.mint, decimals: best.tokenA.decimals },
      tokenB: { mint: best.tokenB.mint, decimals: best.tokenB.decimals },
      fee: best.fee ?? 0.0025
    };
  } catch (err: any) {
    if (err.code === 'ENOTFOUND') {
      console.error(
        'DNS lookup failed for Meteora API. Check METEORA_API_URL in your .env.'
      );
    } else {
      console.error('Error fetching Meteora pool:', err);
    }
    return null;
  }
}

/**
 * Create a mock Meteora pool for tokens that don't have a real pool
 * This is used for demonstration and testing purposes
 */
function createMockMeteoraPool(tokenAMint: string, tokenBMint: string): MeteoraPool | null {
  // We'll create mock pools for common token pairs
  // USDC-SOL pair (very common)
  if ((tokenAMint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' && 
       tokenBMint === 'So11111111111111111111111111111111111111112') ||
      (tokenBMint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' && 
       tokenAMint === 'So11111111111111111111111111111111111111112')) {
    
    return {
      address: 'MockMeteoraPool11111111111111111111111111111111',
      tokenA: {
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        decimals: 6
      },
      tokenB: {
        mint: 'So11111111111111111111111111111111111111112', // SOL
        decimals: 9
      },
      fee: 0.0025 // 0.25% fee
    };
  }
  
  // Add more mock pools for other common pairs as needed
  
  return null;
}

/**
 * Get a quote for swapping tokens through Meteora
 */
async function getMeteoraQuote(
  pool: MeteoraPool,
  inputMint: string,
  outputMint: string,
  inputAmount: number,
  slippage: number
) {
  try {
    // Determine if we're swapping from tokenA to tokenB or vice versa
    const isAtoB = inputMint === pool.tokenA.mint;
    const inputDecimals = isAtoB ? pool.tokenA.decimals : pool.tokenB.decimals;
    const outputDecimals = isAtoB ? pool.tokenB.decimals : pool.tokenA.decimals;
    
    // Convert input amount to the proper format (accounting for decimals)
    const adjustedInputAmount = inputAmount * Math.pow(10, inputDecimals);
    
    // For a real implementation, you'd call Meteora's quote API
    // For our simulator, we'll calculate a simulated quote
    const expectedOutput = calculateExpectedOutput(
      inputAmount,
      inputDecimals,
      outputDecimals,
      isAtoB ? 10.5 : 0.095, // Mock price (SOL/USDC ~ 10.5, USDC/SOL ~ 0.095)
      pool.fee
    );
    
    return {
      expectedOutputAmount: expectedOutput,
      minimumOutputAmount: expectedOutput * (1 - slippage / 100), // Apply slippage
      fee: pool.fee,
      priceImpact: 0.1 // Mock price impact
    };
  } catch (error) {
    console.error('Error getting Meteora quote:', error);
    return null;
  }
}

/**
 * Calculate expected output based on Meteora's fee structure (simplified)
 */
export function calculateExpectedOutput(
  inputAmount: number,
  inputDecimals: number,
  outputDecimals: number,
  price: number,
  tradeFee: number = 0.0025 // Default 0.25% fee
): number {
  // Apply fee to input amount
  const amountAfterFee = inputAmount * (1 - tradeFee);
  
  // Convert based on price
  let outputAmount = amountAfterFee * price;
  
  // Round to appropriate decimal places
  return parseFloat(outputAmount.toFixed(outputDecimals));
}

/**
 * Build a transaction for swapping tokens through a Meteora pool
 */
export async function buildMeteoraSwapTransaction(
  connection: Connection,
  wallet: Keypair,
  tokenAStr: string,
  tokenBStr: string,
  inputAmount: number,
  slippage: number = 1
): Promise<Transaction | null> {
  try {
    const tokenAMint = new PublicKey(tokenAStr);
    const tokenBMint = new PublicKey(tokenBStr);
    
    // Get token information
    const tokenAInfo = await getTokenInfo(connection, tokenAStr);
    const tokenBInfo = await getTokenInfo(connection, tokenBStr);
    
    if (!tokenAInfo || !tokenBInfo) {
      console.error('Failed to get token information');
      return null;
    }
    
    // Find a suitable Meteora pool
    const pool = await findMeteoraPool(tokenAStr, tokenBStr);
    if (!pool) {
      console.error('No suitable Meteora pool found');
      return null;
    }
    
    // Determine input and output tokens
    const inputMint = tokenAStr;
    const outputMint = tokenBStr;
    
    // Get quote
    const quote = await getMeteoraQuote(pool, inputMint, outputMint, inputAmount, slippage);
    if (!quote) {
      console.error('Failed to get quote for Meteora swap');
      return null;
    }
    
    console.log(`\nMeteora Quote:`);
    console.log(`Input: ${inputAmount} ${tokenAInfo.symbol}`);
    console.log(`Expected Output: ${quote.expectedOutputAmount} ${tokenBInfo.symbol}`);
    console.log(`Minimum Output (with ${slippage}% slippage): ${quote.minimumOutputAmount} ${tokenBInfo.symbol}`);
    console.log(`Fee: ${quote.fee * 100}%`);
    console.log(`Price Impact: ${quote.priceImpact}%`);
    
    // Build a transaction
    const transaction = new Transaction();
    
    // For a real implementation, you would:
    // 1. Get the user's associated token accounts  
    const inputTokenAccount = await getAssociatedTokenAddress(tokenAMint, wallet.publicKey);
    const outputTokenAccount = await getAssociatedTokenAddress(tokenBMint, wallet.publicKey);
    
    // Check if the output token account exists and create it if needed
    // Note: This is simplified and would need to be properly implemented in a real application
    const outputAccountInfo = await connection.getAccountInfo(outputTokenAccount);
    if (!outputAccountInfo) {
      console.log(`Creating associated token account for ${tokenBInfo.symbol}`);
      transaction.add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey, // payer
          outputTokenAccount, // associated token account address
          wallet.publicKey, // owner
          tokenBMint // mint
        )
      );
    }
    
    // 2. Create a Meteora swap instruction
    // This would be a real instruction to the Meteora program in a production environment
    // For our simulator, we're building a "mock" instruction that represents what would happen
    // The actual interaction with Meteora's program would require detailed knowledge of their program's instruction layout
    
    // Create a mock instruction that represents what a Meteora swap would look like
    const mockSwapInstruction = new TransactionInstruction({
      programId: METEORA_DLMM_PROGRAM_ID,
      keys: [
        { pubkey: new PublicKey(pool.address), isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: inputTokenAccount, isSigner: false, isWritable: true },
        { pubkey: outputTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([
        // Mock data representing a swap instruction
        // In a real implementation, this would be properly encoded according to Meteora's program
        0, // Instruction index for "swap"
        ...new Uint8Array(new Float64Array([inputAmount]).buffer), // Input amount
        ...new Uint8Array(new Float64Array([quote.minimumOutputAmount]).buffer), // Minimum output
      ])
    });
    
    transaction.add(mockSwapInstruction);
    
    // Add a recent blockhash to make the transaction valid
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;
    
    return transaction;
  } catch (error) {
    console.error('Error building Meteora swap transaction:', error);
    return null;
  }
}