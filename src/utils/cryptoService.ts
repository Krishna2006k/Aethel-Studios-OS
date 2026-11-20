/**
 * Real Client-Side Web Crypto API Service (AES-GCM 256-bit + PBKDF2 SHA-256)
 * Works in both Browser (window.crypto.subtle) and Node 20+ (globalThis.crypto.subtle)
 */

const ITERATIONS = 100000;

function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('Web Crypto API (crypto.subtle) is not available in this environment.');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesGcmKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  salt: string;
}

export async function encryptSecret(plainText: string, masterPassphrase: string): Promise<EncryptedPayload> {
  if (masterPassphrase.trim().length < 12) {
    throw new Error('Use a vault passphrase of at least 12 characters to encrypt new credentials.');
  }
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesGcmKey(masterPassphrase, salt);

  const encryptedBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encoder.encode(plainText)
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
  };
}

export async function decryptSecret(
  payload: EncryptedPayload,
  masterPassphrase: string
): Promise<string> {
  if (!masterPassphrase) {
    throw new Error('Enter the Vault Master Passphrase first.');
  }
  const subtle = getSubtleCrypto();
  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const cipherBytes = base64ToBytes(payload.ciphertext);
  const key = await deriveAesGcmKey(masterPassphrase, salt);

  try {
    const decryptedBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      cipherBytes as unknown as BufferSource
    );
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch {
    throw new Error('Decryption failed: Invalid Master Passphrase or tampered cipher.');
  }
}

export function formatCipherPreview(ciphertext: string, iv: string): string {
  const cleanCipher = ciphertext.slice(0, 14);
  const cleanIv = iv.slice(0, 6);
  return `AES256:${cleanIv}..${cleanCipher}=`;
}
