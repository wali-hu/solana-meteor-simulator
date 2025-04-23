import { 
  Connection, 
  Transaction, 
  PublicKey, 
  SimulatedTransactionResponse,
  VersionedTransaction,
  TransactionMessage
} from '@solana/web3.js';
import chalk from 'chalk';

export interface SimulationResult {
  success: boolean;
  computeUnits: number;
  outputAmount?: bigint;
  error?: string;
  logs: string[];
}

export async function simulateSwap(
  connection: Connection,
  transaction: Transaction
): Promise<SimulationResult> {
  try {
    // Get the latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    
    // Create a message from the transaction
    const message = transaction.compileMessage();
    
    // Create a VersionedTransaction (v0) from the message
    const messageV0 = TransactionMessage.decompile(message, { addressLookupTableAccounts: [] });
    const versionedTx = new VersionedTransaction(messageV0.compileToV0Message());
    
    console.log(chalk.yellow('\nSimulating transaction...'));
    
    // Use the new simulation API
    const simulation = await connection.simulateTransaction(
      versionedTx,
      { 
        sigVerify: false,
        replaceRecentBlockhash: true,
        commitment: 'confirmed'
      }
    );
    
    if (simulation.value.err) {
      console.log(chalk.red('Simulation failed with error:'), simulation.value.err);
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
  } catch (error) {
    console.log(chalk.red('Error during simulation:'), error);
    return {
      success: false,
      computeUnits: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs: []
    };
  }
}

function extractComputeUnits(simulation: SimulatedTransactionResponse): number {
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

export function displaySimulationResults(result: SimulationResult): void {
  console.log(chalk.cyan('\n===== Simulation Results ====='));
  console.log(`Status: ${result.success 
    ? chalk.green('✅ Success') 
    : chalk.red('❌ Failed')}`);
  
  console.log(`Compute Units: ${chalk.yellow(result.computeUnits.toLocaleString())}`);
  
  if (result.outputAmount) {
    console.log(`Output Amount: ${chalk.green(result.outputAmount.toString())}`);
  }
  
  if (result.error) {
    console.log(`Error: ${chalk.red(result.error)}`);
  }
  
  console.log(chalk.cyan('\nTransaction Logs:'));
  if (result.logs.length > 0) {
    // Display only the important parts of the logs
    const filteredLogs = result.logs.filter(log => 
      !log.startsWith('Program log: ') || 
      log.includes('error') || 
      log.includes('compute') ||
      log.includes('success')
    );
    
    filteredLogs.forEach(log => {
      if (log.includes('error')) {
        console.log(chalk.red(`  ${log}`));
      } else if (log.includes('compute')) {
        console.log(chalk.yellow(`  ${log}`));
      } else if (log.includes('success')) {
        console.log(chalk.green(`  ${log}`));
      } else {
        console.log(`  ${log}`);
      }
    });
  } else {
    console.log(chalk.gray('  No logs available'));
  }
}