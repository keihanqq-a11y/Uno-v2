"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

function VerifyContent() {
  const params = useSearchParams();
  const success = params.get("success");
  const error = params.get("error");

  return (
    <Panel className="w-full p-8 text-center animate-fade-up">
      <p className="font-display text-3xl text-gold tracking-[0.1em]">UNO</p>
      <h1 className="mt-4 text-xl">Email verification</h1>
      {success && (
        <p className="mt-4 text-success">Your email is verified. Welcome to the table.</p>
      )}
      {error && (
        <p className="mt-4 text-danger">
          Verification link is invalid or expired.
        </p>
      )}
      {!success && !error && (
        <p className="mt-4 text-muted text-sm">
          Check your inbox for a verification link after registering.
        </p>
      )}
      <Link href="/dashboard" className="mt-8 inline-block">
        <Button>Continue</Button>
      </Link>
    </Panel>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-12">
      <Suspense>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
