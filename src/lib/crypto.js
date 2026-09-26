import { sha256 } from '@noble/hashes/sha256';
import { secp256k1 } from '@noble/curves/secp256k1';

// ---- byte/hex/base64 helpers ----------------------------------------------
function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function bytesToBase64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// ---- PEM (SPKI, public key only — private key never leaves this module) --
// secp256k1 SPKI header is fixed-length since the curve is fixed; the only
// variable part is the 64-byte X||Y point that follows.
const SPKI_PREFIX_HEX = '3056301006072a8648ce3d020106052b8104000a03420004';

function toPem(derBytes, label) {
  const b64 = bytesToBase64(derBytes).match(/.{1,64}/g).join('\n');
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----\n`;
}

function publicKeyBytesToPem(pubKeyBytes /* 65 bytes, 04||X||Y */) {
  const xy = bytesToHex(pubKeyBytes).slice(2); // drop the leading 04; SPKI prefix already has it
  return toPem(hexToBytes(SPKI_PREFIX_HEX + xy), 'PUBLIC KEY');
}

// ---- keys -------------------------------------------------------------
export function generateWalletKeyPair() {
  const privateKeyBytes = secp256k1.utils.randomPrivateKey();
  const publicKeyBytes = secp256k1.getPublicKey(privateKeyBytes, false); // uncompressed
  return { privateKeyBytes, publicKey: publicKeyBytesToPem(publicKeyBytes) };
}

export function sha256Hex(str) {
  return bytesToHex(sha256(new TextEncoder().encode(str)));
}

export function addressFromPublicKey(publicKeyPem) {
  return '0x' + sha256Hex(publicKeyPem).slice(-40);
}

/** Same digest + curve as core's crypto.ts sign(): sha256(data), secp256k1, DER, hex. */
export function sign(dataString, privateKeyBytes) {
  const digest = sha256(new TextEncoder().encode(dataString));
  return secp256k1.sign(digest, privateKeyBytes).toDERHex();
}

// ---- encryption at rest (PBKDF2 + AES-256-GCM via WebCrypto) -------------
async function deriveAesKey(passphrase, salt) {
  const base = await window.crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250_000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

export async function encryptPrivateKey(privateKeyBytes, passphrase) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);
  const ct = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, privateKeyBytes);
  return { salt: bytesToHex(salt), iv: bytesToHex(iv), ciphertext: bytesToHex(new Uint8Array(ct)) };
}

/** Throws on wrong passphrase or tampered data — fail closed, same as core's crypto.ts. */
export async function decryptPrivateKey(enc, passphrase) {
  const key = await deriveAesKey(passphrase, hexToBytes(enc.salt));
  const pt = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBytes(enc.iv) }, key, hexToBytes(enc.ciphertext)
  );
  return new Uint8Array(pt);
}