import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_KEY_HEX = process.env.SERVER_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_HEX) {
  throw new Error('SERVER_ENCRYPTION_KEY is not defined in the environment variables.');
}

const keyBuffer = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');

if (keyBuffer.length !== 32) {
  throw new Error(`SERVER_ENCRYPTION_KEY must be a 32-byte hex-encoded key (64 characters). Current length is ${keyBuffer.length} bytes.`);
}

/**
 * Encrypts cleartext using AES-256-GCM
 * @param {string} text Plaintext to encrypt
 * @returns {object} { encryptedContent: string (base64), iv: string (base64), authTag: string (base64) }
 */
export function encrypt(text) {
  // AES-GCM standard IV length is 12 bytes (96 bits)
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedContent: encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

/**
 * Decrypts ciphertext using AES-256-GCM
 * @param {string} encryptedContent Base64-encoded ciphertext
 * @param {string} iv Base64-encoded IV
 * @param {string} authTag Base64-encoded authentication tag
 * @returns {string} Plaintext
 */
export function decrypt(encryptedContent, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    keyBuffer,
    Buffer.from(iv, 'base64')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  
  let decrypted = decipher.update(encryptedContent, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
