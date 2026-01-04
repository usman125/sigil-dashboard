"use client";

import { useEffect, useState } from "react";
import { Mail, ArrowLeft, AtSign, Loader2, RefreshCw, Lock, Shield, PenSquare, Reply, Send } from "lucide-react";
import { aliasesApi, emailsApi, Email, EncryptedEmailField } from "@/lib/api";
import { decryptEntry, decryptEmail, EncryptedEmailField as CryptoEncryptedField } from "@/lib/crypto";
import { getMasterPassword, getSaltUint8Array, getPrivateKeyForDecryption } from "@/lib/auth";
import { formatDate, cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import ComposeModal from "@/components/email/ComposeModal";

interface DecryptedAlias {
  _id: string;
  aliasId: string;
  email: string;
  domain?: string;
}

interface DecryptedEmailContent {
  subject: string;
  bodyPlain: string;
  bodyHtml: string;
}

export default function InboxPage() {
  const [aliases, setAliases] = useState<DecryptedAlias[]>([]);
  const [selectedAlias, setSelectedAlias] = useState<DecryptedAlias | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<DecryptedEmailContent | null>(null);
  const [isLoadingAliases, setIsLoadingAliases] = useState(true);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyData, setReplyData] = useState<{ emailId: string; to: string; subject: string } | undefined>(undefined);

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
          });
        } catch {
          console.warn("Failed to decrypt alias", alias._id);
        }
      }

      setAliases(decryptedAliases);

      // Auto-select first alias
      if (decryptedAliases.length > 0 && !selectedAlias) {
        handleSelectAlias(decryptedAliases[0]);
      }
    } catch (error) {
      console.error("Failed to load aliases:", error);
    } finally {
      setIsLoadingAliases(false);
    }
  };

  const handleSelectAlias = async (alias: DecryptedAlias) => {
    setSelectedAlias(alias);
    setSelectedEmail(null);
    setDecryptedContent(null);
    setIsLoadingEmails(true);

    try {
      const response = await emailsApi.getAliasEmails(alias._id);
      setEmails(response.data || []);
    } catch (error) {
      console.error("Failed to load emails:", error);
      setEmails([]);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);
    setDecryptedContent(null);
    setDecryptError(null);
    setIsDecrypting(true);

    console.log("📧 Selected email:", {
      id: email._id,
      isEncrypted: email.isEncrypted,
      subjectType: typeof email.subject,
      hasValidEncryption: hasValidEncryptedData(email.subject),
    });

    try {
      // Check if email is truly encrypted (has actual encrypted data, not empty placeholders)
      const isEncryptedEmail = 
        email.isEncrypted === true && hasValidEncryptedData(email.subject);

      if (isEncryptedEmail) {
        console.log("🔐 Email is encrypted, attempting decryption...");
        
        // Get private key for decryption
        const privateKey = await getPrivateKeyForDecryption();
        if (!privateKey) {
          console.error("❌ No private key available");
          throw new Error("Private key not available. Please re-login and unlock your vault.");
        }
        console.log("🔑 Got private key for decryption");

        // Decrypt email content
        const subjectField = email.subject as CryptoEncryptedField;
        const bodyPlainField = email.bodyPlain as CryptoEncryptedField;
        const bodyHtmlField = email.bodyHtml as CryptoEncryptedField | null;

        console.log("📦 Decrypting fields:", {
          subjectHasData: !!subjectField?.ciphertext,
          bodyPlainHasData: !!bodyPlainField?.ciphertext,
          bodyHtmlHasData: !!bodyHtmlField?.ciphertext,
        });

        const decrypted = await decryptEmail(
          {
            subject: subjectField,
            bodyPlain: bodyPlainField,
            bodyHtml: bodyHtmlField,
          },
          privateKey
        );

        console.log("✅ Decryption successful");
        setDecryptedContent(decrypted);
      } else {
        console.log("📄 Email is not encrypted or has empty placeholders (legacy)");
        // Legacy unencrypted email or email with empty placeholder encryption
        // Extract content as string if available, otherwise show placeholder
        const getStringContent = (field: unknown, fallback: string): string => {
          if (typeof field === "string") return field;
          return fallback;
        };

        setDecryptedContent({
          subject: getStringContent(email.subject, "(No subject)"),
          bodyPlain: getStringContent(email.bodyPlain, "(No content available - this email was stored without encryption data)"),
          bodyHtml: getStringContent(email.bodyHtml, ""),
        });
      }
    } catch (error) {
      console.error("❌ Failed to decrypt email:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to decrypt email";
      setDecryptError(errorMessage);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedAlias) return;
    setIsRefreshing(true);
    await handleSelectAlias(selectedAlias);
    setIsRefreshing(false);
  };

  const handleCompose = () => {
    setReplyData(undefined);
    setIsComposeOpen(true);
  };

  const handleReply = () => {
    if (!selectedEmail || !decryptedContent) return;
    setReplyData({
      emailId: selectedEmail._id,
      to: selectedEmail.from,
      subject: decryptedContent.subject,
    });
    setIsComposeOpen(true);
  };

  const handleEmailSent = () => {
    // Optionally refresh the email list after sending
    if (selectedAlias) {
      handleSelectAlias(selectedAlias);
    }
  };

  const sanitizeHtml = (html: string): string => {
    if (typeof window !== "undefined") {
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          "p", "br", "div", "span", "a", "strong", "b", "em", "i", "u",
          "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "table",
          "thead", "tbody", "tr", "td", "th", "img", "blockquote", "pre", "code"
        ],
        ALLOWED_ATTR: ["href", "src", "alt", "style", "class", "target"],
      });
    }
    return html;
  };

  // Helper to check if encrypted field has actual data
  const hasValidEncryptedData = (field: unknown): boolean => {
    if (typeof field !== "object" || field === null) return false;
    const f = field as { ciphertext?: string; iv?: string; encryptedKey?: string };
    return !!(f.ciphertext && f.iv && f.encryptedKey && f.ciphertext.length > 0);
  };

  // Helper to get display subject for email list
  const getEmailDisplaySubject = (email: Email): string => {
    if (email.isEncrypted && hasValidEncryptedData(email.subject)) {
      return "🔐 Encrypted email";
    }
    // For legacy emails or unencrypted, try to get subject as string
    if (typeof email.subject === "string") {
      return email.subject;
    }
    // Fallback for legacy encrypted structure with empty data
    return "(No subject)";
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Inbox</h1>
          <p className="text-sm md:text-base text-[var(--muted-foreground)]">
            View emails received by your aliases
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {selectedAlias && (
            <>
              <button
                onClick={handleCompose}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors text-sm md:text-base"
              >
                <PenSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Compose</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[var(--muted)] hover:bg-[var(--border)] rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile: Stacked layout, Desktop: Grid layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 md:gap-6">
        {/* Aliases Sidebar - Collapsible on mobile when email is selected */}
        <div className={cn(
          "lg:col-span-3",
          selectedEmail && "hidden lg:block"
        )}>
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="p-3 md:p-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-sm md:text-base">Aliases</h2>
            </div>

            {isLoadingAliases ? (
              <div className="p-6 md:p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)] mx-auto" />
              </div>
            ) : aliases.length === 0 ? (
              <div className="p-6 md:p-8 text-center text-[var(--muted-foreground)]">
                <AtSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No aliases yet</p>
              </div>
            ) : (
              <div className="max-h-[300px] lg:max-h-[600px] overflow-y-auto">
                {aliases.map((alias) => (
                  <button
                    key={alias._id}
                    onClick={() => handleSelectAlias(alias)}
                    className={cn(
                      "w-full p-3 md:p-4 text-left border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors",
                      selectedAlias?._id === alias._id && "bg-[var(--primary)]/10 border-l-2 border-l-[var(--primary)]"
                    )}
                  >
                    <p className="font-mono text-xs md:text-sm truncate">{alias.email}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      {alias.domain || "General"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Email List - Hidden on mobile when viewing email */}
        <div className={cn(
          "lg:col-span-4",
          selectedEmail && "hidden lg:block"
        )}>
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border)]">
              <h2 className="font-semibold">
                {selectedAlias ? (
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {emails.length} {emails.length === 1 ? "message" : "messages"}
                  </span>
                ) : (
                  "Select an alias"
                )}
              </h2>
            </div>

            {!selectedAlias ? (
              <div className="p-8 text-center text-[var(--muted-foreground)]">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select an alias to view emails</p>
              </div>
            ) : isLoadingEmails ? (
              <div className="p-6 md:p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)] mx-auto" />
              </div>
            ) : emails.length === 0 ? (
              <div className="p-6 md:p-8 text-center text-[var(--muted-foreground)]">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No emails for this alias</p>
              </div>
            ) : (
              <div className="max-h-[400px] lg:max-h-[600px] overflow-y-auto">
                {emails.map((email) => (
                  <button
                    key={email._id}
                    onClick={() => handleSelectEmail(email)}
                    className={cn(
                      "w-full p-3 md:p-4 text-left border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors",
                      selectedEmail?._id === email._id && "bg-[var(--accent)]/10 border-l-2 border-l-[var(--accent)]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {email.isEncrypted && (
                        <Lock className="w-3 h-3 text-[var(--primary)] flex-shrink-0" />
                      )}
                      <p className="font-medium text-sm truncate">
                        {getEmailDisplaySubject(email)}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] truncate mt-1">
                      {email.from}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      {formatDate(email.receivedAt)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Email View - Full width on mobile when email is selected */}
        <div className={cn(
          "lg:col-span-5",
          !selectedEmail && "hidden lg:block"
        )}>
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
            {!selectedEmail ? (
              <div className="p-6 md:p-8 text-center text-[var(--muted-foreground)] min-h-[300px] md:min-h-[400px] flex flex-col items-center justify-center">
                <Mail className="w-10 md:w-12 h-10 md:h-12 mx-auto mb-3 opacity-50" />
                <p>Select an email to view</p>
              </div>
            ) : isDecrypting ? (
              <div className="p-6 md:p-8 text-center min-h-[300px] md:min-h-[400px] flex flex-col items-center justify-center">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 md:w-8 md:h-8 text-[var(--primary)] animate-pulse" />
                </div>
                <p className="text-[var(--muted-foreground)]">Decrypting email...</p>
              </div>
            ) : decryptError ? (
              <div className="p-6 md:p-8 text-center min-h-[300px] md:min-h-[400px] flex flex-col items-center justify-center">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-[var(--destructive)]/10 border border-[var(--destructive)]/30 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 md:w-8 md:h-8 text-[var(--destructive)]" />
                </div>
                <p className="text-[var(--destructive)] mb-2">Decryption Failed</p>
                <p className="text-sm text-[var(--muted-foreground)]">{decryptError}</p>
                <button
                  onClick={() => handleSelectEmail(selectedEmail)}
                  className="mt-4 px-4 py-2 bg-[var(--muted)] hover:bg-[var(--border)] rounded-lg transition-colors text-sm"
                >
                  Retry
                </button>
              </div>
            ) : decryptedContent ? (
              <>
                {/* Email Header */}
                <div className="p-4 md:p-6 border-b border-[var(--border)]">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => {
                        setSelectedEmail(null);
                        setDecryptedContent(null);
                      }}
                      className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to list
                    </button>
                    {selectedEmail.type !== "sent" && (
                      <button
                        onClick={handleReply}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--muted)] hover:bg-[var(--border)] rounded-lg transition-colors text-sm"
                      >
                        <Reply className="w-4 h-4" />
                        Reply
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {selectedEmail.isEncrypted && (
                      <div className="flex items-center gap-1 text-xs text-[var(--success)] bg-[var(--success)]/10 px-2 py-1 rounded-full">
                        <Shield className="w-3 h-3" />
                        Encrypted
                      </div>
                    )}
                    {selectedEmail.type === "sent" && (
                      <div className="flex items-center gap-1 text-xs text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-1 rounded-full">
                        <Send className="w-3 h-3" />
                        Sent
                      </div>
                    )}
                  </div>
                  <h2 className="text-lg md:text-xl font-semibold mb-3 break-words">{decryptedContent.subject}</h2>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{selectedEmail.from}</p>
                      <p className="text-xs text-[var(--muted-foreground)] truncate">
                        To: {selectedEmail.to}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] flex-shrink-0">
                      {formatDate(selectedEmail.receivedAt)}
                    </p>
                  </div>
                </div>

                {/* Email Body */}
                <div className="p-4 md:p-6 max-h-[400px] md:max-h-[500px] overflow-y-auto overflow-x-hidden">
                  {decryptedContent.bodyHtml ? (
                    <div
                      className="prose prose-invert prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(decryptedContent.bodyHtml),
                      }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {decryptedContent.bodyPlain}
                    </pre>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {selectedAlias && (
        <ComposeModal
          isOpen={isComposeOpen}
          onClose={() => {
            setIsComposeOpen(false);
            setReplyData(undefined);
          }}
          aliasId={selectedAlias._id}
          aliasEmail={selectedAlias.email}
          replyTo={replyData}
          onSent={handleEmailSent}
        />
      )}
    </div>
  );
}
