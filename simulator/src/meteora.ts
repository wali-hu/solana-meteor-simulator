// meteora.ts
import { Connection, PublicKey } from '@solana/web3.js';
import AmmImpl, { MAINNET_POOL } from '@meteora-ag/dynamic-amm-sdk';

// Well-known mints on Mainnet
export const USDC_MINT   = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const SOL_MINT    = new PublicKey('So11111111111111111111111111111111111111112');
export const USDT_MINT   = new PublicKey('Es9vMFrzaCERJDqtpvkaQbrb4pSrebZsQr2FVRzsVQHM');

/**
 * Returns a loaded Meteora pool instance for USDC↔<tokenMint>, or null if unsupported.
 */
export async function findPoolForToken(
  connection: Connection,
  tokenMint: PublicKey
) {
  if (tokenMint.equals(SOL_MINT)) {
    // USDC ↔ wSOL
    return await AmmImpl.create(connection, MAINNET_POOL.USDC_SOL);
  } else if (tokenMint.equals(USDT_MINT)) {
    // USDC ↔ USDT
    return await AmmImpl.create(connection, MAINNET_POOL.USDT_USDC);
  }
  // Add more token pairs here as needed...
  return null;
}

/** Returns decimal count for a known mint */
export function tokenDecimals(mint: PublicKey): number {
  if (mint.equals(USDC_MINT) || mint.equals(USDT_MINT)) return 6;
  if (mint.equals(SOL_MINT))                   return 9;
  // Default fallback if you introduce new tokens:
  return 6;
}
