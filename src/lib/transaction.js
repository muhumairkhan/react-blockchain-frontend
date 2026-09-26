import { sha256Hex } from './crypto';
import { signWithWallet } from './wallet';

export function computeTxHash({ from, to, amount, nonce, timestamp }) {
  // Field order matters — must match core's transaction.ts exactly.
  return sha256Hex(JSON.stringify({ from, to, amount, nonce, timestamp }));
}

export async function buildAndSignTransaction({ walletName, passphrase, publicKey, from, to, amount, nonce }) {
  const timestamp = Date.now();
  const unsigned = { from, to, amount: Number(amount), nonce, timestamp };
  const hash = computeTxHash(unsigned);
  const signature = await signWithWallet(walletName, passphrase, hash);
  return { ...unsigned, publicKey, signature, hash };
}