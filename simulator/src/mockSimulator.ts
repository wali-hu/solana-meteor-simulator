import { 
  Connection, 
  PublicKey,
  Keypair
} from '@solana/web3.js';
import { SimulationResult } from './simulator';

export async function mockSimulateSwap(
  connection: Connection,
  walletAddress: PublicKey,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  inputAmount: number,
  isMeteoraPool: boolean = true
): Promise<SimulationResult> {
  const poolType = isMeteoraPool ? "Meteora" : "Orca";
  console.log(`Mock simulating ${poolType} swap of ${inputAmount} tokens from ${tokenAMint.toString()} to ${tokenBMint.toString()}`);
  
  // Mock calculations - slightly different for Meteora vs Orca
  const fee = isMeteoraPool ? 0.0025 : 0.003; // Meteora typically has 0.25% fee vs Orca 0.3%
  const outputAmount = BigInt(Math.floor(inputAmount * (1 - fee) * 0.99 * 1000000)); // Fee + 1% slippage
  const computeUnits = isMeteoraPool ? 
                      180000 + Math.floor(Math.random() * 40000) : // Meteora CU range
                      200000 + Math.floor(Math.random() * 50000);  // Orca CU range
  
  // Mock program ID based on pool type
  const programId = isMeteoraPool ? 
                   "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo" : // Meteora program
                   "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP"; // Orca program
  
  // Mock logs
  const logs = [
    `Program ${programId} invoke [1]`,
    `Program log: Instruction: Swap`,
    `Program log: Input amount: ${inputAmount}`,
    `Program log: ${poolType} Pool used`,
    `Program log: Expected output: ${outputAmount}`,
    `Program log: Success`,
    `Program ${programId} consumed ${computeUnits} of 1400000 compute units`,
    `Program ${programId} success`
  ];
  
  return {
    success: true,
    computeUnits,
    outputAmount,
    logs
  };
}

// Add this function to match the import in index.ts
export async function mockOrcaSwapSimulation(
  connection: Connection,
  wallet: Keypair,
  tokenA: string,
  tokenB: string,
  inputAmount: number,
  slippage: number
): Promise<SimulationResult> {
  try {
    // Convert string addresses to PublicKey objects
    const tokenAMint = new PublicKey(tokenA);
    const tokenBMint = new PublicKey(tokenB);
    
    // Use the existing mockSimulateSwap function with isMeteoraPool set to false for Orca
    return await mockSimulateSwap(
      connection,
      wallet.publicKey,
      tokenAMint,
      tokenBMint,
      inputAmount,
      false // Set to false for Orca simulation
    );
  } catch (error) {
    console.error('Error in mockOrcaSwapSimulation:', error);
    return {
      success: false,
      computeUnits: 0, // Default value for computeUnits in error case
      error: error instanceof Error ? error.message : 'Unknown error',
      logs: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

