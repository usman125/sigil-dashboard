"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, AtSign, Lock, Zap, ArrowRight, Check } from "lucide-react";
import { getAuthToken } from "@/lib/api";
import { isVaultUnlocked } from "@/lib/auth";

const features = [
  {
    icon: AtSign,
    title: "Random Aliases",
    description: "Generate unique @subkontinent.com email addresses instantly",
  },
  {
    icon: Lock,
    title: "Zero-Knowledge",
    description: "Your data is encrypted client-side. We never see your passwords.",
  },
  {
    icon: Shield,
    title: "AES-256 Encryption",
    description: "Military-grade encryption protects all your alias data",
  },
  {
    icon: Zap,
    title: "Instant Inbox",
    description: "Receive emails in real-time with Mailgun webhook integration",
  },
];

const benefits = [
  "Protect your real email from spam",
  "Sign up for services anonymously",
  "Track which services leak your email",
  "Disable aliases instantly when needed",
];

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    const token = getAuthToken();
    if (token && isVaultUnlocked()) {
      router.push("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Navigation */}
      <nav className="border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <span className="font-bold text-xl">
              <span className="text-[var(--primary)]">Sigil</span>
              <span className="text-[var(--muted-foreground)]">.vault</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] text-sm font-medium mb-6">
            <Lock className="w-4 h-4" />
            Zero-Knowledge Encryption
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Email Aliases,{" "}
            <span className="text-[var(--primary)]">Encrypted</span>
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-10">
            Generate random email aliases for any service. Keep your real email private
            with military-grade encryption that never leaves your device.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 transition-opacity text-lg"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--foreground)] font-semibold rounded-lg hover:bg-[var(--muted)] transition-colors text-lg"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Demo Card */}
        <div className="mt-16 animate-fade-in stagger-2 opacity-0">
          <div className="inline-block bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 shadow-2xl max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center">
                <AtSign className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div className="text-left">
                <p className="font-mono text-sm">sig8f3a2c1d@subkontinent.com</p>
                <p className="text-xs text-[var(--muted-foreground)]">for spotify.com</p>
              </div>
            </div>
            <div className="bg-[var(--muted)]/50 rounded-lg p-3 text-sm text-left">
              <p className="text-[var(--success)] font-medium">+ 3 emails received</p>
              <p className="text-[var(--muted-foreground)]">Last: 2 hours ago</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 animate-fade-in opacity-0"
              style={{ animationDelay: `${(index + 1) * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-[var(--primary)]" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-[var(--muted-foreground)] text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Why use email aliases?
              </h2>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 animate-fade-in opacity-0"
                    style={{ animationDelay: `${(index + 1) * 150}ms` }}
                  >
                    <div className="w-6 h-6 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[var(--muted)]/50 rounded-xl p-8 border border-[var(--border)]">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[var(--destructive)]"></div>
                  <span className="line-through text-[var(--muted-foreground)]">
                    your.real@email.com
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[var(--success)]"></div>
                  <span className="font-mono">sig8f3a2c1d@subkontinent.com</span>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] pt-4 border-t border-[var(--border)]">
                  Use unique aliases for each service. If one gets leaked, 
                  disable it without affecting others.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent)]/10 rounded-2xl border border-[var(--primary)]/30 p-12">
          <h2 className="text-3xl font-bold mb-4">
            Ready to protect your inbox?
          </h2>
          <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
            Create your free account in seconds. No credit card required.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 transition-opacity text-lg animate-pulse-glow"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-[var(--muted-foreground)] text-sm">
          <p>© 2026 Sigil Vault. Your privacy, protected.</p>
        </div>
      </footer>
    </div>
  );
}
