"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { authErrorMessage, useAuth } from "@/providers/AuthProvider";

function LoginForm() {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"google" | "email" | null>(null);

  async function run(kind: "google" | "email", action: () => Promise<void>) {
    setError(null);
    setPending(kind);
    try {
      await action();
      router.replace(next);
    } catch (err) {
      setError(authErrorMessage(err));
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold">Willkommen zurück</h1>
        <p className="text-muted text-sm">Melde dich an, um weiterzutracken.</p>
      </header>

      <GoogleButton
        label="Mit Google anmelden"
        loading={pending === "google"}
        onClick={() => run("google", signInWithGoogle)}
      />

      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-faint text-xs">oder</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run("email", () => signInWithEmail(email, password));
        }}
      >
        <Input
          label="E-Mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="du@band.de"
        />
        <Input
          label="Passwort"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        {error ? (
          <p role="alert" className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" size="lg" loading={pending === "email"}>
          Anmelden
        </Button>
      </form>

      <p className="text-muted text-center text-sm">
        Noch kein Konto?{" "}
        <Link href="/signup" className="text-accent font-medium underline-offset-4 hover:underline">
          Registrieren
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary to keep the route statically
  // prerenderable instead of forcing it dynamic.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
