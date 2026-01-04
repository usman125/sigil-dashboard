"use client";

import { useState } from "react";
import { X, Loader2, AtSign, Check, Copy, Shuffle, BookOpen } from "lucide-react";
import { aliasesApi } from "@/lib/api";
import { encryptEntry, sha256 } from "@/lib/crypto";
import { getMasterPassword, getSaltUint8Array } from "@/lib/auth";
import { copyToClipboard } from "@/lib/utils";

interface GenerateAliasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AliasFormat = "random" | "descriptive";

export function GenerateAliasModal({
  isOpen,
  onClose,
  onSuccess,
}: GenerateAliasModalProps) {
  const [format, setFormat] = useState<AliasFormat>("random");
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedAlias, setGeneratedAlias] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setError("");
    setIsLoading(true);

    try {
      const masterPassword = getMasterPassword();
      const salt = getSaltUint8Array();

      if (!masterPassword || !salt) {
        throw new Error("Vault is locked. Please unlock first.");
      }

      // Generate alias on server and get the email
      const response = await aliasesApi.generateAlias(format, [], [], domain || undefined);
      const aliasEmail = response.data.aliasEmail;

      // Create alias entry data
      const aliasData = {
        id: response.data.aliasId,
        email: aliasEmail,
        domain: domain || undefined,
        type: "generated",
        createdAt: new Date().toISOString(),
      };

      // Encrypt the alias data
      const encrypted = await encryptEntry(aliasData, masterPassword, salt);

      // Calculate alias hash for the local part
      const localPart = aliasEmail.split("@")[0];
      const aliasHash = await sha256(localPart);

      // Sync the encrypted alias to the server
      await aliasesApi.syncAliases([
        {
          id: response.data.aliasId,
          ciphertext: encrypted.ciphertext,
          aliasHash,
          iv: encrypted.iv,
          domain: domain || undefined,
        },
      ]);

      setGeneratedAlias(aliasEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate alias");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedAlias) return;
    const success = await copyToClipboard(generatedAlias);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDone = () => {
    setGeneratedAlias(null);
    setDomain("");
    setFormat("random");
    onSuccess();
    onClose();
  };

  const handleClose = () => {
    if (!isLoading) {
      setGeneratedAlias(null);
      setDomain("");
      setFormat("random");
      setError("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--card)] rounded-2xl border border-[var(--border)] w-full max-w-md p-6 shadow-2xl animate-fade-in">
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--muted)] transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {generatedAlias ? (
          // Success state
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[var(--success)]/10 border border-[var(--success)]/30 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-[var(--success)]" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Alias Created!</h2>
              <p className="text-[var(--muted-foreground)]">
                Your new email alias is ready to use
              </p>
            </div>

            <div className="bg-[var(--muted)] rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-lg truncate">{generatedAlias}</p>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-[var(--border)] transition-colors flex-shrink-0"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-[var(--success)]" />
                  ) : (
                    <Copy className="w-5 h-5 text-[var(--muted-foreground)]" />
                  )}
                </button>
              </div>
              {domain && (
                <p className="text-sm text-[var(--muted-foreground)] mt-2">
                  Used for: {domain}
                </p>
              )}
            </div>

            <button
              onClick={handleDone}
              className="w-full py-3 px-4 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </>
        ) : (
          // Generate form
          <>
            <div className="mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center mb-4">
                <AtSign className="w-7 h-7 text-[var(--primary)]" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Generate Alias</h2>
              <p className="text-[var(--muted-foreground)]">
                Create a new @subkontinent.com email alias
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/30 text-[var(--destructive)] text-sm">
                {error}
              </div>
            )}

            {/* Format Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-[var(--muted-foreground)]">
                Alias Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat("random")}
                  className={`p-4 rounded-lg border transition-colors text-left ${
                    format === "random"
                      ? "border-[var(--primary)] bg-[var(--primary)]/10"
                      : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                  }`}
                >
                  <Shuffle className={`w-5 h-5 mb-2 ${format === "random" ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`} />
                  <p className="font-medium text-sm">Random</p>
                  <p className="text-xs text-[var(--muted-foreground)]">e.g. sig8f3a2c1d</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("descriptive")}
                  className={`p-4 rounded-lg border transition-colors text-left ${
                    format === "descriptive"
                      ? "border-[var(--primary)] bg-[var(--primary)]/10"
                      : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                  }`}
                >
                  <BookOpen className={`w-5 h-5 mb-2 ${format === "descriptive" ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`} />
                  <p className="font-medium text-sm">Readable</p>
                  <p className="text-xs text-[var(--muted-foreground)]">e.g. calm_tiger42</p>
                </button>
              </div>
            </div>

            {/* Domain/Purpose */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-[var(--muted-foreground)]">
                Used for (optional)
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--input)] border border-[var(--border)] rounded-lg focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                placeholder="e.g. spotify.com, newsletter, shopping"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <AtSign className="w-5 h-5" />
                  Generate Alias
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}





