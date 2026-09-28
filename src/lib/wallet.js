import {
  generateWalletKeyPair, addressFromPublicKey,
  encryptPrivateKey, decryptPrivateKey, sign, publicKeyPemFromPrivateKey,
} from './crypto';

const PREFIX = 'poa-wallet:';
const SELECTED_KEY = 'poa-wallet-selected'; 

const key = (name) => `${PREFIX}${name}`;

export function saveSelectedWalletName(name) {
  if (!name) {
    localStorage.removeItem(SELECTED_KEY);
  } else {
    localStorage.setItem(SELECTED_KEY, name);
  }
}

export function loadSelectedWalletName() {
  return localStorage.getItem(SELECTED_KEY) || '';
}

export function listWallets() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    // Modified: Skip the selection management key to ensure it isn't listed as a wallet
    if (k?.startsWith(PREFIX) && k !== SELECTED_KEY) {
      out.push(k.slice(PREFIX.length));
    }
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

// ---- export / import (keystore file) --------------------------------------
// A keystore is just what's already in localStorage for a wallet: the address,
// the public key, and the ENCRYPTED private key blob. The passphrase is never
// part of it, and the plaintext key is never written anywhere.

const isHex = (s) => typeof s === 'string' && s.length > 0 && s.length % 2 === 0 && /^[0-9a-f]+$/i.test(s);

export function exportWallet(name) {
  const raw = localStorage.getItem(key(name));
  if (!raw) throw new Error(`No wallet named "${name}"`);
  const { address, publicKey, encryptedPrivateKey } = JSON.parse(raw);
  return { version: 1, name, address, publicKey, encryptedPrivateKey };
}

/**
 * Restores a wallet from an exported keystore. Verifies, in order:
 *  1. the file has the expected shape
 *  2. `address` really is the hash of `publicKey`
 *  3. the passphrase decrypts the key (AES-GCM rejects wrong passphrase / tampering)
 *  4. the decrypted private key really produces `publicKey`
 * Only then is the ORIGINAL encrypted blob saved — the decrypted key is
 * zeroed immediately and never persisted.
 */
export async function importWallet(name, keystore, passphrase) {
  let ks = keystore;
  if (typeof ks === 'string') {
    try { ks = JSON.parse(ks); } catch { throw new Error('Keystore is not valid JSON'); }
  }

  const { address, publicKey, encryptedPrivateKey: enc } = ks ?? {};
  if (
    typeof address !== 'string' || typeof publicKey !== 'string' || !enc ||
    !isHex(enc.salt) || !isHex(enc.iv) || !isHex(enc.ciphertext)
  ) {
    throw new Error('Keystore file is missing required fields');
  }
  if (!name) throw new Error('Wallet name is required');
  if (!passphrase) throw new Error('Passphrase is required');
  if (localStorage.getItem(key(name))) throw new Error(`Wallet "${name}" already exists`);

  if (addressFromPublicKey(publicKey) !== address) {
    throw new Error('Keystore address does not match its public key');
  }
  const duplicate = listWallets().find((w) => loadWalletMeta(w)?.address === address);
  if (duplicate) throw new Error(`This wallet is already imported as "${duplicate}"`);

  const blob = { salt: enc.salt, iv: enc.iv, ciphertext: enc.ciphertext };

  let privateKeyBytes;
  try {
    privateKeyBytes = await decryptPrivateKey(blob, passphrase);
  } catch {
    throw new Error('Wrong passphrase or corrupted keystore');
  }
  try {
    if (publicKeyPemFromPrivateKey(privateKeyBytes).trim() !== publicKey.trim()) {
      throw new Error('Decrypted key does not match the keystore public key');
    }
  } finally {
    privateKeyBytes.fill(0);
  }

  localStorage.setItem(key(name), JSON.stringify({ address, publicKey, encryptedPrivateKey: blob }));
  return { name, address, publicKey };
}

// ---- deletion ---------------------------------------------------------------
// IRREVERSIBLE: the private key is random, so once the encrypted blob is gone
// from localStorage the wallet can only be restored from an exported keystore.

export function deleteWallet(name) {
  localStorage.removeItem(key(name));
  if (loadSelectedWalletName() === name) saveSelectedWalletName('');
}

export function deleteAllWallets() {
  // Collect first: removing while iterating localStorage skips entries.
  const names = listWallets();
  names.forEach((n) => localStorage.removeItem(key(n)));
  saveSelectedWalletName('');
  return names.length;
}