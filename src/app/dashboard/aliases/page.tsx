"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AtSign,
  Plus,
  Copy,
  Check,
  Trash2,
  Loader2,
  Search,
  RefreshCw,
  Forward,
  Bell,
  Mail,
} from "lucide-react";
import { aliasesApi, Alias } from "@/lib/api";
import { decryptEntry } from "@/lib/crypto";
import { getMasterPassword, getSaltUint8Array } from "@/lib/auth";
import { formatDate, copyToClipboard, cn } from "@/lib/utils";
import { GenerateAliasModal } from "@/components/GenerateAliasModal";
import ForwardingSettings from "@/components/email/ForwardingSettings";

interface DecryptedAlias {
  _id: string;
  aliasId: string;
  email: string;
  domain?: string;
  forwardTo?: string;
  forwardMode?: "disabled" | "plaintext" | "notify";
  createdAt: string;
}

export default function AliasesPage() {
  const searchParams = useSearchParams();
  const [aliases, setAliases] = useState<DecryptedAlias[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [forwardingAlias, setForwardingAlias] = useState<DecryptedAlias | null>(null);

  // Open modal if generate=true in URL params
  useEffect(() => {
    if (searchParams.get("generate") === "true") {
      setShowGenerateModal(true);
      // Remove the query param from URL
      window.history.replaceState({}, "", "/dashboard/aliases");
    }
  }, [searchParams]);

  useEffect(() => {
    loadAliases();
  }, []);

  const loadAliases = async () => {
    try {
      const masterPassword = getMasterPassword();
      const salt = getSaltUint8Array();

      if (!masterPassword || !salt) {
        return;
      }

      const response = await aliasesApi.getUserAliases();
      const aliasesData = response.aliases || [];

      const decryptedAliases: DecryptedAlias[] = [];
      for (const alias of aliasesData) {
        try {
          const decrypted = await decryptEntry<{ email: string; domain?: string }>(
            { ciphertext: alias.ciphertext, iv: alias.iv },
            masterPassword,
            salt
          );
          decryptedAliases.push({
            _id: alias._id,
            aliasId: alias.aliasId,
            email: decrypted.email,
            domain: decrypted.domain || alias.domain,
            forwardTo: alias.forwardTo,
            forwardMode: alias.forwardMode,
            createdAt: alias.createdAt,
          });
        } catch {
          console.warn("Failed to decrypt alias", alias._id);
        }
      }

      setAliases(decryptedAliases);
    } catch (error) {
      console.error("Failed to load aliases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAliases();
    setIsRefreshing(false);
  };

  const handleCopy = async (email: string, id: string) => {
    const success = await copyToClipboard(email);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this alias? This cannot be undone.")) {
      return;
    }

    setDeletingId(id);
    try {
      await aliasesApi.deleteAlias(id);
      setAliases((prev) => prev.filter((a) => a._id !== id));
    } catch (error) {
      console.error("Failed to delete alias:", error);
      alert("Failed to delete alias");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAliases = aliases.filter(
    (alias) =>
      alias.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alias.domain?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Aliases</h1>
          <p className="text-sm md:text-base text-[var(--muted-foreground)]">
            Manage your email aliases
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm md:text-base"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Generate Alias</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 md:mb-6">
        <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search aliases..."
          className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors text-sm md:text-base"
        />
      </div>

      {/* Aliases List */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 md:p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)] mx-auto mb-3" />
            <p className="text-[var(--muted-foreground)]">Loading aliases...</p>
          </div>
        ) : aliases.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <AtSign className="w-10 md:w-12 h-10 md:h-12 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
            <h3 className="text-lg md:text-xl font-semibold mb-2">No aliases yet</h3>
            <p className="text-sm md:text-base text-[var(--muted-foreground)] mb-6">
              Generate your first email alias to get started
            </p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              Generate Alias
            </button>
          </div>
        ) : filteredAliases.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <Search className="w-10 md:w-12 h-10 md:h-12 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
            <h3 className="text-lg md:text-xl font-semibold mb-2">No matches found</h3>
            <p className="text-[var(--muted-foreground)]">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {/* Table Header - Hidden on mobile */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-[var(--muted)]/50 text-sm font-medium text-[var(--muted-foreground)]">
              <div className="col-span-5">Email</div>
              <div className="col-span-3">Used for</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Table Rows - Card layout on mobile, grid on desktop */}
            {filteredAliases.map((alias, index) => (
              <div
                key={alias._id}
                className="p-3 md:p-4 hover:bg-[var(--muted)]/30 transition-colors animate-fade-in md:grid md:grid-cols-12 md:gap-4 md:items-center"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Mobile layout */}
                <div className="md:hidden">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center flex-shrink-0">
                        <AtSign className="w-4 h-4 text-[var(--primary)]" />
                      </div>
                      <span className="font-mono text-xs truncate">{alias.email}</span>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {alias.forwardMode && alias.forwardMode !== "disabled" && (
                        <span className={cn("p-1.5", alias.forwardMode === "notify" ? "text-[var(--primary)]" : "text-amber-500")}>
                          {alias.forwardMode === "notify" ? <Bell className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                        </span>
                      )}
                      <button onClick={() => setForwardingAlias(alias)} className="p-1.5 rounded-lg hover:bg-[var(--muted)]">
                        <Forward className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                      </button>
                      <button onClick={() => handleCopy(alias.email, alias._id)} className="p-1.5 rounded-lg hover:bg-[var(--muted)]">
                        {copiedId === alias._id ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />}
                      </button>
                      <button onClick={() => handleDelete(alias._id)} disabled={deletingId === alias._id} className="p-1.5 rounded-lg hover:bg-[var(--destructive)]/10 text-[var(--muted-foreground)] hover:text-[var(--destructive)] disabled:opacity-50">
                        {deletingId === alias._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)] pl-10">
                    <span>{alias.domain || "General"}</span>
                    <span>{formatDate(alias.createdAt).split(",")[0]}</span>
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden md:contents">
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center flex-shrink-0">
                      <AtSign className="w-5 h-5 text-[var(--primary)]" />
                    </div>
                    <span className="font-mono text-sm truncate">{alias.email}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {alias.domain || "—"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {formatDate(alias.createdAt).split(",")[0]}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    {alias.forwardMode && alias.forwardMode !== "disabled" && (
                      <span
                        className={cn(
                          "p-1.5 rounded-lg",
                          alias.forwardMode === "notify"
                            ? "text-[var(--primary)]"
                            : "text-amber-500"
                        )}
                        title={
                          alias.forwardMode === "notify"
                            ? "Notifications enabled"
                            : "Forwarding enabled"
                        }
                      >
                        {alias.forwardMode === "notify" ? (
                          <Bell className="w-4 h-4" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                      </span>
                    )}
                    <button
                      onClick={() => setForwardingAlias(alias)}
                      className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
                      title="Forwarding settings"
                    >
                      <Forward className="w-4 h-4 text-[var(--muted-foreground)]" />
                    </button>
                    <button
                      onClick={() => handleCopy(alias.email, alias._id)}
                      className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
                      title="Copy email"
                    >
                      {copiedId === alias._id ? (
                        <Check className="w-4 h-4 text-[var(--success)]" />
                      ) : (
                        <Copy className="w-4 h-4 text-[var(--muted-foreground)]" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(alias._id)}
                      disabled={deletingId === alias._id}
                      className="p-2 rounded-lg hover:bg-[var(--destructive)]/10 text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors disabled:opacity-50"
                      title="Delete alias"
                    >
                      {deletingId === alias._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats footer */}
      {aliases.length > 0 && (
        <div className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
          {filteredAliases.length} of {aliases.length} aliases
        </div>
      )}

      {/* Generate Modal */}
      <GenerateAliasModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSuccess={loadAliases}
      />

      {/* Forwarding Settings Modal */}
      {forwardingAlias && (
        <ForwardingSettings
          isOpen={!!forwardingAlias}
          onClose={() => setForwardingAlias(null)}
          aliasId={forwardingAlias._id}
          aliasEmail={forwardingAlias.email}
          currentForwardTo={forwardingAlias.forwardTo}
          currentForwardMode={forwardingAlias.forwardMode}
          onUpdated={loadAliases}
        />
      )}
    </div>
  );
}


