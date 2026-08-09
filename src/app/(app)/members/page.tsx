"use client";

import { useMemo, useState } from "react";
import { Info, LogOut, UserMinus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { InvitePanel } from "@/components/members/InvitePanel";
import { RolePicker } from "@/components/members/RolePicker";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { removeMember, updateFunctionalRole, updatePermissionRole } from "@/lib/data/members";
import { leaveBand } from "@/lib/data/bands";
import { canEditFunctionalRole, canEditPermissionRole, canRemoveMember } from "@/lib/permissions";
import { formatDuration } from "@/lib/time";
import { roleColorVar } from "@/lib/roleColors";
import {
  PERMISSION_ROLE_HINTS,
  PERMISSION_ROLE_LABELS,
  type BandMember,
  type PermissionRole,
} from "@/types/models";

const PERMISSION_TONE = { admin: "accent", member: "neutral", viewer: "neutral" } as const;

export default function MembersPage() {
  const { user } = useAuth();
  const { activeBandId, band, member, members, can, loading } = useBand();
  const { entries } = useTimeEntries({ bandId: activeBandId });
  const { toast, toastError } = useToast();

  const [editing, setEditing] = useState<BandMember | null>(null);
  const [draftRole, setDraftRole] = useState("");
  const [draftColor, setDraftColor] = useState("role-1");
  const [pendingRemove, setPendingRemove] = useState<BandMember | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const minutesByUser = useMemo(() => {
    const totals = new Map<string, number>();
    for (const entry of entries) {
      totals.set(entry.userId, (totals.get(entry.userId) ?? 0) + (entry.duration ?? 0));
    }
    return totals;
  }, [entries]);

  const sorted = useMemo(
    () =>
      [...members].sort((a, b) => {
        const rank = { admin: 0, member: 1, viewer: 2 } as const;
        const byRole = rank[a.permissionRole] - rank[b.permissionRole];
        return byRole !== 0 ? byRole : a.displayName.localeCompare(b.displayName);
      }),
    [members],
  );

  const adminCount = members.filter((m) => m.permissionRole === "admin").length;

  function openEditor(target: BandMember) {
    setEditing(target);
    setDraftRole(target.role);
    setDraftColor(target.roleColor || "role-1");
  }

  async function saveRole() {
    if (!activeBandId || !editing) return;
    setBusy(true);
    try {
      await updateFunctionalRole(activeBandId, editing.id, {
        role: draftRole,
        roleColor: draftColor,
      });
      toast("Rolle aktualisiert.", "success");
      setEditing(null);
    } catch (err) {
      toastError(err, "Die Rolle konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function changePermission(target: BandMember, permissionRole: PermissionRole) {
    if (!activeBandId) return;
    if (target.permissionRole === "admin" && permissionRole !== "admin" && adminCount <= 1) {
      toast("Die Band braucht mindestens einen Admin.", "error");
      return;
    }
    try {
      await updatePermissionRole(activeBandId, target.id, permissionRole);
      toast(`${target.displayName} ist jetzt ${PERMISSION_ROLE_LABELS[permissionRole]}.`, "success");
    } catch (err) {
      toastError(err, "Die Berechtigung konnte nicht geändert werden.");
    }
  }

  async function confirmRemove() {
    if (!activeBandId || !pendingRemove) return;
    setBusy(true);
    try {
      await removeMember(activeBandId, pendingRemove.id);
      toast(`${pendingRemove.displayName} wurde entfernt.`, "info");
      setPendingRemove(null);
    } catch (err) {
      toastError(err, "Das Mitglied konnte nicht entfernt werden.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmLeave() {
    if (!activeBandId || !user) return;
    if (can.isAdmin && adminCount <= 1) {
      toast("Ernenne zuerst einen anderen Admin.", "error");
      return;
    }
    setBusy(true);
    try {
      await leaveBand(activeBandId, user.uid);
      toast("Du hast die Band verlassen.", "info");
      setLeaveOpen(false);
    } catch (err) {
      toastError(err, "Verlassen ist fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Mitglieder</h1>
        <p className="text-muted text-sm">
          {band?.name ?? "Band"} · {members.length}{" "}
          {members.length === 1 ? "Person" : "Personen"}
        </p>
      </header>

      <div className="border-border bg-surface-2/50 text-muted flex items-start gap-2 rounded-md border p-3 text-xs">
        <Info className="text-faint mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>
          <strong className="text-text font-medium">Rolle</strong> beschreibt, was jemand in der
          Band macht, und ist rein informativ.{" "}
          <strong className="text-text font-medium">Berechtigung</strong> steuert, was jemand in
          Veritrack darf. Die beiden hängen bewusst nicht zusammen.
        </p>
      </div>

      {activeBandId && band ? (
        <InvitePanel bandId={activeBandId} inviteCode={band.inviteCode} canManage={can.manageBand} />
      ) : null}

      <Card>
        <CardBody>
          {loading ? (
            <SkeletonList rows={3} />
          ) : (
            <ul className="flex flex-col">
              {sorted.map((target) => {
                const isSelf = target.id === user?.uid;
                const minutes = minutesByUser.get(target.id) ?? 0;
                return (
                  <li
                    key={target.id}
                    className="border-border flex flex-wrap items-center gap-3 border-b py-3 last:border-0"
                  >
                    <Avatar
                      name={target.displayName}
                      src={target.photoURL}
                      color={roleColorVar(target.roleColor)}
                      size="md"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-medium">
                        {target.displayName}
                        {isSelf ? <span className="text-faint text-xs">(du)</span> : null}
                      </p>
                      <p className="text-muted truncate text-xs">
                        {target.role || "Keine Rolle angegeben"} · {formatDuration(minutes)} erfasst
                      </p>
                    </div>

                    {target.status === "invited" ? <Badge tone="warning">Eingeladen</Badge> : null}

                    {canEditPermissionRole(target.id, member) ? (
                      <select
                        aria-label={`Berechtigung von ${target.displayName}`}
                        value={target.permissionRole}
                        onChange={(e) =>
                          void changePermission(target, e.target.value as PermissionRole)
                        }
                        className="border-border bg-surface text-text h-8 rounded-md border px-2 text-xs"
                      >
                        {(
                          Object.entries(PERMISSION_ROLE_LABELS) as [PermissionRole, string][]
                        ).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge
                        tone={PERMISSION_TONE[target.permissionRole]}
                        title={PERMISSION_ROLE_HINTS[target.permissionRole]}
                      >
                        {PERMISSION_ROLE_LABELS[target.permissionRole]}
                      </Badge>
                    )}

                    {canEditFunctionalRole(target.id, member) ? (
                      <Button variant="ghost" size="sm" onClick={() => openEditor(target)}>
                        Rolle
                      </Button>
                    ) : null}

                    {!isSelf && canRemoveMember(target.id, member) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={`${target.displayName} entfernen`}
                        className="hover:text-danger"
                        onClick={() => setPendingRemove(target)}
                      >
                        <UserMinus className="size-4" aria-hidden />
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Button variant="ghost" size="sm" className="text-danger self-start" onClick={() => setLeaveOpen(true)}>
        <LogOut className="size-4" aria-hidden />
        Band verlassen
      </Button>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Rolle von ${editing.displayName}` : ""}
        description="Funktionale Rolle und Farbe. Ändert keine Berechtigungen."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={() => void saveRole()} loading={busy}>
              Speichern
            </Button>
          </>
        }
      >
        <RolePicker
          role={draftRole}
          roleColor={draftColor}
          onRoleChange={setDraftRole}
          onColorChange={setDraftColor}
          label="Rolle in der Band"
        />
      </Dialog>

      <ConfirmDialog
        open={pendingRemove !== null}
        onClose={() => setPendingRemove(null)}
        onConfirm={() => void confirmRemove()}
        loading={busy}
        confirmLabel="Entfernen"
        title={pendingRemove ? `${pendingRemove.displayName} entfernen?` : ""}
        description="Die erfassten Zeiten bleiben in den Auswertungen erhalten. Mit einem gültigen Einladungscode kann die Person erneut beitreten."
      />

      <ConfirmDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onConfirm={() => void confirmLeave()}
        loading={busy}
        confirmLabel="Verlassen"
        title="Band verlassen?"
        description="Du siehst die Band danach nicht mehr. Deine erfassten Zeiten bleiben für die Band sichtbar."
      />
    </div>
  );
}
