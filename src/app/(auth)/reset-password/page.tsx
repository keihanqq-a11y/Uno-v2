"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Panel } from "@/components/ui/Panel";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Reset failed");
      return;
    }
    router.push("/login");
  };

  return (
    <Panel className="w-full p-8 animate-fade-up">
      <p className="font-display text-3xl text-gold tracking-[0.1em]">UNO</p>
      <h1 className="mt-2 text-xl">Reset password</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || !token}>
          Update password
        </Button>
      </form>
      <Link href="/login" className="mt-6 inline-block text-sm text-muted hover:text-gold">
        Back to sign in
      </Link>
    </Panel>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-12">
      <Suspense>
        <ResetForm />
      </Suspense>
    </div>
  );
}
