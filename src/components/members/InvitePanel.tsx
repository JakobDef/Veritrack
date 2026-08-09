"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { regenerateInviteCode } from "@/lib/data/bands";
import { inviteLink } from "@/lib/inviteCode";

export function InvitePanel({
  bandId,
  inviteCode,
  canManage,
}: {
  bandId: string;
  inviteCode: string;
  canManage: boolean;
}) {
  const { toast, toastError } = useToast();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copy(value: string, kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast("Kopieren hat nicht geklappt. Markiere den Code von Hand.", "error");
    }
  }

  async function onRegenerate() {
    setBusy(true);
    try {
      await regenerateInviteCode(bandId, inviteCode);
      toast("Neuer Code erstellt. Alte Links funktionieren nicht mehr.", "success");
      setConfirmOpen(false);
    } catch (err) {
      toastError(err, "Der Code konnte nicht erneuert werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Leute einladen</h2>
          <p className="text-muted text-xs">
            Wer den Code hat, kann als Mitglied beitreten. Rechte vergibt danach ein Admin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <code className="border-border bg-surface-2 flex-1 rounded-md border px-3 py-2 text-center font-mono text-lg tracking-[0.3em] select-all">
            {inviteCode || "--------"}
          </code>
          <Button
            variant="secondary"
            onClick={() => void copy(inviteCode, "code")}
            disabled={!inviteCode}
          >
            {copied === "code" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            Code
          </Button>
          <Button
            variant="secondary"
            onClick={() => void copy(inviteLink(inviteCode), "link")}
            disabled={!inviteCode}
          >
            {copied === "link" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            Link
          </Button>
        </div>

        {canManage ? (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setConfirmOpen(true)}
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Code erneuern
          </Button>
        ) : null}
      </CardBody>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void onRegenerate()}
        loading={busy}
        confirmLabel="Code erneuern"
        title="Einladungscode erneuern?"
        description="Jeder bereits verschickte Link hört sofort auf zu funktionieren. Bestehende Mitglieder bleiben unberührt."
      />
    </Card>
  );
}
