// Client-side cryptography module for zero-knowledge encryption
// Ported from Chrome extension crypto.js

/**
 * Derive an AES-GCM key from password and salt using PBKDF2
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations: 310000, // OWASP 2024 recommendation
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt an entry (alias data) with the master password
 */
export async function encryptEntry(
  entry: Record<string, unknown>,
  password: string,
  salt: Uint8Array
): Promise<{ ciphertext: number[]; iv: number[] }> {
  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(entry));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as Uint8Array<ArrayBuffer> },
    key,
    plaintext
  );

  return {
    ciphertext: Array.from(new Uint8Array(ciphertext)),
    iv: Array.from(iv),
  };
}

/**
 * Decrypt an encrypted entry
 */
export async function decryptEntry<T = Record<string, unknown>>(
  encrypted: { ciphertext: number[]; iv: number[] },
  password: string,
  salt: Uint8Array
): Promise<T> {
  const key = await deriveKey(password, salt);
  const ivArray = new Uint8Array(encrypted.iv);
  const ciphertextArray = new Uint8Array(encrypted.ciphertext);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivArray as Uint8Array<ArrayBuffer>,
    },
    key,
    ciphertextArray as Uint8Array<ArrayBuffer>
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decrypted)) as T;
}

/**
 * Derive auth key from password (domain-separated for authentication)
 */
export async function deriveAuthKey(
  password: string,
  salt: Uint8Array
): Promise<number[]> {
  const enc = new TextEncoder();
  const passwordWithDomain = password + "|auth";

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passwordWithDomain),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations: 310000,
      hash: "SHA-256",
    },
    keyMaterial,
    256 // 256 bits → 32 bytes
  );

  return Array.from(new Uint8Array(bits));
}

/**
 * SHA-256 hash of a string
 */
export async function sha256(str: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Get auth key hash from password and salt (for server verification)
 */
export async function getAuthKeyHash(
  password: string,
  salt: Uint8Array
): Promise<string> {
  const authKey = await deriveAuthKey(password, salt);
  const authKeyHex = Array.from(new Uint8Array(authKey))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return await sha256(authKeyHex);
}

/**
 * Generate a random salt (16 bytes)
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Convert salt array to Uint8Array
 */
export function saltToUint8Array(salt: number[]): Uint8Array {
  return new Uint8Array(salt);
}

// ==========================================
// RSA PKI Functions for Email Encryption
// ==========================================

export interface RSAKeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

export interface EncryptedPrivateKey {
  ciphertext: number[];
  iv: number[];
}

export interface EncryptedEmailField {
  ciphertext: string; // Base64
  iv: string; // Base64
  encryptedKey: string; // Base64
}

/**
 * Generate RSA-OAEP key pair for email encryption
 * @returns Public key (JWK) and Private key (JWK)
 */
export async function generateRSAKeyPair(): Promise<RSAKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );

  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return { publicKey, privateKey };
}

/**
 * Encrypt RSA private key with master password (for storage)
 * @param privateKey - RSA private key in JWK format
 * @param password - Master password
 * @param salt - User's salt
 * @returns Encrypted private key
 */
export async function encryptPrivateKey(
  privateKey: JsonWebKey,
  password: string,
  salt: Uint8Array
): Promise<EncryptedPrivateKey> {
  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(privateKey));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as Uint8Array<ArrayBuffer> },
    key,
    plaintext
  );

  return {
    ciphertext: Array.from(new Uint8Array(ciphertext)),
    iv: Array.from(iv),
  };
}

/**
 * Decrypt RSA private key with master password
 * @param encrypted - Encrypted private key
 * @param password - Master password
 * @param salt - User's salt
 * @returns RSA private key in JWK format
 */
export async function decryptPrivateKey(
  encrypted: EncryptedPrivateKey,
  password: string,
  salt: Uint8Array
): Promise<JsonWebKey> {
  const key = await deriveKey(password, salt);
  const ivArray = new Uint8Array(encrypted.iv);
  const ciphertextArray = new Uint8Array(encrypted.ciphertext);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivArray as Uint8Array<ArrayBuffer>,
    },
    key,
    ciphertextArray as Uint8Array<ArrayBuffer>
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decrypted)) as JsonWebKey;
}

/**
 * Import RSA private key from JWK for decryption
 */
async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["decrypt"]
  );
}

/**
 * Base64 decode helper
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Decrypt email field using hybrid decryption (RSA + AES)
 * @param encrypted - Encrypted email field { ciphertext, iv, encryptedKey }
 * @param privateKeyJwk - RSA private key in JWK format
 * @returns Decrypted plaintext
 */
export async function decryptEmailField(
  encrypted: EncryptedEmailField,
  privateKeyJwk: JsonWebKey
): Promise<string> {
  // Validate input
  if (!encrypted) {
    throw new Error("No encrypted data provided");
  }
  if (!encrypted.encryptedKey || !encrypted.ciphertext || !encrypted.iv) {
    throw new Error("Invalid encrypted field structure: missing required properties");
  }
  if (encrypted.encryptedKey.length === 0 || encrypted.ciphertext.length === 0) {
    throw new Error("Encrypted data is empty");
  }

  const privateKey = await importPrivateKey(privateKeyJwk);

  // Decrypt AES key with RSA private key
  const encryptedKeyBuffer = base64ToArrayBuffer(encrypted.encryptedKey);
  const aesKeyBuffer = await crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    encryptedKeyBuffer
  );

  // Import AES key
  const aesKey = await crypto.subtle.importKey(
    "raw",
    aesKeyBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // Decrypt ciphertext with AES key
  const ciphertextBuffer = base64ToArrayBuffer(encrypted.ciphertext);
  const ivBuffer = base64ToArrayBuffer(encrypted.iv);
  const ivArray = new Uint8Array(ivBuffer);

  // The ciphertext includes the auth tag at the end (16 bytes)
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivArray as Uint8Array<ArrayBuffer>,
    },
    aesKey,
    ciphertextBuffer
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

/**
 * Decrypt all encrypted fields of an email
 * @param email - Email object with encrypted fields
 * @param privateKeyJwk - RSA private key in JWK format
 * @returns Email with decrypted fields
 */
export async function decryptEmail(
  email: {
    subject: EncryptedEmailField;
    bodyPlain: EncryptedEmailField;
    bodyHtml?: EncryptedEmailField | null;
  },
  privateKeyJwk: JsonWebKey
): Promise<{ subject: string; bodyPlain: string; bodyHtml: string }> {
  const subject = await decryptEmailField(email.subject, privateKeyJwk);
  const bodyPlain = await decryptEmailField(email.bodyPlain, privateKeyJwk);
  const bodyHtml = email.bodyHtml
    ? await decryptEmailField(email.bodyHtml, privateKeyJwk)
    : "";

  return { subject, bodyPlain, bodyHtml };
}

