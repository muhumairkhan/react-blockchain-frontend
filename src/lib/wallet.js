import {
  generateWalletKeyPair, addressFromPublicKey,
  encryptPrivateKey, decryptPrivateKey, sign,
} from './crypto';

const PREFIX = 'poa-wallet:';
const key = (name) => `${PREFIX}${name}`;

export function listWallets() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
  }
  return out;
}

export function loadWalletMeta(name) {
  const raw = localStorage.getItem(key(name));
  if (!raw) return null;
  const { address, publicKey } = JSON.parse(raw);
  return { name, address, publicKey };
}

export async function createWallet(name, passphrase) {
  if (localStorage.getItem(key(name))) throw new Error(`Wallet "${name}" already exists`);
  const { privateKeyBytes, publicKey } = generateWalletKeyPair();
  const address = addressFromPublicKey(publicKey);
  const encryptedPrivateKey = await encryptPrivateKey(privateKeyBytes, passphrase);
  localStorage.setItem(key(name), JSON.stringify({ address, publicKey, encryptedPrivateKey }));
  return { name, address, publicKey };
}

/** Decrypts, signs, then scrubs the key from memory — never held longer than this call. */
export async function signWithWallet(name, passphrase, dataToSign) {
  const raw = localStorage.getItem(key(name));
  if (!raw) throw new Error(`No wallet named "${name}"`);
  const { encryptedPrivateKey } = JSON.parse(raw);

  let privateKeyBytes;
  try {
    privateKeyBytes = await decryptPrivateKey(encryptedPrivateKey, passphrase);
  } catch {
    throw new Error('Wrong passphrase');
  }
  try {
    return sign(dataToSign, privateKeyBytes);
  } finally {
    privateKeyBytes.fill(0);
  }
}