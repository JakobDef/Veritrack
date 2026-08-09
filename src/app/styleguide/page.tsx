"use client";

import { useState } from "react";
import { Clock, FolderOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Badge, ColorBadge } from "@/components/ui/Badge";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/Toast";
import { ROLE_COLOR_KEYS, ROLE_COLOR_LABELS, roleColorVar } from "@/lib/roleColors";

/**
 * Internal design-system reference. Not linked from the app navigation, but kept
 * in the tree deliberately: it is the fastest way to eyeball every primitive in
 * both themes after a token change.
 */
export default function StyleguidePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast, toastError } = useToast();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Veritrack Styleguide</h1>
          <p className="text-muted text-sm">Alle Primitives, beide Themes.</p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Farben">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["bg", "--vt-bg"],
            ["surface", "--vt-surface"],
            ["surface-2", "--vt-surface-2"],
            ["border", "--vt-border"],
            ["accent", "--vt-accent"],
            ["success", "--vt-success"],
            ["warning", "--vt-warning"],
            ["danger", "--vt-danger"],
          ].map(([name, varName]) => (
            <div key={name} className="border-border overflow-hidden rounded-md border">
              <div className="h-12" style={{ background: `var(${varName})` }} />
              <div className="px-2 py-1.5 text-xs">{name}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Rollenfarben">
        <div className="flex flex-wrap gap-2">
          {ROLE_COLOR_KEYS.map((key) => (
            <ColorBadge key={key} color={roleColorVar(key)}>
              {ROLE_COLOR_LABELS[key]}
            </ColorBadge>
          ))}
        </div>
      </Section>

      <Section title="Typografie">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-semibold">Display 4xl · Space Grotesk</h1>
          <h2 className="text-2xl font-semibold">Display 2xl</h2>
          <p className="text-base">Fließtext in Inter, für alles was gelesen wird.</p>
          <p className="text-muted text-sm">Sekundärtext, gedämpft.</p>
          <p className="tabular font-mono text-3xl">01:23:45</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" loading>
            Lädt
          </Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
          <Button variant="secondary" iconOnly aria-label="Hinzufügen">
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="primary">
            Small
          </Button>
          <Button size="md" variant="primary">
            Medium
          </Button>
          <Button size="lg" variant="primary">
            <Clock className="size-4" />
            Large
          </Button>
        </div>
      </Section>

      <Section title="Formularfelder">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" placeholder="Sommertour 2026" />
          <Input label="Mit Fehler" defaultValue="zu kurz" error="Mindestens 3 Zeichen." />
          <Select label="Status" defaultValue="active">
            <option value="active">Aktiv</option>
            <option value="paused">Pausiert</option>
            <option value="done">Fertig</option>
          </Select>
          <Input label="Deaktiviert" disabled placeholder="Nicht editierbar" />
          <Textarea
            className="sm:col-span-2"
            label="Beschreibung"
            hint="Optional."
            placeholder="Worum geht es?"
          />
        </div>
      </Section>

      <Section title="Badges & Avatare">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="accent">Akzent</Badge>
          <Badge tone="success">Fertig</Badge>
          <Badge tone="warning">Pausiert</Badge>
          <Badge tone="danger">Überfällig</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name="Michi Dev" color={roleColorVar("role-1")} />
          <Avatar name="Lena Berg" size="lg" color={roleColorVar("role-4")} />
          <Avatar name="Ohne Farbe" size="sm" />
          <AvatarStack
            people={[
              { name: "Michi Dev", color: roleColorVar("role-1") },
              { name: "Lena Berg", color: roleColorVar("role-4") },
              { name: "Tom Falk", color: roleColorVar("role-6") },
              { name: "Ana Roth", color: roleColorVar("role-8") },
              { name: "Jo Kern", color: roleColorVar("role-3") },
            ]}
          />
        </div>
      </Section>

      <Section title="Karten">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card interactive>
            <CardHeader>
              <CardTitle>Album-Aufnahme</CardTitle>
              <CardDescription>12 Aufgaben · 34 h getrackt</CardDescription>
            </CardHeader>
            <CardBody>
              <p className="text-muted text-sm">Interaktive Karte mit Hover-Zustand.</p>
            </CardBody>
            <CardFooter>
              <Badge tone="success">Aktiv</Badge>
            </CardFooter>
          </Card>
          <Card>
            <CardBody className="flex flex-col gap-3">
              <Skeleton className="h-5 w-1/2" />
              <SkeletonList rows={2} />
            </CardBody>
          </Card>
        </div>
      </Section>

      <Section title="Leerzustand">
        <EmptyState
          icon={FolderOpen}
          title="Noch keine Projekte"
          description="Lege dein erstes Projekt an, damit ihr Zeit darauf tracken könnt."
          action={
            <Button variant="primary">
              <Plus className="size-4" />
              Projekt anlegen
            </Button>
          }
        />
      </Section>

      <Section title="Overlays & Toasts">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDialogOpen(true)}>Dialog öffnen</Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" />
            Bestätigung
          </Button>
          <Button variant="subtle" onClick={() => toast("Zeiteintrag gespeichert.", "success")}>
            Success-Toast
          </Button>
          <Button variant="subtle" onClick={() => toastError(new Error("Keine Berechtigung."))}>
            Error-Toast
          </Button>
        </div>
      </Section>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Projekt bearbeiten"
        description="Änderungen werden sofort für alle sichtbar."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>
              Speichern
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Name" defaultValue="Album-Aufnahme" />
          <Textarea label="Beschreibung" defaultValue="Studio-Sessions im Frühjahr." />
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
        title="Projekt löschen?"
        description="Alle zugehörigen Aufgaben werden ebenfalls entfernt. Zeiteinträge bleiben erhalten."
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-muted text-xs font-semibold tracking-widest uppercase">{title}</h2>
      {children}
    </section>
  );
}
