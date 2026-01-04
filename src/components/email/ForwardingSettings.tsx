"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Mail, Bell, BellOff, Forward } from "lucide-react";
import { aliasesApi } from "@/lib/api";

interface ForwardingSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  aliasId: string;
  aliasEmail: string;
  currentForwardTo?: string;
  currentForwardMode?: "disabled" | "plaintext" | "notify";
  onUpdated?: () => void;
}

export default function ForwardingSettings({
  isOpen,
  onClose,
  aliasId,
  aliasEmail,
  currentForwardTo,
  currentForwardMode = "disabled",
  onUpdated,
}: ForwardingSettingsProps) {
  const [forwardTo, setForwardTo] = useState(currentForwardTo || "");
  const [forwardMode, setForwardMode] = useState<"disabled" | "plaintext" | "notify">(currentForwardMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForwardTo(currentForwardTo || "");
      setForwardMode(currentForwardMode);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, currentForwardTo, currentForwardMode]);

  if (!isOpen) return null;

  const handleSave = async () => {
    // Validate email if forwarding is enabled
    if (forwardMode !== "disabled") {
      if (!forwardTo) {
        setError("Please enter a forwarding email address");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(forwardTo)) {
        setError("Please enter a valid email address");
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await aliasesApi.updateForwarding(
        aliasId,
        forwardMode === "disabled" ? null : forwardTo,
        forwardMode
      );
      setSuccess(true);
      onUpdated?.();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update forwarding settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--card)] rounded-2xl border border-[var(--border)] w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Forward className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold">Forwarding Settings</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="p-2 hover:bg-[var(--muted)] rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Alias Info */}
          <div className="p-3 bg-[var(--muted)] rounded-lg">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Alias</p>
            <p className="font-mono text-sm">{aliasEmail}</p>
          </div>

          {/* Forwarding Mode */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Forwarding Mode
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--muted)] transition-colors">
                <input
                  type="radio"
                  name="forwardMode"
                  value="disabled"
                  checked={forwardMode === "disabled"}
                  onChange={() => setForwardMode("disabled")}
                  className="w-4 h-4 text-[var(--primary)]"
                />
                <BellOff className="w-5 h-5 text-[var(--muted-foreground)]" />
                <div>
                  <p className="font-medium text-sm">Disabled</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    No forwarding, view emails in dashboard only
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--muted)] transition-colors">
                <input
                  type="radio"
                  name="forwardMode"
                  value="notify"
                  checked={forwardMode === "notify"}
                  onChange={() => setForwardMode("notify")}
                  className="w-4 h-4 text-[var(--primary)]"
                />
                <Bell className="w-5 h-5 text-[var(--primary)]" />
                <div>
                  <p className="font-medium text-sm">Notify Only</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Send notification with link to view securely
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--muted)] transition-colors">
                <input
                  type="radio"
                  name="forwardMode"
                  value="plaintext"
                  checked={forwardMode === "plaintext"}
                  onChange={() => setForwardMode("plaintext")}
                  className="w-4 h-4 text-[var(--primary)]"
                />
                <Mail className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="font-medium text-sm">Forward Full Email</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Forward complete email content (less private)
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Forward To Email */}
          {forwardMode !== "disabled" && (
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
                Forward To
              </label>
              <input
                type="email"
                value={forwardTo}
                onChange={(e) => setForwardTo(e.target.value)}
                placeholder="your-real-email@gmail.com"
                disabled={isSaving}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
              />
              {forwardMode === "plaintext" && (
                <p className="text-xs text-amber-500 mt-1">
                  ⚠️ Email content will be visible to your email provider
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-[var(--destructive)]/10 border border-[var(--destructive)]/30 rounded-lg text-[var(--destructive)] text-sm">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="p-3 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-lg text-[var(--success)] text-sm">
              Forwarding settings updated successfully!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--border)]">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}




