"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { Wordmark } from "@/components/brand/Logo";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { useDocument } from "@/hooks/useCollection";
import { bandDoc } from "@/lib/firebase/paths";
import { createBand } from "@/lib/data/bands";
import { normalizeInviteCode } from "@/lib/inviteCode";
import { cn } from "@/lib/cn";

function BandRow({ bandId, onOpen }: { bandId: string; onOpen: () => void }) {
  const { data: band, loading } = useDocument(bandDoc(bandId));

  if (loading) return <Skeleton className="h-16 w-full" />;
  if (!band) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="border-border hover:border-border-strong hover:bg-surface-2 group flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors"
    >
      <span className="bg-accent text-accent-fg font-display grid size-9 shrink-0 place-items-center rounded-md text-sm font-bold">
        {band.name.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{band.name}</span>
        {band.description ? (
          <span className="text-muted block truncate text-sm">{band.description}</span>
        ) : null}
      </span>
      <ArrowRight className="text-faint group-hover:text-accent size-4 shrink-0 transition-colors" />
    </button>
  );
}

export default function BandsPage() {
  const { user } = useAuth();
  const { bandIds, setActiveBandId, loading } = useBand();
  const router = useRouter();
  const { toast, toastError } = useToast();

  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setBusy(true);
    try {
      const bandId = await createBand(user, { name, description });
      setActiveBandId(bandId);
      toast(`"${name.trim()}" wurde angelegt. Du bist Admin.`, "success");
      router.replace("/dashboard");
    } catch (err) {
      toastError(err, "Die Band konnte nicht angelegt werden.");
      setBusy(false);
    }
  }

  function onJoin(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeInviteCode(code);
    if (!normalized) {
      toast("Ein Einladungscode besteht aus 8 Zeichen.", "error");
      return;
    }
    router.push(`/bands/join/${normalized}`);
  }

  const hasBands = bandIds.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-6">
      <header className="flex flex-col gap-2">
        <div className="md:hidden">
          <Wordmark />
        </div>
        <h1 className="text-2xl font-semibold">
          {hasBands ? "Deine Bands" : "Leg los mit deiner ersten Band"}
        </h1>
        <p className="text-muted text-sm">
          {hasBands
            ? "Wähle eine Band aus oder komm bei einer weiteren dazu."
            : "Erstelle eine Band, oder tritt mit einem Einladungscode einer bestehenden bei."}
        </p>
      </header>

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : hasBands ? (
        <div className="flex flex-col gap-2">
          {bandIds.map((id) => (
            <BandRow
              key={id}
              bandId={id}
              onOpen={() => {
                setActiveBandId(id);
                router.replace("/dashboard");
              }}
            />
          ))}
        </div>
      ) : null}

      <Card>
        <div className="border-border flex border-b">
          {(
            [
              ["create", "Band erstellen"],
              ["join", "Beitreten"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                "relative flex-1 px-4 py-3 text-sm font-medium transition-colors",
                mode === value ? "text-accent" : "text-muted hover:text-text",
              )}
            >
              {label}
              {mode === value ? (
                <span className="bg-accent absolute inset-x-4 bottom-0 h-0.5 rounded-t-full" />
              ) : null}
            </button>
          ))}
        </div>

        <CardBody>
          {mode === "create" ? (
            <form className="flex flex-col gap-4" onSubmit={onCreate}>
              <Input
                label="Bandname"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nordwand"
              />
              <Textarea
                label="Beschreibung"
                hint="Optional."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Worum geht es bei euch?"
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={busy}
                disabled={!name.trim()}
              >
                <Plus className="size-4" aria-hidden />
                Band erstellen
              </Button>
              <p className="text-faint text-xs">
                Du wirst automatisch Admin und bekommst einen Einladungscode für die anderen.
              </p>
            </form>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={onJoin}>
              <Input
                label="Einladungscode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="z. B. SUNRAY42"
                className="font-mono tracking-[0.2em] uppercase"
                hint="Du kannst auch den kompletten Einladungslink einfügen."
              />
              <Button type="submit" variant="primary" size="lg" disabled={!code.trim()}>
                <Users className="size-4" aria-hidden />
                Band beitreten
              </Button>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
