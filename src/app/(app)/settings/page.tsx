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
import { useBand } from "@/providers/BandProvider";
import { deleteBand, updateBandSettings } from "@/lib/data/bands";

export default function SettingsPage() {
  const { activeBandId, band, can, loading, setActiveBandId } = useBand();
  const { toast, toastError } = useToast();
  const router = useRouter();

  const [draft, setDraft] = useState<{ name: string; description: string; photoURL: string } | null>(
    null,
  );
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

  const dirty =
    draft.name !== band.name ||
    draft.description !== band.description ||
    draft.photoURL !== (band.photoURL ?? "");

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    if (!activeBandId || !draft) return;
    setBusy(true);
    try {
      await updateBandSettings(activeBandId, draft);
      toast("Gespeichert.", "success");
    } catch (err) {
      toastError(err, "Die Einstellungen konnten nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!activeBandId || !band) return;
    setBusy(true);
    try {
      await deleteBand(activeBandId, band.inviteCode);
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
            {can.manageBand ? (
              <Button
                type="submit"
                variant="primary"
                loading={busy}
                disabled={!dirty || !draft.name.trim()}
                className="self-start"
              >
                Speichern
              </Button>
            ) : null}
          </form>
        </CardBody>
      </Card>

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
