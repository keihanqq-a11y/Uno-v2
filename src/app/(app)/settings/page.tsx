"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.refresh();
  }, [loading, user, router]);

  if (loading || !user) return <div className="p-10 text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 animate-fade-up">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted">Account</p>
      <h1 className="mt-2 font-display text-4xl text-gold">Settings</h1>
      <Panel className="mt-8 space-y-4 p-6 text-sm">
        <div className="flex justify-between border-b border-border pb-3">
          <span className="text-muted">Email</span>
          <span>{user.email}</span>
        </div>
        <div className="flex justify-between border-b border-border pb-3">
          <span className="text-muted">Verified</span>
          <span className={user.emailVerified ? "text-success" : "text-danger"}>
            {user.emailVerified ? "Yes" : "No"}
          </span>
        </div>
        <div className="flex justify-between border-b border-border pb-3">
          <span className="text-muted">Role</span>
          <span>{user.role}</span>
        </div>
        <Button variant="danger" onClick={() => void logout()}>
          Sign out
        </Button>
      </Panel>
    </div>
  );
}
