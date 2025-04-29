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
const commander_1 = require("commander");
const web3_js_1 = require("@solana/web3.js");
const simulator_1 = require("./simulator");
const pools_1 = require("./pools");
const utils_1 = require("./utils");
const chalk_1 = __importDefault(require("chalk"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const program = new commander_1.Command();
program
    .name('solana-meteor-simulator')
    .description('Solana transaction simulation tool')
    .version('0.1.0');
program
    .command('create-wallet')
    .description('Create a new dummy wallet')
    .option('-o, --output <filename>', 'Output file for wallet', 'dummy-wallet.key')
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(chalk_1.default.cyan('Creating new dummy wallet...'));
    const wallet = (0, utils_1.createDummyWallet)();
    (0, utils_1.saveWalletToFile)(wallet, options.output);
    console.log(chalk_1.default.green('Done! Wallet public key:'), wallet.publicKey.toString());
}));
program
    .command('simulate-swap')
    .description('Simulate a token swap on a liquidity pool')
    .requiredOption('-a, --token-a <address>', 'First token mint address')
    .requiredOption('-b, --token-b <address>', 'Second token mint address')
    .requiredOption('-i, --input-amount <amount>', 'Amount to swap (in standard units)')
    .option('-s, --slippage <percentage>', 'Slippage tolerance percentage', '0.5')
    .option('-r, --rpc <url>', 'RPC endpoint URL', process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com')
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Setup connection
        console.log(chalk_1.default.cyan(`Connecting to RPC: ${options.rpc}`));
        const connection = new web3_js_1.Connection(options.rpc);
        // Load wallet
        let wallet;
        try {
            wallet = (0, utils_1.loadWalletFromEnv)();
            console.log(chalk_1.default.green('Using wallet from .env file:'), wallet.publicKey.toString());
        }
        catch (e) {
            console.log(chalk_1.default.yellow('No wallet in .env, creating dummy wallet...'));
            wallet = (0, utils_1.createDummyWallet)();
            console.log(chalk_1.default.green('Using dummy wallet:'), wallet.publicKey.toString());
        }
        // Create pool config
        const tokenAMint = new web3_js_1.PublicKey(options.tokenA || options['token-a']);
        const tokenBMint = new web3_js_1.PublicKey(options.tokenB || options['token-b']);
        console.log(chalk_1.default.cyan('\nPool Parameters:'));
        console.log(`Token A: ${tokenAMint.toString()}`);
        console.log(`Token B: ${tokenBMint.toString()}`);
        console.log(`Input Amount: ${options.inputAmount}`);
        console.log(`Slippage: ${options.slippage}%`);
        const poolConfig = {
            address: new web3_js_1.PublicKey('11111111111111111111111111111111'), // Placeholder, will be determined by Orca SDK
            tokenAMint,
            tokenBMint,
            protocol: 'orca'
        };
        // Build swap transaction
        console.log(chalk_1.default.cyan('\nBuilding Orca swap transaction...'));
        const transaction = yield (0, pools_1.buildOrcaSwapTransaction)(connection, wallet.publicKey, poolConfig, parseFloat(options.inputAmount), parseFloat(options.slippage));
        // Run simulation
        const result = yield (0, simulator_1.simulateSwap)(connection, transaction);
        // Display results
        (0, simulator_1.displaySimulationResults)(result);
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(chalk_1.default.red('Error:'), error.message);
        }
        else {
            console.error(chalk_1.default.red('Error:'), String(error));
        }
        process.exit(1);
    }
}));
program.parse();
