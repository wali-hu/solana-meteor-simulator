"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrcaPool = getOrcaPool;
exports.buildOrcaSwapTransaction = buildOrcaSwapTransaction;
const sdk_1 = require("@orca-so/sdk");
const decimal_js_1 = __importDefault(require("decimal.js"));
function getOrcaPool(connection, tokenAMint, tokenBMint) {
    return __awaiter(this, void 0, void 0, function* () {
        const orca = (0, sdk_1.getOrca)(connection);
        // Search for the pool in Orca's config
        for (const poolId of Object.values(sdk_1.OrcaPoolConfig)) {
            try {
                const pool = orca.getPool(poolId);
                const poolTokenA = yield pool.getTokenA();
                const poolTokenB = yield pool.getTokenB();
                // Check if this pool matches our tokens (in either order)
                if ((poolTokenA.mint.equals(tokenAMint) && poolTokenB.mint.equals(tokenBMint)) ||
                    (poolTokenA.mint.equals(tokenBMint) && poolTokenB.mint.equals(tokenAMint))) {
                    return pool;
                }
            }
            catch (error) {
                // Skip pools that fail to load
                continue;
            }
        }
        return null;
    });
}
function buildOrcaSwapTransaction(connection_1, userWallet_1, poolConfig_1, inputAmount_1) {
    return __awaiter(this, arguments, void 0, function* (connection, userWallet, poolConfig, inputAmount, slippage = 0.5) {
        // Get the Orca pool
        const pool = yield getOrcaPool(connection, poolConfig.tokenAMint, poolConfig.tokenBMint);
        if (!pool) {
            throw new Error('Pool not found for the specified tokens');
        }
        // Determine which token we're swapping from
        const tokenA = yield pool.getTokenA();
        const tokenB = yield pool.getTokenB();
        const isAtoB = poolConfig.tokenAMint.equals(tokenA.mint);
        // Create the quote
        const inputToken = isAtoB ? tokenA : tokenB;
        const outputToken = isAtoB ? tokenB : tokenA;
        // Convert amount to proper decimal places
        const scaledAmount = new decimal_js_1.default(inputAmount).mul(new decimal_js_1.default(10).pow(inputToken.scale));
        // Get quote
        const slippageDecimal = new decimal_js_1.default(slippage).div(100);
        try {
            // Build the swap transaction
            const swapPayload = yield pool.swap(userWallet, inputToken, new decimal_js_1.default(scaledAmount.toFixed(0)), slippageDecimal);
            return swapPayload.transaction;
        }
        catch (error) {
            console.error('Error building swap transaction:', error);
            throw new Error(`Failed to build Orca swap transaction: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
}
