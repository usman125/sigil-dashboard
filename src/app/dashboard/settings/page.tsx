"use client";

import { useState, useEffect } from "react";
import { User, Shield, LogOut, Loader2, Crown, CreditCard, Sparkles, Check, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { stripeApi, SubscriptionResponse } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionResponse["data"] | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isManaging, setIsManaging] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const response = await stripeApi.getSubscription();
      setSubscription(response.data);
    } catch (error) {
      console.error("Failed to load subscription:", error);
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const response = await stripeApi.createCheckout();
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error("Failed to create checkout:", error);
      alert("Failed to start upgrade process. Please try again.");
      setIsUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsManaging(true);
    try {
      const response = await stripeApi.createPortal();
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
      alert("Failed to open billing portal. Please try again.");
      setIsManaging(false);
    }
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    logout();
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-[var(--muted-foreground)]">
          Manage your account settings
        </p>
      </div>

      {/* Account Section */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] mb-6 overflow-hidden">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold">Account</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
              Email
            </label>
            <p className="text-lg">{user?.email || "Loading..."}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
              User ID
            </label>
            <p className="font-mono text-sm text-[var(--muted-foreground)]">
              {user?.userId || "Loading..."}
            </p>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] mb-6 overflow-hidden">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold">Security</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">
              Master Password
            </label>
            <p className="text-sm text-[var(--muted-foreground)]">
              Your vault is protected with zero-knowledge encryption. Your master password
              never leaves your device.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[var(--success)]" />
              <div>
                <p className="font-medium text-[var(--success)]">Vault Unlocked</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Your data is encrypted with AES-256-GCM
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Section */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] mb-6 overflow-hidden">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold">Subscription</h2>
          </div>
        </div>
        <div className="p-6">
          {isLoadingSubscription ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
            </div>
          ) : subscription?.isPro ? (
            // Pro user view
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Sigil Pro</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {subscription.subscriptionStatus === "active" && "Active subscription"}
                      {subscription.subscriptionStatus === "canceled" && "Canceled - access until period ends"}
                      {subscription.subscriptionStatus === "past_due" && "Payment past due"}
                      {subscription.subscriptionStatus === "trialing" && "Trial period"}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30">
                  Pro
                </span>
              </div>
              
              {subscription.subscriptionEndsAt && (
                <div className="p-4 rounded-lg bg-[var(--muted)]">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {subscription.subscriptionStatus === "canceled" ? "Access ends" : "Renews"} on{" "}
                    <span className="font-medium text-[var(--foreground)]">
                      {formatDate(subscription.subscriptionEndsAt).split(",")[0]}
                    </span>
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleManageSubscription}
                  disabled={isManaging}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--muted)] text-[var(--foreground)] rounded-lg hover:bg-[var(--border)] transition-colors disabled:opacity-50"
                >
                  {isManaging ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Manage Subscription
                </button>
              </div>
            </div>
          ) : (
            // Free user view
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--muted)] flex items-center justify-center">
                    <User className="w-6 h-6 text-[var(--muted-foreground)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Free Plan</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      5 aliases included
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--muted)] text-[var(--muted-foreground)]">
                  Free
                </span>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
                <div className="flex items-start gap-3 mb-4">
                  <Crown className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-500">Upgrade to Pro</h4>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Unlock unlimited aliases and premium features
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-[var(--success)]" />
                    <span>Unlimited email aliases</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-[var(--success)]" />
                    <span>Priority email delivery</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-[var(--success)]" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-[var(--success)]" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <button
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Upgrade to Pro
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--destructive)]/30 overflow-hidden">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-[var(--destructive)]" />
            <h2 className="text-lg font-semibold">Session</h2>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Sign out will lock your vault and clear your master password from this session.
          </p>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--destructive)]/10 text-[var(--destructive)] border border-[var(--destructive)]/30 rounded-lg hover:bg-[var(--destructive)]/20 transition-colors disabled:opacity-50"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing out...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Sign Out
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}





