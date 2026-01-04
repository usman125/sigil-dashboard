"use client";

import { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { emailsApi } from "@/lib/api";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  aliasId: string;
  aliasEmail: string;
  replyTo?: {
    emailId: string;
    to: string;
    subject: string;
  };
  onSent?: () => void;
}

export default function ComposeModal({
  isOpen,
  onClose,
  aliasId,
  aliasEmail,
  replyTo,
  onSent,
}: ComposeModalProps) {
  const [to, setTo] = useState(replyTo?.to || "");
  const [subject, setSubject] = useState(
    replyTo?.subject ? `Re: ${replyTo.subject}` : ""
  );
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!to || !subject || !body) {
      setError("Please fill in all fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await emailsApi.sendEmail({
        aliasId,
        aliasEmail,
        to,
        subject,
        bodyPlain: body,
        replyToEmailId: replyTo?.emailId,
      });

      // Reset form and close
      setTo("");
      setSubject("");
      setBody("");
      onSent?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      setTo(replyTo?.to || "");
      setSubject(replyTo?.subject ? `Re: ${replyTo.subject}` : "");
      setBody("");
      setError(null);
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
      <div className="relative bg-[var(--card)] rounded-2xl border border-[var(--border)] w-full max-w-2xl mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">
            {replyTo ? "Reply" : "Compose Email"}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSending}
            className="p-2 hover:bg-[var(--muted)] rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* From (read-only) */}
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
              From
            </label>
            <div className="px-3 py-2 bg-[var(--muted)] rounded-lg text-sm font-mono">
              {aliasEmail}
            </div>
          </div>

          {/* To */}
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
              To
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              disabled={isSending}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              disabled={isSending}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here..."
              rows={10}
              disabled={isSending}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none disabled:opacity-50"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-[var(--destructive)]/10 border border-[var(--destructive)]/30 rounded-lg text-[var(--destructive)] text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--border)]">
          <button
            onClick={handleClose}
            disabled={isSending}
            className="px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !to || !subject || !body}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}




