"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isVaultUnlocked, isLoading } = useAuth();

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
      <Sidebar />
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  );
}


