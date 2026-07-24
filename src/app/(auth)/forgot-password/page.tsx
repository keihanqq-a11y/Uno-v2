"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Panel } from "@/components/ui/Panel";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setDone(true);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-12">
      <Panel className="w-full p-8 animate-fade-up">
        <p className="font-display text-3xl text-gold tracking-[0.1em]">UNO</p>
        <h1 className="mt-2 text-xl">Forgot password</h1>
        <p className="mt-1 text-sm text-muted mb-8">
          We&apos;ll email a reset link if the account exists.
        </p>
        {done ? (
          <p className="text-success text-sm">Check your inbox for reset instructions.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              Send reset link
            </Button>
          </form>
        )}
        <Link href="/login" className="mt-6 inline-block text-sm text-muted hover:text-gold">
          Back to sign in
        </Link>
      </Panel>
    </div>
  );
}
