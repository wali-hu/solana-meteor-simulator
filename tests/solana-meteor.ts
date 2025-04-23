import * as anchor from '@project-serum/anchor';
import { Program, AnchorProvider } from '@project-serum/anchor';
import { SystemProgram, Keypair, PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
import assert from 'assert';

// ✅ Import raw IDL and safely extract the usable portion
import rawIdl from '../target/idl/solana_meteor.json';
import { Idl } from '@project-serum/anchor';

describe('solana_meteor (Milestone 1)', () => {
  const provider = AnchorProvider.local();
  anchor.setProvider(provider);

  // ✅ Strip out non-IDL fields safely
  const { address, metadata, ...idl } = rawIdl;
  const programId = new PublicKey(address);
  const program = new Program(idl as unknown as Idl, programId, provider);

  let poolAccount: Keypair;

  it('activates immediately when activation_point is in the past', async () => {
    poolAccount = Keypair.generate();
    const now = Math.floor(Date.now() / 1000);

    await program.methods
      .initPool(new BN(now - 60))
      .accounts({
        pool: poolAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([poolAccount])
      .rpc();

    await program.methods
      .activate()
      .accounts({ pool: poolAccount.publicKey })
      .rpc();

    const pool = await program.account.meteorPool.fetch(poolAccount.publicKey) as {
      isActive: boolean;
    };
    assert.equal(pool.isActive, true);
  });

  it('fails activation when activation_point is in the future', async () => {
    poolAccount = Keypair.generate();
    const now = Math.floor(Date.now() / 1000);

    await program.methods
      .initPool(new BN(now + 3600))
      .accounts({
        pool: poolAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([poolAccount])
      .rpc();

    try {
      await program.methods
        .activate()
        .accounts({ pool: poolAccount.publicKey })
        .rpc();
      assert.fail('Expected activation to throw');
    } catch (err: any) {
      assert.ok(
        err.error.errorMessage.includes('Pool is not activated yet'),
        'Expected NotActivatedYet error'
      );
    }
  });
});
