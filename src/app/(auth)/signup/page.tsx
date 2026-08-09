"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { authErrorMessage, useAuth } from "@/providers/AuthProvider";

export default function SignupPage() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"google" | "email" | null>(null);

  async function run(kind: "google" | "email", action: () => Promise<void>) {
    setError(null);
    setPending(kind);
    try {
      await action();
      router.replace("/bands");
    } catch (err) {
      setError(authErrorMessage(err));
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold">Konto erstellen</h1>
        <p className="text-muted text-sm">Danach legst du eine Band an oder trittst einer bei.</p>
      </header>

      <GoogleButton
        label="Mit Google registrieren"
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
          void run("email", () => signUpWithEmail(displayName, email, password));
        }}
      >
        <Input
          label="Anzeigename"
          required
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Wie dich die Band kennt"
        />
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
          autoComplete="new-password"
          required
          minLength={6}
          hint="Mindestens 6 Zeichen."
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
          Konto erstellen
        </Button>
      </form>

      <p className="text-muted text-center text-sm">
        Schon dabei?{" "}
        <Link href="/login" className="text-accent font-medium underline-offset-4 hover:underline">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
