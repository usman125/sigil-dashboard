// API client for zero-knowladge-vault backend

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// Types
export interface EncryptedPrivateKey {
  ciphertext: number[];
  iv: number[];
}

export interface User {
  id: string;
  userId: string;
  email: string;
  salt: number[];
  hasMasterPW: boolean;
  publicKey?: JsonWebKey;
  encryptedPrivateKey?: EncryptedPrivateKey;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface Alias {
  _id: string;
  aliasId: string;
  aliasHash: string;
  ciphertext: number[];
  iv: number[];
  domain?: string;
  createdAt: string;
}

export interface EncryptedEmailField {
  ciphertext: string; // Base64
  iv: string; // Base64
  encryptedKey: string; // Base64
}

export interface Email {
  _id: string;
  alias: string;
  user: string;
  from: string;
  to: string;
  // Encrypted fields (when isEncrypted is true)
  subject: EncryptedEmailField | string;
  bodyPlain: EncryptedEmailField | string;
  bodyHtml?: EncryptedEmailField | string | null;
  receivedAt: string;
  isEncrypted?: boolean;
}

export interface GenerateAliasResponse {
  success: boolean;
  data: {
    id: string;
    aliasId: string;
    aliasHash: string;
    aliasEmail: string;
    domain?: string;
    createdAt: string;
  };
}

// Token management
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }
  } else {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== "undefined") {
    authToken = localStorage.getItem("token");
  }
  return authToken;
}

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || "API request failed");
  }

  return data;
}

// Auth API
export const authApi = {
  register: async (
    email: string,
    password: string,
    salt: number[],
    authKeyHash: string,
    publicKey: JsonWebKey,
    encryptedPrivateKey: EncryptedPrivateKey
  ): Promise<AuthResponse> => {
    const response = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        salt,
        authKeyHash,
        publicKey,
        encryptedPrivateKey,
      }),
    });
    if (response.token) {
      setAuthToken(response.token);
    }
    return response;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (response.token) {
      setAuthToken(response.token);
    }
    return response;
  },

  verifyMasterPassword: async (
    authKeyHash: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiRequest("/auth/verify-master", {
      method: "POST",
      body: JSON.stringify({ authKeyHash }),
    });
  },

  getMe: async (): Promise<{ success: boolean; data: User }> => {
    return apiRequest("/auth/me");
  },

  logout: () => {
    setAuthToken(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("masterPassword");
      sessionStorage.removeItem("salt");
    }
  },

  setupPKI: async (
    publicKey: JsonWebKey,
    encryptedPrivateKey: EncryptedPrivateKey
  ): Promise<{ success: boolean; message: string; encryptedPrivateKey: EncryptedPrivateKey }> => {
    return apiRequest("/auth/setup-pki", {
      method: "POST",
      body: JSON.stringify({ publicKey, encryptedPrivateKey }),
    });
  },
};

// Aliases API
export const aliasesApi = {
  getUserAliases: async (): Promise<{ success: boolean; aliases: Alias[] }> => {
    return apiRequest("/aliases/user-aliases");
  },

  generateAlias: async (
    format: "random" | "descriptive",
    ciphertext: number[],
    iv: number[],
    domain?: string
  ): Promise<GenerateAliasResponse> => {
    return apiRequest("/aliases/generate", {
      method: "POST",
      body: JSON.stringify({ format, ciphertext, iv, domain }),
    });
  },

  syncAliases: async (
    aliases: Array<{
      id: string;
      ciphertext: number[];
      aliasHash: string;
      iv: number[];
      domain?: string;
    }>
  ): Promise<{ success: boolean; synced: number }> => {
    return apiRequest("/aliases/sync-aliases", {
      method: "POST",
      body: JSON.stringify({ aliases }),
    });
  },

  deleteAlias: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest(`/aliases/${id}`, {
      method: "DELETE",
    });
  },
};

// Emails API
export const emailsApi = {
  getAliasEmails: async (
    aliasId: string
  ): Promise<{ success: boolean; data: Email[] }> => {
    return apiRequest(`/emails/alias-emails/${aliasId}`);
  },

  getEmail: async (id: string): Promise<{ success: boolean; data: Email[] }> => {
    return apiRequest(`/emails/${id}`);
  },
};

