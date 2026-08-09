"use client";

import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Connect to the local emulators exactly once per browser session.
 *
 * Next.js Fast Refresh re-executes this module on every edit. Calling
 * `connectAuthEmulator` / `connectFirestoreEmulator` a second time against a
 * live instance throws ("Firestore has already been started"), which would
 * break the dev server on the first save. The module-level singleton above is
 * not enough because Fast Refresh discards the module registry, so the guard
 * has to live on `globalThis`, which survives.
 */
declare global {
  // eslint-disable-next-line no-var
  var __VERITRACK_EMULATORS_CONNECTED__: boolean | undefined;
}

if (
  process.env.NEXT_PUBLIC_USE_EMULATOR === "true" &&
  typeof window !== "undefined" &&
  !globalThis.__VERITRACK_EMULATORS_CONNECTED__
) {
  globalThis.__VERITRACK_EMULATORS_CONNECTED__ = true;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export { app };
