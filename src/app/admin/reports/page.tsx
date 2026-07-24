"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

interface Report {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  reporter: { username: string };
  reported: { id: string; username: string };
}

export default function AdminReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);

  const load = async () => {
    const res = await fetch("/api/admin/reports");
    if (res.ok) setReports((await res.json()).reports ?? []);
  };

  useEffect(() => {
    if (!loading && (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR"))) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user]);

  const setStatus = async (id: string, status: string) => {
    await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  };

  if (loading || !user) return <div className="p-10 text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 animate-fade-up">
      <h1 className="font-display text-3xl text-gold">Reports</h1>
      <div className="mt-6 space-y-3">
        {reports.map((r) => (
          <Panel key={r.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm">
                  <span className="text-gold">@{r.reporter.username}</span> reported{" "}
                  <span className="text-danger">@{r.reported.username}</span>
                </p>
                <p className="mt-1 text-sm">{r.reason}</p>
                {r.details && <p className="mt-1 text-xs text-muted">{r.details}</p>}
                <p className="mt-2 text-[10px] uppercase tracking-wider text-muted">{r.status}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => void setStatus(r.id, "REVIEWED")}>
                  Review
                </Button>
                <Button size="sm" onClick={() => void setStatus(r.id, "ACTIONED")}>
                  Action
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void setStatus(r.id, "DISMISSED")}>
                  Dismiss
                </Button>
              </div>
            </div>
          </Panel>
        ))}
        {!reports.length && <p className="text-sm text-muted">No reports.</p>}
      </div>
    </div>
  );
}
