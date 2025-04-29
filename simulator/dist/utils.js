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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadWalletFromEnv = loadWalletFromEnv;
exports.createDummyWallet = createDummyWallet;
exports.saveWalletToFile = saveWalletToFile;
exports.loadWalletFromFile = loadWalletFromFile;
exports.sleep = sleep;
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
function loadWalletFromEnv() {
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('No wallet private key found in .env file');
    }
    return web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(privateKey));
}
function createDummyWallet() {
    return web3_js_1.Keypair.generate();
}
function saveWalletToFile(keypair, filename) {
    const secretKeyString = bs58_1.default.encode(keypair.secretKey);
    fs.writeFileSync(filename, secretKeyString);
    console.log(`Wallet saved to ${filename}`);
}
function loadWalletFromFile(filename) {
    const secretKeyString = fs.readFileSync(filename, 'utf-8').trim();
    return web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(secretKeyString));
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
