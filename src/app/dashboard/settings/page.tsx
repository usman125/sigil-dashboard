"use client";

import { useState } from "react";
import { User, Shield, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    logout();
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-[var(--muted-foreground)]">
          Manage your account settings
        </p>
      </div>

      {/* Account Section */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] mb-6 overflow-hidden">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold">Account</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
              Email
            </label>
            <p className="text-lg">{user?.email || "Loading..."}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
              User ID
            </label>
            <p className="font-mono text-sm text-[var(--muted-foreground)]">
              {user?.userId || "Loading..."}
            </p>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] mb-6 overflow-hidden">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold">Security</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
              Master Password
            </label>
            <p className="text-sm text-[var(--muted-foreground)]">
              Your vault is protected with zero-knowledge encryption. Your master password
              never leaves your device.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[var(--success)]" />
              <div>
                <p className="font-medium text-[var(--success)]">Vault Unlocked</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Your data is encrypted with AES-256-GCM
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--destructive)]/30 overflow-hidden">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-[var(--destructive)]" />
            <h2 className="text-lg font-semibold">Session</h2>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Sign out will lock your vault and clear your master password from this session.
          </p>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--destructive)]/10 text-[var(--destructive)] border border-[var(--destructive)]/30 rounded-lg hover:bg-[var(--destructive)]/20 transition-colors disabled:opacity-50"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing out...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Sign Out
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


