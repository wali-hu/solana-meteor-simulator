"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateSwap = simulateSwap;
// meteoraSimulator.ts
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const meteora_1 = require("./meteora");
async function simulateSwap(connection, pool, // Meteora pool instance from @meteora-ag/dynamic-amm-sdk
inAmount // USDC amount (e.g. 1000.5)
) {
    try {
        // ——————————————————————————————————————————————
        // 1️⃣ Identify pool mints (updated SDK: tokenMintA/tokenMintB)
        // ——————————————————————————————————————————————
        if (!pool.tokenMintA || !pool.tokenMintB) {
            console.error('Pool unexpected shape:', Object.keys(pool)); // debug helper
            return { estimatedOutTokens: 0, computeUnits: 0, error: 'Missing tokenMintA/tokenMintB on pool' };
        }
        const tokenA = pool.tokenMintA; // USDC or output
        const tokenB = pool.tokenMintB; // the other side
        // Determine which is USDC (base) vs the output token
        const baseMint = tokenA.equals(meteora_1.USDC_MINT) ? tokenA
            : tokenB.equals(meteora_1.USDC_MINT) ? tokenB
                : null;
        const outMint = baseMint?.equals(tokenA) ? tokenB
            : baseMint?.equals(tokenB) ? tokenA
                : null;
        if (!baseMint || !outMint) {
            return { estimatedOutTokens: 0, computeUnits: 0, error: 'Pool does not contain USDC' };
        }
        // ——————————————————————————————————————————————
        // 2️⃣ On-chain quote via SDK
        // ——————————————————————————————————————————————
        const baseDecimals = (0, meteora_1.tokenDecimals)(baseMint);
        const inLamports = new anchor_1.BN(Math.round(inAmount * 10 ** baseDecimals));
        const slippage = 0.01; // 1%
        const { minSwapOutAmount } = pool.getSwapQuote(outMint, inLamports, slippage);
        // minSwapOutAmount is a BN in out-token lamports
        // ——————————————————————————————————————————————
        // 3️⃣ Build the swap Transaction
        // ——————————————————————————————————————————————
        const payer = web3_js_1.Keypair.generate();
        const swapTx = await pool.swap(payer.publicKey, outMint, inLamports, minSwapOutAmount);
        // Attach a fresh blockhash & fake fee-payer
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        swapTx.recentBlockhash = blockhash;
        swapTx.feePayer = payer.publicKey;
        // ——————————————————————————————————————————————
        // 4️⃣ Simulate as VersionedTransaction for CU
        // ——————————————————————————————————————————————
        const messageV0 = swapTx.compileMessage();
        const vtx = new web3_js_1.VersionedTransaction(messageV0);
        const simulation = await connection.simulateTransaction(vtx, {
            replaceRecentBlockhash: true,
            sigVerify: false
        });
        if (simulation.value.err) {
            return {
                estimatedOutTokens: 0,
                computeUnits: 0,
                error: JSON.stringify(simulation.value.err)
            };
        }
        const computeUnits = simulation.value.unitsConsumed ?? 0;
        // ——————————————————————————————————————————————
        // 5️⃣ Format and return results
        // ——————————————————————————————————————————————
        const outDecimals = (0, meteora_1.tokenDecimals)(outMint);
        const estimatedOut = minSwapOutAmount.toNumber() / 10 ** outDecimals;
        return { estimatedOutTokens: estimatedOut, computeUnits };
    }
    catch (err) {
        return { estimatedOutTokens: 0, computeUnits: 0, error: err.message };
    }
}
