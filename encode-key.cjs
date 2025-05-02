// encode-key.cjs
const fs = require('fs');
const bs58 = require('bs58');

// Read the keypair from your id.json
const keypairData = JSON.parse(
  fs.readFileSync(process.env.HOME + '/my-solana-wallet/id.json', 'utf8')
);

// Check if we have an array (which would be the bytes of the keypair)
if (Array.isArray(keypairData)) {
  // Convert the array to a Buffer
  const keyBuffer = Buffer.from(keypairData);
  
  // Encode the Buffer to a Base58 string
  const bs58Key = bs58.encode(keyBuffer);
  console.log('Base58 encoded private key:');
  console.log(bs58Key);
} else {
  // If the keypair is in another format, handle accordingly
  console.error('Unexpected format in id.json. Expected an array of bytes.');
}