"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Menu, Shield } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isVaultUnlocked, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/auth/login");
      } else if (!isVaultUnlocked) {
        router.push("/auth/login");
      }
    }
  }, [isAuthenticated, isVaultUnlocked, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)] mx-auto mb-4" />
          <p className="text-[var(--muted-foreground)]">Loading vault...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isVaultUnlocked) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--card)] border-b border-[var(--border)] flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-[var(--primary)]" />
          </div>
          <span className="font-bold">
            <span className="text-[var(--primary)]">Sigil</span>
            <span className="text-[var(--muted-foreground)]">.vault</span>
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-[var(--muted)] rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main className="lg:ml-64 pt-20 lg:pt-8 px-4 pb-4 md:px-6 md:pb-6 lg:px-8 lg:pb-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}





