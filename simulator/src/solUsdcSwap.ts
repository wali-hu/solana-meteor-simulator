import bs58 from 'bs58';
import {
    Connection,
    Keypair,
    PublicKey,
    VersionedTransaction,
    TransactionMessage,
    SimulateTransactionConfig,
    TransactionInstruction
  } from '@solana/web3.js';
  import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
  import BN from 'bn.js';
  import { findSolUsdcPool, DLMMPool } from './poolDiscovery';
  import { METEORA_DLMM_PROGRAM_ID } from './constants';
  
  // 2.1 Prepare connection & wallet
  const connection = new Connection(process.env.RPC_ENDPOINT!, 'confirmed');
  const wallet = Keypair.fromSecretKey(
  bs58.decode(process.env.WALLET_PRIVATE_KEY!)
)
  
  // 2.2 Construct swap instruction
  async function buildSwapIx(pool: DLMMPool, amountIn: number, minOut: number): Promise<TransactionInstruction> {
    const poolMint = new PublicKey(pool.pool_mint);
    // Derive ATAs
    const userUsdcAta = await getAssociatedTokenAddress(
      new PublicKey(pool.token_mints[0]), wallet.publicKey
    );  // USDC ATA :contentReference[oaicite:3]{index=3}
    const userSolAta = await getAssociatedTokenAddress(
      new PublicKey(pool.token_mints[1]), wallet.publicKey
    );  // SOL ATA :contentReference[oaicite:4]{index=4}
  
    const data = Buffer.concat([
      Buffer.from([1]),                           // swap ix index
      new BN(amountIn).toArrayLike(Buffer, 'le', 8),
      new BN(minOut).toArrayLike(Buffer, 'le', 8)
    ]);
  
    return new TransactionInstruction({
      programId: METEORA_DLMM_PROGRAM_ID,
      keys: [
        { pubkey: poolMint, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: userUsdcAta, isSigner: false, isWritable: true },
        { pubkey: userSolAta, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
      ],
      data
    });
  }
  
  // 3. Assemble & simulate
  export async function runSolUsdcSwapSimulation() {
    const pool = await findSolUsdcPool();
  
    // 2.2 Build instruction for 10 USDC → (approx) 9 SOL
    const ix = await buildSwapIx(pool, 10 * 10**6, 9 * 10**9);
  
    // 2.3 Assemble VersionedTransaction
    const { blockhash } = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: blockhash,
      instructions: [ix]
    }).compileToV0Message();  // 
  
    const vtx = new VersionedTransaction(messageV0);
    vtx.sign([wallet]);          // signature (not actually broadcast) 
  
    // 3.1 Simulation config
    const simCfg: SimulateTransactionConfig = {
      replaceRecentBlockhash: true,
      sigVerify: false,
      commitment: 'confirmed'
    };
  
    // 3.2 Simulate
    const { value } = await connection.simulateTransaction(vtx, simCfg);  // :contentReference[oaicite:5]{index=5}
    console.log('Success:', !value.err);
    console.log('Compute Units:', value.unitsConsumed);
    console.log('Logs:\n', (value.logs || []).join('\n'));
  }
  