"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { ensureUserProfile } from "@/lib/data/users";

type AuthContextValue = {
  user: User | null;
  /** True until the first `onAuthStateChanged` callback fires. */
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (displayName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (next) => {
      if (next) {
        // Runs on every sign-in and every reload; ensureUserProfile is a no-op
        // once the profile exists.
        try {
          await ensureUserProfile(next);
        } catch {
          // A failed profile write must not block sign-in; the bands page
          // surfaces the resulting error state.
        }
      }
      setUser(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signInWithGoogle() {
        await signInWithPopup(auth, new GoogleAuthProvider());
      },
      async signInWithEmail(email, password) {
        await signInWithEmailAndPassword(auth, email, password);
      },
      async signUpWithEmail(displayName, email, password) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const name = displayName.trim();
        if (name) await updateProfile(cred.user, { displayName: name });
        // updateProfile does not re-fire onAuthStateChanged, so the profile
        // document would otherwise be created with an empty display name.
        await ensureUserProfile(cred.user);
      },
      async signOut() {
        await fbSignOut(auth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** German copy for the Firebase auth error codes users actually hit. */
export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/invalid-email":
      return "Diese E-Mail-Adresse ist ungültig.";
    case "auth/missing-password":
      return "Bitte gib ein Passwort ein.";
    case "auth/weak-password":
      return "Das Passwort braucht mindestens 6 Zeichen.";
    case "auth/email-already-in-use":
      return "Für diese E-Mail gibt es schon ein Konto. Melde dich stattdessen an.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-Mail oder Passwort stimmt nicht.";
    case "auth/too-many-requests":
      return "Zu viele Versuche. Warte kurz und probiere es erneut.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Das Anmeldefenster wurde geschlossen.";
    case "auth/popup-blocked":
      return "Der Browser hat das Anmeldefenster blockiert. Erlaube Pop-ups für diese Seite.";
    case "auth/network-request-failed":
      return "Keine Verbindung. Läuft der Firebase-Emulator?";
    default:
      return error instanceof Error && error.message
        ? error.message
        : "Anmeldung fehlgeschlagen.";
  }
}
