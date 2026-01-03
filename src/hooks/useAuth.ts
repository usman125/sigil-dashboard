"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi, User, getAuthToken, setAuthToken, EncryptedPrivateKey } from "@/lib/api";
import {
  getMasterPassword,
  setMasterPassword,
  setSalt,
  getSalt,
  clearAuthData,
  isVaultUnlocked,
  setPublicKey,
  setEncryptedPrivateKey,
  getEncryptedPrivateKey,
  setDecryptedPrivateKey,
  decryptAndCachePrivateKey,
} from "@/lib/auth";
import {
  getAuthKeyHash,
  generateSalt,
  saltToUint8Array,
  generateRSAKeyPair,
  encryptPrivateKey,
} from "@/lib/crypto";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isVaultUnlocked: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isVaultUnlocked: false,
    isLoading: true,
  });

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setState({
        user: null,
        isAuthenticated: false,
        isVaultUnlocked: false,
        isLoading: false,
      });
      return;
    }

    try {
      const response = await authApi.getMe();
      setState({
        user: response.data,
        isAuthenticated: true,
        isVaultUnlocked: isVaultUnlocked(),
        isLoading: false,
      });
    } catch {
      setAuthToken(null);
      setState({
        user: null,
        isAuthenticated: false,
        isVaultUnlocked: false,
        isLoading: false,
      });
    }
  }, []);

  const register = async (
    email: string,
    password: string,
    masterPassword: string
  ) => {
    // Generate salt for master password
    const salt = generateSalt();
    const saltArray = Array.from(salt);

    // Derive auth key hash for server verification
    const authKeyHash = await getAuthKeyHash(masterPassword, salt);

    // Generate RSA keypair for email encryption
    const { publicKey, privateKey } = await generateRSAKeyPair();

    // Encrypt private key with master password
    const encryptedPrivateKeyData = await encryptPrivateKey(
      privateKey,
      masterPassword,
      salt
    );

    // Register with server (including PKI keys)
    const response = await authApi.register(
      email,
      password,
      saltArray,
      authKeyHash,
      publicKey,
      encryptedPrivateKeyData
    );

    // Store salt, master password, and keys in session
    setSalt(saltArray);
    setMasterPassword(masterPassword);
    setPublicKey(publicKey); // Store public key for encryption
    setEncryptedPrivateKey(encryptedPrivateKeyData);
    // Also cache the decrypted private key since we have it
    setDecryptedPrivateKey(privateKey);
    console.log("🔑 Keys cached for encryption/decryption");

    setState({
      user: response.user,
      isAuthenticated: true,
      isVaultUnlocked: true,
      isLoading: false,
    });

    return response;
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);

    console.log("🔐 Login response:", {
      hasUser: !!response.user,
      hasSalt: !!response.user?.salt,
      hasEncryptedPrivateKey: !!response.user?.encryptedPrivateKey,
      encryptedKeyStructure: response.user?.encryptedPrivateKey ? {
        hasCiphertext: !!response.user.encryptedPrivateKey.ciphertext,
        hasIv: !!response.user.encryptedPrivateKey.iv,
      } : null,
    });

    // Store salt from server response
    if (response.user.salt) {
      setSalt(response.user.salt);
    }

    // Store public key for encryption
    if (response.user.publicKey) {
      setPublicKey(response.user.publicKey);
      console.log("🔑 Public key stored in session");
    }

    // Store encrypted private key from server response
    // Check if encryptedPrivateKey has actual data (not just empty arrays)
    const epk = response.user.encryptedPrivateKey;
    if (epk && epk.ciphertext && epk.ciphertext.length > 0 && epk.iv && epk.iv.length > 0) {
      setEncryptedPrivateKey(epk);
      console.log("🔑 Encrypted private key stored in session");
    } else {
      console.warn("⚠️ No encrypted private key in login response - user may need to re-register");
    }

    setState((prev) => ({
      ...prev,
      user: response.user,
      isAuthenticated: true,
      isVaultUnlocked: false, // Need to unlock with master password
    }));

    return response;
  };

  const unlockVault = async (masterPassword: string) => {
    const salt = getSalt();
    if (!salt) {
      throw new Error("Salt not found. Please login again.");
    }

    const saltUint8 = saltToUint8Array(salt);

    // Derive auth key hash and verify with server
    const authKeyHash = await getAuthKeyHash(masterPassword, saltUint8);
    await authApi.verifyMasterPassword(authKeyHash);

    // Store master password in session
    setMasterPassword(masterPassword);

    // Check if user has PKI keys - if not, generate and set them up
    const existingEncryptedKey = getEncryptedPrivateKey();
    
    if (!existingEncryptedKey) {
      console.log("🔐 No PKI keys found - generating new keys...");
      
      // Generate RSA keypair for email encryption
      const { publicKey, privateKey } = await generateRSAKeyPair();
      
      // Encrypt private key with master password
      const encryptedPrivateKeyData = await encryptPrivateKey(
        privateKey,
        masterPassword,
        saltUint8
      );
      
      // Send to server
      console.log("📤 Uploading PKI keys to server...");
      const response = await authApi.setupPKI(publicKey, encryptedPrivateKeyData);
      
      // Store the keys in session
      setPublicKey(publicKey);
      setEncryptedPrivateKey(response.encryptedPrivateKey);
      setDecryptedPrivateKey(privateKey);
      
      console.log("✅ PKI keys generated and stored successfully");
    } else {
      // Pre-decrypt and cache the private key for email decryption
      const privateKey = await decryptAndCachePrivateKey();
      if (privateKey) {
        console.log("🔑 Private key decrypted and cached for email decryption");
      } else {
        console.warn("⚠️ Could not decrypt private key - email decryption may fail");
      }
    }

    setState((prev) => ({
      ...prev,
      isVaultUnlocked: true,
    }));
  };

  const logout = () => {
    authApi.logout();
    clearAuthData();
    setState({
      user: null,
      isAuthenticated: false,
      isVaultUnlocked: false,
      isLoading: false,
    });
    router.push("/auth/login");
  };

  return {
    ...state,
    register,
    login,
    unlockVault,
    logout,
    checkAuth,
  };
}

