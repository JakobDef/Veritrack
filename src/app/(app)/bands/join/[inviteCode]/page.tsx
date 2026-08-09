"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { RolePicker } from "@/components/members/RolePicker";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { joinBandByInviteCode, lookupInviteCode } from "@/lib/data/bands";
import { normalizeInviteCode } from "@/lib/inviteCode";
import { fallbackRoleColor } from "@/lib/roleColors";
import type { InviteCode } from "@/types/models";

export default function JoinBandPage({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = use(params);
  const code = normalizeInviteCode(inviteCode);

  const { user } = useAuth();
  const { setActiveBandId, bandIds } = useBand();
  const router = useRouter();
  const { toast, toastError } = useToast();

  const [invite, setInvite] = useState<InviteCode | null>(null);
  const [resolving, setResolving] = useState(true);
  const [role, setRole] = useState("");
  const [roleColor, setRoleColor] = useState(() => fallbackRoleColor(inviteCode));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // A malformed code needs no lookup; the derived state below already treats
    // it as invalid, so this effect stays purely about the async fetch.
    if (!code) return;
    let cancelled = false;
    void lookupInviteCode(code)
      .then((result) => {
        if (cancelled) return;
        setInvite(result);
        setResolving(false);
      })
      .catch(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const state: "loading" | "ready" | "invalid" = !code
    ? "invalid"
    : resolving
      ? "loading"
      : invite
        ? "ready"
        : "invalid";

  const alreadyMember = invite ? bandIds.includes(invite.bandId) : false;

  async function onJoin() {
    if (!user || !invite) return;
    setBusy(true);
    try {
      const bandId = await joinBandByInviteCode(user, code, { role, roleColor });
      setActiveBandId(bandId);
      toast(`Willkommen bei "${invite.bandName}".`, "success");
      router.replace("/dashboard");
    } catch (err) {
      toastError(err, "Beitritt fehlgeschlagen.");
      setBusy(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-10">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (state === "invalid" || !invite) {
    return (
      <div className="mx-auto w-full max-w-md py-10">
        <EmptyState
          icon={Users}
          title="Dieser Einladungscode gilt nicht mehr"
          description="Er wurde zurückgezogen oder falsch abgetippt. Frag die Band nach einem frischen Link."
          action={
            <Button variant="secondary" onClick={() => router.replace("/bands")}>
              <ArrowLeft className="size-4" aria-hidden />
              Zurück zur Übersicht
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-10">
      <header className="flex flex-col gap-2 text-center">
        <span className="bg-accent text-accent-fg font-display mx-auto grid size-14 place-items-center rounded-lg text-xl font-bold">
          {invite.bandName.slice(0, 1).toUpperCase()}
        </span>
        <h1 className="text-2xl font-semibold">{invite.bandName}</h1>
        <p className="text-muted text-sm">
          {alreadyMember
            ? "Du bist hier schon dabei."
            : "Du wurdest eingeladen. Sag kurz, was du in der Band machst."}
        </p>
      </header>

      <Card>
        <CardBody className="flex flex-col gap-6">
          {alreadyMember ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setActiveBandId(invite.bandId);
                router.replace("/dashboard");
              }}
            >
              Zum Dashboard
            </Button>
          ) : (
            <>
              <RolePicker
                role={role}
                roleColor={roleColor}
                onRoleChange={setRole}
                onColorChange={(color) => setRoleColor(color as typeof roleColor)}
              />
              <Button variant="primary" size="lg" loading={busy} onClick={() => void onJoin()}>
                <Users className="size-4" aria-hidden />
                Band beitreten
              </Button>
              <p className="text-faint text-center text-xs">
                Du trittst als Mitglied bei. Rechte vergibt ein Admin.
              </p>
            </>
          )}
        </CardBody>
      </Card>

      <Link
        href="/bands"
        className="text-muted hover:text-text mx-auto text-sm underline-offset-4 hover:underline"
      >
        Doch eine andere Band
      </Link>
    </div>
  );
}
