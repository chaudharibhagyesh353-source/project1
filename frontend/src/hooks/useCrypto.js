/**
 * Utility functions for browser-side cryptography using the Web Crypto API.
 */

// Helper to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives both a 256-bit AES-GCM encryption key and a 256-bit server authentication key
 * from a password and email.
 * @param {string} password The user's password
 * @param {string} email The user's email (used as salt)
 * @returns {Promise<{authKey: string, encryptionKey: CryptoKey}>} Derived keys
 */
export async function deriveKeys(password, email) {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  
  // Hash the email to get a deterministic 32-byte (256-bit) salt buffer
  const emailBytes = encoder.encode(email.toLowerCase().trim());
  const saltBuffer = await window.crypto.subtle.digest('SHA-256', emailBytes);
  
  // Import password as raw key material
  const masterKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive 512 bits (64 bytes) to split into encryption and auth keys
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    masterKey,
    512 // 512 bits = 64 bytes
  );
  
  // Split bits into two 32-byte chunks
  const encryptionBits = derivedBits.slice(0, 32);
  const authBits = derivedBits.slice(32, 64);
  
  // Import the first 32 bytes as a 256-bit AES-GCM encryption key
  const encryptionKey = await window.crypto.subtle.importKey(
    'raw',
    encryptionBits,
    'AES-GCM',
    false, // Key is non-extractable (cannot be read via JS)
    ['encrypt', 'decrypt']
  );
  
  // Convert the second 32 bytes to a hex string for server authentication
  const authKeyHex = Array.from(new Uint8Array(authBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  return {
    authKey: authKeyHex,
    encryptionKey
  };
}

/**
 * Encrypts plaintext in the browser using AES-GCM.
 * @param {string} plaintext Plaintext note content
 * @param {CryptoKey} cryptoKey Derived CryptoKey object
 * @returns {Promise<{encryptedBody: string, iv: string}>} Base64 encrypted ciphertext + IV
 */
export async function encryptText(plaintext, cryptoKey) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Generate a cryptographically secure 12-byte random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    cryptoKey,
    data
  );
  
  // The output of Web Crypto AES-GCM is ciphertext with the 16-byte auth tag appended.
  return {
    encryptedBody: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv)
  };
}

/**
 * Decrypts a base64 ciphertext in the browser using AES-GCM.
 * @param {string} encryptedBodyBase64 Base64-encoded ciphertext + tag
 * @param {string} ivBase64 Base64-encoded IV
 * @param {CryptoKey} cryptoKey Derived CryptoKey object
 * @returns {Promise<string>} Plaintext content
 */
export async function decryptText(encryptedBodyBase64, ivBase64, cryptoKey) {
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const encryptedData = base64ToArrayBuffer(encryptedBodyBase64);
  
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    cryptoKey,
    encryptedData
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * React Hook interface for ease of import
 */
export function useCrypto() {
  return {
    deriveKeys,
    encryptText,
    decryptText
  };
}
