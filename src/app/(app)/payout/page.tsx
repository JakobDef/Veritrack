"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { orderBy, query } from "firebase/firestore";
import { Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { useCollection } from "@/hooks/useCollection";
import { useProjects } from "@/hooks/useProjects";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { deleteEntry } from "@/lib/data/timeEntries";
import { markMemberPaid } from "@/lib/data/payouts";
import { payoutsCol } from "@/lib/firebase/paths";
import { formatDayLabel } from "@/lib/dates";
import { formatDuration, formatTimeOfDay } from "@/lib/time";
import { formatEur } from "@/lib/money";
import { memberDisplayName, openByMember, type OpenMemberGroup } from "@/lib/payout";
import { timeEntryProjectName } from "@/lib/projectLabel";
import type { TimeEntry } from "@/types/models";

export default function PayoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeBandId, band, members, can, loading: bandLoading } = useBand();
  const isAdmin = can.isAdmin;
  const { byId: projectsById } = useProjects(activeBandId);
  const { entries, loading: entriesLoading, error: entriesError } = useTimeEntries({
    bandId: isAdmin ? activeBandId : null,
  });
  const { toast, toastError } = useToast();

  const payoutsQuery = useMemo(
    () =>
      isAdmin && activeBandId
        ? query(payoutsCol(activeBandId), orderBy("createdAt", "desc"))
        : null,
    [isAdmin, activeBandId],
  );
  const { data: payouts, loading: payoutsLoading, error: payoutsError } = useCollection(payoutsQuery);

  const [pendingDelete, setPendingDelete] = useState<TimeEntry | null>(null);
  const [pendingPay, setPendingPay] = useState<OpenMemberGroup | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!bandLoading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [bandLoading, isAdmin, router]);

  const hourlyRateCents = band?.hourlyRateCents ?? 0;
  const openGroups = useMemo(
    () => openByMember(entries, members, hourlyRateCents),
    [entries, members, hourlyRateCents],
  );

  if (bandLoading || !isAdmin) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  async function onDelete() {
    if (!activeBandId || !pendingDelete) return;
    setBusy(true);
    try {
      await deleteEntry(activeBandId, pendingDelete.id);
      toast("Eintrag gelöscht.", "info");
      setPendingDelete(null);
    } catch (err) {
      toastError(err, "Der Eintrag konnte nicht gelöscht werden.");
    } finally {
      setBusy(false);
    }
  }

  async function onMarkPaid() {
    if (!activeBandId || !user || !pendingPay) return;
    setBusy(true);
    try {
      await markMemberPaid({
        bandId: activeBandId,
        actorUid: user.uid,
        userId: pendingPay.userId,
        entries: pendingPay.entries,
        hourlyRateCents,
      });
      toast(`${pendingPay.displayName} als bezahlt markiert.`, "success");
      setPendingPay(null);
    } catch (err) {
      toastError(err, "Die Auszahlung konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  const rateLabel =
    hourlyRateCents > 0 ? `${formatEur(hourlyRateCents)} / h` : "Nicht festgelegt";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Abrechnung</h1>
        <p className="text-muted text-sm">
          Aktueller Satz: {rateLabel}.{" "}
          <Link href="/settings" className="text-accent font-medium underline-offset-4 hover:underline">
            In den Einstellungen ändern
          </Link>
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Offene Stunden</h2>
        {entriesLoading ? (
          <SkeletonList rows={3} />
        ) : entriesError ? (
          <EmptyState
            icon={Wallet}
            title="Zeiten konnten nicht geladen werden"
            description="Versuch die Seite neu zu laden."
          />
        ) : openGroups.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Nichts offen"
            description="Sobald jemand abgeschlossene, unbezahlte Stunden hat, erscheinen sie hier."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {openGroups.map((group) => (
              <Card key={group.userId}>
                <CardBody className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{group.displayName}</h3>
                      <p className="text-muted text-sm">
                        {formatDuration(group.minutes)}
                        {hourlyRateCents > 0 ? ` · ${formatEur(group.amountCents)}` : null}
                      </p>
                      {hourlyRateCents <= 0 ? (
                        <p className="text-muted mt-1 text-xs">
                          Stundenlohn in den{" "}
                          <Link
                            href="/settings"
                            className="text-accent font-medium underline-offset-4 hover:underline"
                          >
                            Einstellungen
                          </Link>{" "}
                          festlegen
                        </p>
                      ) : null}
                    </div>
                    {hourlyRateCents > 0 ? (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={busy}
                        onClick={() => setPendingPay(group)}
                      >
                        Als bezahlt markieren
                      </Button>
                    ) : null}
                  </div>

                  <ul className="flex flex-col">
                    {group.entries.map((entry) => {
                      const project = entry.projectId
                        ? projectsById.get(entry.projectId)
                        : undefined;
                      return (
                        <li
                          key={entry.id}
                          className="group hover:bg-surface-2 -mx-2 flex items-center gap-3 rounded-md px-2 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{entry.description}</p>
                            <p className="text-muted truncate text-xs">
                              {timeEntryProjectName(entry.projectId, project)} ·{" "}
                              {formatDayLabel(entry.startTime)} · {formatTimeOfDay(entry.startTime)}
                            </p>
                          </div>
                          <span className="tabular shrink-0 font-mono text-sm">
                            {formatDuration(entry.duration)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            aria-label="Eintrag löschen"
                            className="hover:text-danger"
                            onClick={() => setPendingDelete(entry)}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Auszahlungen</h2>
        {payoutsLoading ? (
          <SkeletonList rows={2} />
        ) : payoutsError ? (
          <EmptyState
            icon={Wallet}
            title="Auszahlungen konnten nicht geladen werden"
            description="Versuch die Seite neu zu laden."
          />
        ) : payouts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Noch keine Auszahlungen"
            description="Markierte Zahlungen erscheinen hier mit dem Satz von damals."
          />
        ) : (
          <Card>
            <CardBody className="p-0">
              <ul>
                {payouts.map((payout) => (
                  <li
                    key={payout.id}
                    className="border-border flex flex-wrap items-baseline justify-between gap-2 border-t px-5 py-3 first:border-t-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {memberDisplayName(payout.userId, members)}
                      </p>
                      <p className="text-muted text-xs">
                        {formatDayLabel(payout.createdAt)} · {formatTimeOfDay(payout.createdAt)} ·{" "}
                        {formatEur(payout.hourlyRateCents)} / h
                      </p>
                    </div>
                    <div className="tabular text-right font-mono text-sm">
                      <p className="font-medium">{formatEur(payout.amountCents)}</p>
                      <p className="text-muted text-xs">{formatDuration(payout.minutes)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void onDelete()}
        loading={busy}
        title="Eintrag löschen?"
        description={
          pendingDelete
            ? `${formatDuration(pendingDelete.duration)} auf "${timeEntryProjectName(pendingDelete.projectId, pendingDelete.projectId ? projectsById.get(pendingDelete.projectId) : undefined)}" werden entfernt.`
            : ""
        }
      />

      <Dialog
        open={pendingPay !== null}
        onClose={() => setPendingPay(null)}
        title="Als bezahlt markieren?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingPay(null)} disabled={busy}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              onClick={() => void onMarkPaid()}
              loading={busy}
              disabled={hourlyRateCents <= 0}
            >
              Als bezahlt markieren
            </Button>
          </>
        }
      >
        {pendingPay ? (
          <p className="text-muted text-sm">
            {pendingPay.displayName}: {formatDuration(pendingPay.minutes)} für{" "}
            {formatEur(pendingPay.amountCents)}. Der Betrag wird festgehalten und ändert sich nicht
            mehr, wenn der Stundenlohn später wechselt.
          </p>
        ) : null}
      </Dialog>
    </div>
  );
}
