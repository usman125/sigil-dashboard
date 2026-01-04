"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, Key, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): string | null => {
    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    if (masterPassword.length < 10) {
      return "Master password must be at least 10 characters";
    }
    if (masterPassword !== confirmMasterPassword) {
      return "Master passwords do not match";
    }
    if (masterPassword === password) {
      return "Master password must be different from your account password";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, masterPassword);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-8 shadow-2xl">
      <h2 className="text-2xl font-semibold mb-6 text-center">Create Account</h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/30 text-[var(--destructive)] text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* Account Password */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--muted-foreground)]">
            Account Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-[var(--input)] border border-[var(--border)] rounded-lg focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
              placeholder="Min 6 characters"
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

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--muted-foreground)]">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[var(--input)] border border-[var(--border)] rounded-lg focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        {/* Divider */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border)]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[var(--card)] text-[var(--muted-foreground)]">
              Master Password (for encryption)
            </span>
          </div>
        </div>

        {/* Warning */}
        <div className="p-3 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/30 text-[var(--warning)] text-sm flex gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Important:</strong> Your master password encrypts all your data. 
            If you lose it, your data cannot be recovered.
          </p>
        </div>

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
              placeholder="Min 10 characters"
              required
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

        {/* Confirm Master Password */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--muted-foreground)]">
            Confirm Master Password
          </label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--primary)]" />
            <input
              type={showMasterPassword ? "text" : "password"}
              value={confirmMasterPassword}
              onChange={(e) => setConfirmMasterPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[var(--input)] border border-[var(--primary)]/50 rounded-lg focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
              placeholder="••••••••••••"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-[var(--border)] text-center">
        <p className="text-[var(--muted-foreground)] text-sm">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-[var(--primary)] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}





