"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, Key, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login, unlockVault, isAuthenticated, isVaultUnlocked } = useAuth();

  const [step, setStep] = useState<"credentials" | "master">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated and vault unlocked
  useEffect(() => {
    if (isAuthenticated && isVaultUnlocked) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isVaultUnlocked, router]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      setStep("master");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMasterPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await unlockVault(masterPassword);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid master password");
    } finally {
      setIsLoading(false);
    }
  };

  // Show nothing while redirecting
  if (isAuthenticated && isVaultUnlocked) {
    return null;
  }

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-8 shadow-2xl">
      <h2 className="text-2xl font-semibold mb-6 text-center">
        {step === "credentials" ? "Welcome back" : "Unlock Vault"}
      </h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/30 text-[var(--destructive)] text-sm">
          {error}
        </div>
      )}

      {step === "credentials" ? (
        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--muted-foreground)]">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[var(--input)] border border-[var(--border)] rounded-lg focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--muted-foreground)]">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-[var(--input)] border border-[var(--border)] rounded-lg focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMasterPasswordSubmit} className="space-y-4">
          <p className="text-[var(--muted-foreground)] text-sm mb-4">
            Enter your master password to decrypt your vault.
          </p>

          {/* Master Password */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--muted-foreground)]">
              Master Password
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--primary)]" />
              <input
                type={showMasterPassword ? "text" : "password"}
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-[var(--input)] border border-[var(--primary)]/50 rounded-lg focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                placeholder="••••••••••••"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowMasterPassword(!showMasterPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                {showMasterPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Unlocking...
              </>
            ) : (
              "Unlock Vault"
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("credentials");
              setMasterPassword("");
            }}
            className="w-full py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm transition-colors"
          >
            Back to login
          </button>
        </form>
      )}

      <div className="mt-6 pt-6 border-t border-[var(--border)] text-center">
        <p className="text-[var(--muted-foreground)] text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-[var(--primary)] hover:underline font-medium">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

