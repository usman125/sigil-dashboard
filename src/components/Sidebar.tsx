"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Inbox,
  AtSign,
  Calendar,
  Settings,
  LogOut,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Shield },
  { name: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Aliases", href: "/dashboard/aliases", icon: AtSign },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-64 bg-[var(--card)] border-r border-[var(--border)] flex flex-col z-50 transition-transform duration-300 ease-in-out",
          // Mobile: slide in/out
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={handleNavClick}>
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <h1 className="font-bold text-lg">
                <span className="text-[var(--primary)]">Sigil</span>
                <span className="text-[var(--muted-foreground)]">.vault</span>
              </h1>
            </div>
          </Link>
          {/* Mobile close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-[var(--muted)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Generate Button */}
        <div className="p-4">
          <Link
            href="/dashboard/aliases?generate=true"
            onClick={handleNavClick}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Generate Alias
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] font-semibold text-sm">
              {user?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.email || "Loading..."}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">Vault unlocked</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              handleNavClick();
            }}
            className="flex items-center gap-3 w-full px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

