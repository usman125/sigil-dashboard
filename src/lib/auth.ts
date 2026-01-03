// Auth utilities for managing authentication state

import {
  getAuthKeyHash,
  saltToUint8Array,
  decryptPrivateKey,
  EncryptedPrivateKey,
} from "./crypto";

// Session storage keys
const MASTER_PASSWORD_KEY = "masterPassword";
const SALT_KEY = "salt";
const PUBLIC_KEY = "publicKey";
const ENCRYPTED_PRIVATE_KEY = "encryptedPrivateKey";
const DECRYPTED_PRIVATE_KEY = "decryptedPrivateKey";

/**
 * Store master password in session storage (cleared on tab close)
 */
export function setMasterPassword(password: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(MASTER_PASSWORD_KEY, password);
  }
}

/**
 * Get master password from session storage
 */
export function getMasterPassword(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem(MASTER_PASSWORD_KEY);
  }
  return null;
}

/**
 * Clear master password from session storage
 */
export function clearMasterPassword(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(MASTER_PASSWORD_KEY);
  }
}

/**
 * Store salt in session storage
 */
export function setSalt(salt: number[]): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SALT_KEY, JSON.stringify(salt));
  }
}

/**
 * Get salt from session storage
 */
export function getSalt(): number[] | null {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(SALT_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  }
  return null;
}

/**
 * Get salt as Uint8Array
 */
export function getSaltUint8Array(): Uint8Array | null {
  const salt = getSalt();
  if (salt) {
    return saltToUint8Array(salt);
  }
  return null;
}

/**
 * Check if user is authenticated with master password
 */
export function isVaultUnlocked(): boolean {
  return getMasterPassword() !== null && getSalt() !== null;
}

/**
 * Derive and return auth key hash for master password verification
 */
export async function deriveAuthKeyHashFromSession(): Promise<string | null> {
  const masterPassword = getMasterPassword();
  const salt = getSaltUint8Array();

  if (!masterPassword || !salt) {
    return null;
  }

  return getAuthKeyHash(masterPassword, salt);
}

/**
 * Clear all auth data (logout)
 */
export function clearAuthData(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(MASTER_PASSWORD_KEY);
    sessionStorage.removeItem(SALT_KEY);
    sessionStorage.removeItem(PUBLIC_KEY);
    sessionStorage.removeItem(ENCRYPTED_PRIVATE_KEY);
    sessionStorage.removeItem(DECRYPTED_PRIVATE_KEY);
    localStorage.removeItem("token");
  }
}

// ==========================================
// Public Key Management
// ==========================================

/**
 * Store public key in session storage
 */
export function setPublicKey(key: JsonWebKey): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(PUBLIC_KEY, JSON.stringify(key));
  }
}

/**
 * Get public key from session storage
 */
export function getPublicKey(): JsonWebKey | null {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(PUBLIC_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  }
  return null;
}

// ==========================================
// PKI Key Management
// ==========================================

/**
 * Store encrypted private key in session storage
 */
export function setEncryptedPrivateKey(key: EncryptedPrivateKey): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(ENCRYPTED_PRIVATE_KEY, JSON.stringify(key));
  }
}

/**
 * Get encrypted private key from session storage
 */
export function getEncryptedPrivateKey(): EncryptedPrivateKey | null {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(ENCRYPTED_PRIVATE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Verify it has actual data
      if (parsed && parsed.ciphertext && parsed.ciphertext.length > 0 && parsed.iv && parsed.iv.length > 0) {
        return parsed;
      }
    }
  }
  return null;
}

/**
 * Store decrypted private key in session storage (only for current session)
 */
export function setDecryptedPrivateKey(key: JsonWebKey): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(DECRYPTED_PRIVATE_KEY, JSON.stringify(key));
  }
}

/**
 * Get decrypted private key from session storage
 */
export function getDecryptedPrivateKey(): JsonWebKey | null {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(DECRYPTED_PRIVATE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  }
  return null;
}

/**
 * Decrypt and cache the private key using master password
 * Call this after vault is unlocked
 */
export async function decryptAndCachePrivateKey(): Promise<JsonWebKey | null> {
  const masterPassword = getMasterPassword();
  const salt = getSaltUint8Array();
  const encryptedKey = getEncryptedPrivateKey();

  console.log("🔐 decryptAndCachePrivateKey called:", {
    hasMasterPassword: !!masterPassword,
    hasSalt: !!salt,
    hasEncryptedKey: !!encryptedKey,
    encryptedKeyStructure: encryptedKey ? {
      hasCiphertext: !!encryptedKey.ciphertext,
      ciphertextLength: encryptedKey.ciphertext?.length,
      hasIv: !!encryptedKey.iv,
      ivLength: encryptedKey.iv?.length,
    } : null,
  });

  if (!masterPassword || !salt || !encryptedKey) {
    console.warn("⚠️ Missing required data for private key decryption");
    return null;
  }

  try {
    const privateKey = await decryptPrivateKey(encryptedKey, masterPassword, salt);
    setDecryptedPrivateKey(privateKey);
    console.log("✅ Private key decrypted and cached successfully");
    return privateKey;
  } catch (error) {
    console.error("❌ Failed to decrypt private key:", error);
    return null;
  }
}

/**
 * Get the private key for email decryption
 * Will attempt to decrypt if not already cached
 */
export async function getPrivateKeyForDecryption(): Promise<JsonWebKey | null> {
  // First check if already decrypted
  const cached = getDecryptedPrivateKey();
  if (cached) {
    return cached;
  }

  // Try to decrypt
  return await decryptAndCachePrivateKey();
}

