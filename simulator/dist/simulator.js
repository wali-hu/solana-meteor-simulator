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
exports.simulateSwap = simulateSwap;
exports.displaySimulationResults = displaySimulationResults;
const web3_js_1 = require("@solana/web3.js");
const chalk_1 = __importDefault(require("chalk"));
function simulateSwap(connection, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get the latest blockhash
            const { blockhash, lastValidBlockHeight } = yield connection.getLatestBlockhash();
            // Create a message from the transaction
            const message = transaction.compileMessage();
            // Create a VersionedTransaction (v0) from the message
            const messageV0 = web3_js_1.TransactionMessage.decompile(message, { addressLookupTableAccounts: [] });
            const versionedTx = new web3_js_1.VersionedTransaction(messageV0.compileToV0Message());
            console.log(chalk_1.default.yellow('\nSimulating transaction...'));
            // Use the new simulation API
            const simulation = yield connection.simulateTransaction(versionedTx, {
                sigVerify: false,
                replaceRecentBlockhash: true,
                commitment: 'confirmed'
            });
            if (simulation.value.err) {
                console.log(chalk_1.default.red('Simulation failed with error:'), simulation.value.err);
                return {
                    success: false,
                    computeUnits: 0,
                    error: JSON.stringify(simulation.value.err),
                    logs: simulation.value.logs || []
                };
            }
            // Extract compute units from logs
            const computeUnits = extractComputeUnits(simulation.value);
            return {
                success: true,
                computeUnits,
                logs: simulation.value.logs || []
            };
        }
        catch (error) {
            console.log(chalk_1.default.red('Error during simulation:'), error);
            return {
                success: false,
                computeUnits: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
                logs: []
            };
        }
    });
}
function extractComputeUnits(simulation) {
    const logs = simulation.logs || [];
    // Look for log line that includes "consumed" and "compute units"
    for (const log of logs) {
        const match = log.match(/consumed (\d+) of \d+ compute units/);
        if (match && match[1]) {
            return parseInt(match[1], 10);
        }
    }
    return 0;
}
function displaySimulationResults(result) {
    console.log(chalk_1.default.cyan('\n===== Simulation Results ====='));
    console.log(`Status: ${result.success
        ? chalk_1.default.green('✅ Success')
        : chalk_1.default.red('❌ Failed')}`);
    console.log(`Compute Units: ${chalk_1.default.yellow(result.computeUnits.toLocaleString())}`);
    if (result.outputAmount) {
        console.log(`Output Amount: ${chalk_1.default.green(result.outputAmount.toString())}`);
    }
    if (result.error) {
        console.log(`Error: ${chalk_1.default.red(result.error)}`);
    }
    console.log(chalk_1.default.cyan('\nTransaction Logs:'));
    if (result.logs.length > 0) {
        // Display only the important parts of the logs
        const filteredLogs = result.logs.filter(log => !log.startsWith('Program log: ') ||
            log.includes('error') ||
            log.includes('compute') ||
            log.includes('success'));
        filteredLogs.forEach(log => {
            if (log.includes('error')) {
                console.log(chalk_1.default.red(`  ${log}`));
            }
            else if (log.includes('compute')) {
                console.log(chalk_1.default.yellow(`  ${log}`));
            }
            else if (log.includes('success')) {
                console.log(chalk_1.default.green(`  ${log}`));
            }
            else {
                console.log(`  ${log}`);
            }
        });
    }
    else {
        console.log(chalk_1.default.gray('  No logs available'));
    }
}
