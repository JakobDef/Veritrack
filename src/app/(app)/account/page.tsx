"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { updateOwnProfile } from "@/lib/data/users";
import { roleColorVar } from "@/lib/roleColors";

export default function AccountPage() {
  const { user } = useAuth();
  const { profile, member, bandIds, loading } = useBand();
  const { toast, toastError } = useToast();

  const [draft, setDraft] = useState<{ displayName: string; photoURL: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  if (!loading && user) {
    if (profile && profile.id !== seededFor) {
      setSeededFor(profile.id);
      setDraft({
        displayName: profile.displayName,
        photoURL: profile.photoURL ?? "",
      });
    } else if (!profile && seededFor !== user.uid) {
      setSeededFor(user.uid);
      setDraft({
        displayName: user.displayName ?? "",
        photoURL: user.photoURL ?? "",
      });
    }
  }

  if (loading || !user || !draft) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const currentName = profile?.displayName || user.displayName || "";
  const currentPhoto = profile?.photoURL || user.photoURL || "";
  const dirty = draft.displayName !== currentName || draft.photoURL !== currentPhoto;
  const nameError = !draft.displayName.trim() ? "Bitte gib einen Namen ein." : null;

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !draft || nameError) return;
    setBusy(true);
    try {
      await updateOwnProfile(user, bandIds, {
        displayName: draft.displayName,
        photoURL: draft.photoURL.trim() || null,
      });
      toast("Profil gespeichert.", "success");
    } catch (err) {
      toastError(err, "Das Profil konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Profil</h1>
        <p className="text-muted text-sm">Dein Name und Bild in der Band.</p>
      </header>

      <Card>
        <CardBody>
          <form className="flex flex-col gap-4" onSubmit={onSave}>
            <div className="flex items-center gap-4">
              <Avatar
                name={draft.displayName || "Du"}
                src={draft.photoURL || null}
                color={member ? roleColorVar(member.roleColor) : null}
                size="lg"
              />
              <p className="text-muted text-xs">Vorschau. Speichern übernimmt das Bild in allen Bands.</p>
            </div>
            <Input
              label="Name"
              required
              value={draft.displayName}
              onChange={(e) => setDraft((d) => (d ? { ...d, displayName: e.target.value } : d))}
              error={nameError ?? undefined}
            />
            <Input
              label="Profilbild"
              type="url"
              hint="Optional. Link zu einem Bild."
              placeholder="https://..."
              value={draft.photoURL}
              onChange={(e) => setDraft((d) => (d ? { ...d, photoURL: e.target.value } : d))}
            />
            <Button
              type="submit"
              variant="primary"
              loading={busy}
              disabled={!dirty || !!nameError}
              className="self-start"
            >
              Speichern
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
