"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Input, Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { InvitePanel } from "@/components/members/InvitePanel";
import { deleteBand, updateBandSettings } from "@/lib/data/bands";
import { centsToEuroInput, eurosToCents } from "@/lib/money";

export default function SettingsPage() {
  const { user } = useAuth();
  const { activeBandId, band, can, loading, setActiveBandId } = useBand();
  const { toast, toastError } = useToast();
  const router = useRouter();

  const [draft, setDraft] = useState<{
    name: string;
    description: string;
    photoURL: string;
    hourlyRate: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Seed once the band document arrives, then let the user own the form.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (band && band.id !== seededFor) {
    setSeededFor(band.id);
    setDraft({
      name: band.name,
      description: band.description,
      photoURL: band.photoURL ?? "",
      hourlyRate: centsToEuroInput(band.hourlyRateCents),
    });
  }

  if (loading || !band || !draft) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const parsedRate = eurosToCents(draft.hourlyRate);
  const dirty =
    draft.name !== band.name ||
    draft.description !== band.description ||
    draft.photoURL !== (band.photoURL ?? "") ||
    draft.hourlyRate !== centsToEuroInput(band.hourlyRateCents);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    if (!activeBandId || !draft) return;
    const hourlyRateCents = eurosToCents(draft.hourlyRate);
    if (hourlyRateCents === null) {
      toast("Stundenlohn ist keine gültige Zahl.", "error");
      return;
    }
    setBusy(true);
    try {
      await updateBandSettings(activeBandId, {
        name: draft.name,
        description: draft.description,
        photoURL: draft.photoURL || null,
        hourlyRateCents,
      });
      setDraft((current) =>
        current ? { ...current, hourlyRate: centsToEuroInput(hourlyRateCents) } : current,
      );
      toast("Gespeichert.", "success");
    } catch (err) {
      toastError(err, "Die Einstellungen konnten nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!activeBandId || !band || !user) return;
    setBusy(true);
    try {
      await deleteBand(activeBandId, user.uid, band.inviteCode);
      setActiveBandId(null);
      toast("Band gelöscht.", "info");
      router.replace("/bands");
    } catch (err) {
      toastError(err, "Die Band konnte nicht gelöscht werden.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Einstellungen</h1>
        <p className="text-muted text-sm">Stammdaten der Band.</p>
      </header>

      {!can.manageBand ? (
        <div className="border-border bg-surface-2/50 text-muted flex items-start gap-2 rounded-md border p-3 text-xs">
          <Lock className="text-faint mt-0.5 size-3.5 shrink-0" aria-hidden />
          <p>Nur Admins können diese Einstellungen ändern. Du siehst sie schreibgeschützt.</p>
        </div>
      ) : null}

      <Card>
        <CardBody>
          <form className="flex flex-col gap-4" onSubmit={onSave}>
            <Input
              label="Bandname"
              required
              disabled={!can.manageBand}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <Textarea
              label="Beschreibung"
              hint="Optional."
              disabled={!can.manageBand}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
            <Input
              label="Bandfoto"
              type="url"
              hint="Optional. Link zu einem Bild."
              placeholder="https://..."
              disabled={!can.manageBand}
              value={draft.photoURL}
              onChange={(e) => setDraft({ ...draft, photoURL: e.target.value })}
            />
            <Input
              label="Stundenlohn"
              inputMode="decimal"
              placeholder="€ / h"
              hint="Euro pro Stunde, für die ganze Band. Offene Stunden nutzen immer den aktuellen Satz."
              error={parsedRate === null ? "Keine gültige Zahl." : undefined}
              disabled={!can.manageBand}
              value={draft.hourlyRate}
              onChange={(e) => setDraft({ ...draft, hourlyRate: e.target.value })}
            />
            {can.manageBand ? (
              <Button
                type="submit"
                variant="primary"
                loading={busy}
                disabled={!dirty || !draft.name.trim() || parsedRate === null}
                className="self-start"
              >
                Speichern
              </Button>
            ) : null}
          </form>
        </CardBody>
      </Card>

      {activeBandId && band ? (
        <InvitePanel
          bandId={activeBandId}
          inviteCode={band.inviteCode}
          canManage={can.manageBand}
        />
      ) : null}

      {can.manageBand ? (
        <Card className="border-danger/30">
          <CardBody className="flex flex-col gap-3">
            <div>
              <h2 className="text-danger text-sm font-semibold">Band löschen</h2>
              <p className="text-muted mt-1 text-xs">
                Entfernt die Band für alle. Projekte, Aufgaben und Zeiteinträge werden dabei nicht
                einzeln gelöscht, sind danach aber für niemanden mehr erreichbar.
              </p>
            </div>
            <Button variant="danger" className="self-start" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" aria-hidden />
              Band löschen
            </Button>
          </CardBody>
        </Card>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void onDelete()}
        loading={busy}
        title={`"${band.name}" löschen?`}
        description="Das lässt sich nicht rückgängig machen. Alle Mitglieder verlieren den Zugriff."
      />
    </div>
  );
}
