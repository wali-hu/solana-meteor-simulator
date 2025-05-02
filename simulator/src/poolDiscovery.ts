import axios, { AxiosResponse } from 'axios';
import https from 'https';

export interface DLMMPool {
  pool_mint: string;
  token_mints: string[];
  fee_pct: number;
}

// Base URL from your .env, e.g. "https://universal-search-api.meteora.ag/pool"
const API_URL = process.env.METEORA_API_URL! + '/search';

// Known SOL/USDC DLMM pool mint on mainnet as fallback:
const FALLBACK_POOL: DLMMPool = {
  pool_mint: 'BVRbyLjjfSBcoyiYFuxbgKYnWuiFaF9CSXEa5vdSZ9Hh',
  token_mints: [
    'So11111111111111111111111111111111111111112', // SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'  // USDC
  ],
  fee_pct: 0.002 // 0.2% (adjust if needed)
};

// IPv4-only HTTPS agent to avoid IPv6 timeouts
const ipv4Agent = new https.Agent({ family: 4 });

/**
 * Perform an HTTP GET with up to `retries` attempts on failure,
 * waiting 1s, 2s, 3s between attempts, using IPv4 only.
 */
async function fetchWithRetry(
  url: string,
  opts: { params: any },
  retries = 3
): Promise<AxiosResponse<any>> {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, {
        ...opts,
        httpsAgent: ipv4Agent,
        timeout: 10_000 // 10s
      });
    } catch (err: any) {
      console.warn(`Fetch attempt ${i + 1} failed: ${err.code || err.message}`);
      if (i === retries - 1) throw err;
      // backoff: 1s, 2s, 3s
      await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
    }
  }
  // should never reach here
  throw new Error('fetchWithRetry: unexpected exit');
}

/**
 * Find the SOL/USDC DLMM pool by querying the Meteora Universal Search API.
 * Retries on transient network errors, then falls back to a known pool if all retries fail.
 */
export async function findSolUsdcPool(): Promise<DLMMPool> {
  const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const solMint  = 'So11111111111111111111111111111111111111112';

  try {
    const response = await fetchWithRetry(API_URL, {
      params: {
        q: `${usdcMint},${solMint}`,
        query_by: 'token_mints',
        sort_by: 'tvl:desc',
        facet_by: 'pool_type'
      }
    });

    const hits: any[] = response.data.hits;
    const valid = hits
      .map((h) => h.document)
      .filter((doc: any) =>
        doc.pool_type === 'dlmm' &&
        doc.token_mints.includes(usdcMint) &&
        doc.token_mints.includes(solMint)
      );

    if (valid.length) {
      return valid[0] as DLMMPool;
    }

    console.warn('No SOL/USDC DLMM pool found in API response;');
    return FALLBACK_POOL;

  } catch (err) {
    console.error('Error fetching SOL/USDC DLMM pool:', (err as Error).message);
    console.info('Using fallback SOL/USDC DLMM pool mint.');
    return FALLBACK_POOL;
  }
}
