import { 
    Connection, 
    PublicKey
  } from '@solana/web3.js';
  import { SimulationResult } from './simulator';
  
  export async function mockSimulateSwap(
    connection: Connection,
    walletAddress: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    inputAmount: number
  ): Promise<SimulationResult> {
    console.log(`Mock simulating swap of ${inputAmount} tokens from ${tokenAMint.toString()} to ${tokenBMint.toString()}`);
    
    // Mock calculations
    const outputAmount = BigInt(Math.floor(inputAmount * 0.98 * 1000000)); // 2% slippage
    const computeUnits = 200000 + Math.floor(Math.random() * 50000); // Random CU between 200k-250k
    
    // Mock logs
    const logs = [
      `Program 11111111111111111111111111111111 invoke [1]`,
      `Program log: Instruction: Swap`,
      `Program log: Input amount: ${inputAmount}`,
      `Program log: Expected output: ${outputAmount}`,
      `Program log: Success`,
      `Program 11111111111111111111111111111111 consumed ${computeUnits} of 1400000 compute units`,
      `Program 11111111111111111111111111111111 success`
    ];
    
    return {
      success: true,
      computeUnits,
      outputAmount,
      logs
    };
  }