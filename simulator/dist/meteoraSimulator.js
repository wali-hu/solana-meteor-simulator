"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateSwap = simulateSwap;
// meteoraSimulator.ts
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const meteora_1 = require("./meteora");
/**
 * Simulates swapping `inAmount` USDC to the pool's other token.
 * - Quotes via Meteora SDK (on-chain reserve data)
 * - Builds the swap tx, then simulates it for real CU usage
 */
async function simulateSwap(connection, pool, // Meteora pool instance from dynamic-amm-sdk
inAmount // in USDC (float, e.g. 1000.5)
) {
    try {
        // 1️⃣ Identify which side of the pool is USDC vs. output token
        const tokenA = pool.tokenA.address;
        const tokenB = pool.tokenB.address;
        const baseMint = tokenA.equals(meteora_1.USDC_MINT) ? tokenA
            : tokenB.equals(meteora_1.USDC_MINT) ? tokenB
                : null;
        const outMint = baseMint?.equals(tokenA) ? tokenB
            : baseMint?.equals(tokenB) ? tokenA
                : null;
        if (!baseMint || !outMint) {
            return { estimatedOutTokens: 0, computeUnits: 0, error: 'Pool does not contain USDC' };
        }
        // 2️⃣ Live on-chain quote using the SDK
        const baseDecimals = (0, meteora_1.tokenDecimals)(baseMint);
        const inLamports = new anchor_1.BN(Math.round(inAmount * 10 ** baseDecimals)); // USDC→lamports
        const slippage = 0.01; // 1% slippage tolerance
        const { minSwapOutAmount } = pool.getSwapQuote(outMint, inLamports, slippage);
        // minSwapOutAmount is a BN in output-token lamports
        // 3️⃣ Build the swap transaction
        const payer = web3_js_1.Keypair.generate(); // dummy fee-payer; no real signature needed
        const swapTx = await pool.swap(payer.publicKey, outMint, inLamports, minSwapOutAmount);
        // 4️⃣ Attach a fresh blockhash & fee-payer
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        swapTx.recentBlockhash = blockhash;
        swapTx.feePayer = payer.publicKey;
        // 5️⃣ Convert to VersionedTransaction for config-based simulation
        const messageV0 = swapTx.compileMessage();
        const vtx = new web3_js_1.VersionedTransaction(messageV0);
        // 6️⃣ Simulate with config options
        const simulation = await connection.simulateTransaction(vtx, {
            replaceRecentBlockhash: true,
            sigVerify: false,
        });
        if (simulation.value.err) {
            return { estimatedOutTokens: 0, computeUnits: 0, error: JSON.stringify(simulation.value.err) };
        }
        const computeUnits = simulation.value.unitsConsumed ?? 0;
        // 7️⃣ Convert quoted output back to a float amount
        const outDecimals = (0, meteora_1.tokenDecimals)(outMint);
        const estimatedOut = minSwapOutAmount.toNumber() / 10 ** outDecimals;
        return {
            estimatedOutTokens: estimatedOut,
            computeUnits,
        };
    }
    catch (err) {
        return { estimatedOutTokens: 0, computeUnits: 0, error: err.message };
    }
}
