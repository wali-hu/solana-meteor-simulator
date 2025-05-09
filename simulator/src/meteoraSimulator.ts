// simulator/src/meteoraSimulator.ts
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { tokenDecimals, USDC_MINT } from './meteora';

export interface SimulationResult {
  estimatedOutTokens: number;
  computeUnits: number;
  error?: string;
}

export async function simulateSwap(
  connection: Connection,
  pool: any,           // Meteora pool instance
  inAmount: number     // USDC amount, e.g. 1000.5
): Promise<SimulationResult> {
  try {
    //  Refresh on-chain state
    // The SDK requires you to reload poolState/reserves before quoting.
    if (typeof pool.updateState === 'function') {
      await pool.updateState();  
    } else if (typeof pool.reload === 'function') {
      await pool.reload();        // Some SDK versions use reload()
    } else {
      console.warn('Warning: pool state not refreshed—quotes may be stale');
    }

    // Ensure trading is enabled
    // Pools have poolState.enabled and possibly poolState.activationTimestamp
    if (pool.poolState?.enabled === false) {
      return {
        estimatedOutTokens: 0,
        computeUnits: 0,
        error: 'Pool is currently disabled for trading',
      };
    }
    // Optional: check activation timestamp
    if (pool.poolState?.activationTimestamp) {
      const now = Math.floor(Date.now() / 1000);
      if (now < pool.poolState.activationTimestamp.toNumber()) {
        return {
          estimatedOutTokens: 0,
          computeUnits: 0,
          error: 'Pool trading not yet activated on-chain',
        };
      }
    }

    //  Identify mints
    if (!pool.tokenAMint || !pool.tokenBMint) {
      console.error('Pool shape:', Object.keys(pool));
      return {
        estimatedOutTokens: 0,
        computeUnits: 0,
        error: 'Unexpected pool fields; tokenAMint/tokenBMint missing',
      };
    }
    const tokenA = new PublicKey(pool.tokenAMint);
    const tokenB = new PublicKey(pool.tokenBMint);

    // Determine which is USDC←→Token
    const baseMint = tokenA.equals(USDC_MINT) ? tokenA
                   : tokenB.equals(USDC_MINT) ? tokenB
                   : null;
    const outMint  = baseMint?.equals(tokenA) ? tokenB
                   : baseMint?.equals(tokenB) ? tokenA
                   : null;
    if (!baseMint || !outMint) {
      return {
        estimatedOutTokens: 0,
        computeUnits: 0,
        error: 'Pool does not contain USDC',
      };
    }

    //  Fetch a live quote
    const baseDecimals = tokenDecimals(baseMint);
    const inLamports   = new BN(Math.round(inAmount * 10 ** baseDecimals));
    const slippage     = 0.01;  // 1% tolerance
    const { minSwapOutAmount } = pool.getSwapQuote(outMint, inLamports, slippage);

    //  Build the swap transaction
    const payer = Keypair.generate();
    const swapTx: Transaction = await pool.swap(
      payer.publicKey,
      outMint,
      inLamports,
      minSwapOutAmount
    );
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    swapTx.recentBlockhash = blockhash;
    swapTx.feePayer       = payer.publicKey;

    //  Simulate with VersionedTransaction for CU usage
    const messageV0 = swapTx.compileMessage();
    const vtx       = new VersionedTransaction(messageV0);
    const simulation = await connection.simulateTransaction(vtx, {
      replaceRecentBlockhash: true,
      sigVerify: false,
    });
    if (simulation.value.err) {
      return {
        estimatedOutTokens: 0,
        computeUnits: 0,
        error: JSON.stringify(simulation.value.err),
      };
    }
    const computeUnits = simulation.value.unitsConsumed ?? 0;

    // Convert output lamports → token float
    const outDecimals = tokenDecimals(outMint);
    const estimatedOut = minSwapOutAmount.toNumber() / 10 ** outDecimals;

    return { estimatedOutTokens: estimatedOut, computeUnits };
  } catch (err: any) {
    // Capture any assert or unexpected errors
    return { estimatedOutTokens: 0, computeUnits: 0, error: err.message };
  }
}
