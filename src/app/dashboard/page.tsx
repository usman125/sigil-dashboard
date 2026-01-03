"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AtSign, Mail, Plus, ArrowRight, Shield, Copy, Check } from "lucide-react";
import { aliasesApi, emailsApi, Alias } from "@/lib/api";
import { decryptEntry } from "@/lib/crypto";
import { getMasterPassword, getSaltUint8Array } from "@/lib/auth";
import { formatDate, copyToClipboard } from "@/lib/utils";

interface DecryptedAlias {
  _id: string;
  aliasId: string;
  email: string;
  domain?: string;
  createdAt: string;
}

interface Stats {
  totalAliases: number;
  totalEmails: number;
  recentAliases: DecryptedAlias[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalAliases: 0,
    totalEmails: 0,
    recentAliases: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const masterPassword = getMasterPassword();
      const salt = getSaltUint8Array();

      if (!masterPassword || !salt) {
        return;
      }

      // Load aliases
      const aliasesResponse = await aliasesApi.getUserAliases();
      const aliases = aliasesResponse.aliases || [];

      // Decrypt aliases
      const decryptedAliases: DecryptedAlias[] = [];
      for (const alias of aliases) {
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
            createdAt: alias.createdAt,
          });
        } catch {
          console.warn("Failed to decrypt alias", alias._id);
        }
      }

      // Count total emails
      let totalEmails = 0;
      for (const alias of aliases) {
        try {
          const emailsResponse = await emailsApi.getAliasEmails(alias._id);
          totalEmails += emailsResponse.data?.length || 0;
        } catch {
          // Ignore errors for email count
        }
      }

      setStats({
        totalAliases: decryptedAliases.length,
        totalEmails,
        recentAliases: decryptedAliases.slice(0, 5),
      });
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (email: string, id: string) => {
    const success = await copyToClipboard(email);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-[var(--muted-foreground)]">
          Manage your email aliases and view incoming messages
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Aliases */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center">
              <AtSign className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.totalAliases}</p>
              <p className="text-[var(--muted-foreground)] text-sm">Active Aliases</p>
            </div>
          </div>
        </div>

        {/* Total Emails */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 animate-fade-in stagger-1 opacity-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center">
              <Mail className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.totalEmails}</p>
              <p className="text-[var(--muted-foreground)] text-sm">Emails Received</p>
            </div>
          </div>
        </div>

        {/* Vault Status */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 animate-fade-in stagger-2 opacity-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30 flex items-center justify-center animate-pulse-glow">
              <Shield className="w-6 h-6 text-[var(--success)]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--success)]">Encrypted</p>
              <p className="text-[var(--muted-foreground)] text-sm">Vault Status</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link
          href="/dashboard/aliases?generate=true"
          className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 hover:border-[var(--primary)]/50 transition-colors group animate-fade-in stagger-3 opacity-0"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center group-hover:bg-[var(--primary)]/20 transition-colors">
                <Plus className="w-6 h-6 text-[var(--primary)]" />
              </div>
              <div>
                <p className="font-semibold text-lg">Generate New Alias</p>
                <p className="text-[var(--muted-foreground)] text-sm">
                  Create a random @subkontinent.com email
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" />
          </div>
        </Link>

        <Link
          href="/dashboard/inbox"
          className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 hover:border-[var(--accent)]/50 transition-colors group animate-fade-in stagger-4 opacity-0"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center group-hover:bg-[var(--accent)]/20 transition-colors">
                <Mail className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <div>
                <p className="font-semibold text-lg">Check Inbox</p>
                <p className="text-[var(--muted-foreground)] text-sm">
                  View emails received by your aliases
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--accent)] transition-colors" />
          </div>
        </Link>
      </div>

      {/* Recent Aliases */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 animate-fade-in stagger-5 opacity-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Aliases</h2>
          <Link
            href="/dashboard/aliases"
            className="text-[var(--primary)] hover:underline text-sm font-medium"
          >
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-[var(--muted-foreground)]">
            Loading aliases...
          </div>
        ) : stats.recentAliases.length === 0 ? (
          <div className="text-center py-8">
            <AtSign className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-3" />
            <p className="text-[var(--muted-foreground)]">No aliases yet</p>
            <Link
              href="/dashboard/aliases?generate=true"
              className="text-[var(--primary)] hover:underline text-sm font-medium mt-2 inline-block"
            >
              Generate your first alias
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.recentAliases.map((alias) => (
              <div
                key={alias._id}
                className="flex items-center justify-between p-4 rounded-lg bg-[var(--muted)]/50 hover:bg-[var(--muted)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center">
                    <AtSign className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="font-mono text-sm">{alias.email}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {alias.domain || "General"} • {formatDate(alias.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(alias.email, alias._id)}
                  className="p-2 rounded-lg hover:bg-[var(--border)] transition-colors"
                  title="Copy email"
                >
                  {copiedId === alias._id ? (
                    <Check className="w-5 h-5 text-[var(--success)]" />
                  ) : (
                    <Copy className="w-5 h-5 text-[var(--muted-foreground)]" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


