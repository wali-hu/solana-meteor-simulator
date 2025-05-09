"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.USDT_MINT = exports.SOL_MINT = exports.USDC_MINT = void 0;
exports.findPoolForToken = findPoolForToken;
exports.tokenDecimals = tokenDecimals;
// meteora.ts
const web3_js_1 = require("@solana/web3.js");
const dynamic_amm_sdk_1 = __importStar(require("@meteora-ag/dynamic-amm-sdk"));
// Well-known mints on Mainnet
exports.USDC_MINT = new web3_js_1.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
exports.SOL_MINT = new web3_js_1.PublicKey('So11111111111111111111111111111111111111112');
exports.USDT_MINT = new web3_js_1.PublicKey('Es9vMFrzaCERJDqtpvkaQbrb4pSrebZsQr2FVRzsVQHM');
/**
 * Returns a loaded Meteora pool instance for USDC↔<tokenMint>, or null if unsupported.
 */
async function findPoolForToken(connection, tokenMint) {
    if (tokenMint.equals(exports.SOL_MINT)) {
        // USDC ↔ wSOL
        return await dynamic_amm_sdk_1.default.create(connection, dynamic_amm_sdk_1.MAINNET_POOL.USDC_SOL);
    }
    else if (tokenMint.equals(exports.USDT_MINT)) {
        // USDC ↔ USDT
        return await dynamic_amm_sdk_1.default.create(connection, dynamic_amm_sdk_1.MAINNET_POOL.USDT_USDC);
    }
    // Add more token pairs here as needed...
    return null;
}
/** Returns decimal count for a known mint */
function tokenDecimals(mint) {
    if (mint.equals(exports.USDC_MINT) || mint.equals(exports.USDT_MINT))
        return 6;
    if (mint.equals(exports.SOL_MINT))
        return 9;
    // Default fallback if you introduce new tokens:
    return 6;
}
