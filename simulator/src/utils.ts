import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

export function loadWalletFromEnv(): Keypair {
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('No wallet private key found in .env file');
  }
  
  return Keypair.fromSecretKey(
    bs58.decode(privateKey)
  );
}

export function createDummyWallet(): Keypair {
  return Keypair.generate();
}

export function saveWalletToFile(keypair: Keypair, filename: string): void {
  const secretKeyString = bs58.encode(keypair.secretKey);
  fs.writeFileSync(filename, secretKeyString);
  console.log(`Wallet saved to ${filename}`);
}

export function loadWalletFromFile(filename: string): Keypair {
  const secretKeyString = fs.readFileSync(filename, 'utf-8').trim();
  return Keypair.fromSecretKey(bs58.decode(secretKeyString));
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}