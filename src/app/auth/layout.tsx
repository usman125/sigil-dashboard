import { Shield } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 mb-4">
            <Shield className="w-8 h-8 text-[var(--primary)]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-[var(--primary)]">Sigil</span>
            <span className="text-[var(--muted-foreground)]">.vault</span>
          </h1>
          <p className="text-[var(--muted-foreground)] mt-2">
            Zero-knowledge email alias manager
          </p>
        </div>

        {/* Auth Card */}
        <div className="animate-fade-in stagger-1 opacity-0">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-[var(--muted-foreground)] mt-8 animate-fade-in stagger-2 opacity-0">
          Your data is encrypted locally. We never see your passwords.
        </p>
      </div>
    </div>
  );
}





