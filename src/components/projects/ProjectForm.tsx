"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ROLE_COLOR_KEYS, ROLE_COLOR_LABELS, roleColorVar } from "@/lib/roleColors";
import { createProject, updateProject } from "@/lib/data/projects";
import { formatDateInput } from "@/lib/dates";
import { PROJECT_STATUS_LABELS, type Project, type ProjectStatus } from "@/types/models";

type Draft = {
  name: string;
  description: string;
  status: ProjectStatus;
  color: string;
  dueDate: string;
};

function draftFrom(project: Project | null): Draft {
  return {
    name: project?.name ?? "",
    description: project?.description ?? "",
    status: project?.status ?? "active",
    color: project?.color ?? "role-1",
    dueDate: project?.dueDate ? formatDateInput(project.dueDate) : "",
  };
}

export function ProjectForm({
  open,
  onClose,
  bandId,
  userId,
  project,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  bandId: string;
  userId: string;
  /** Null means "create". */
  project: Project | null;
  onCreated?: (projectId: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(project));
  const [busy, setBusy] = useState(false);
  const { toast, toastError } = useToast();

  // Re-seed whenever the dialog opens for a different project, otherwise a
  // second edit would show the previous project's values. Done in the render
  // phase (React's "adjust state when props change") so the form never paints
  // one frame of stale data.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const seedKey = open ? (project?.id ?? "new") : null;
  if (seedKey !== seededFor) {
    setSeededFor(seedKey);
    if (seedKey) setDraft(draftFrom(project));
  }

  const isEdit = project !== null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setBusy(true);
    try {
      const payload = {
        name: draft.name,
        description: draft.description,
        status: draft.status,
        color: draft.color,
        dueDate: draft.dueDate ? new Date(`${draft.dueDate}T12:00:00`) : null,
      };
      if (isEdit) {
        await updateProject(bandId, project.id, payload);
        toast("Projekt aktualisiert.", "success");
      } else {
        const id = await createProject(bandId, userId, payload);
        toast(`"${draft.name.trim()}" angelegt.`, "success");
        onCreated?.(id);
      }
      onClose();
    } catch (err) {
      toastError(err, "Das Projekt konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Projekt bearbeiten" : "Neues Projekt"}
      description={
        isEdit ? undefined : "Zeit wird immer auf ein Projekt gebucht. Ein Name reicht zum Start."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            form="project-form"
            type="submit"
            loading={busy}
            disabled={!draft.name.trim()}
          >
            {isEdit ? "Speichern" : "Projekt anlegen"}
          </Button>
        </>
      }
    >
      <form id="project-form" className="flex flex-col gap-4" onSubmit={onSubmit}>
        <Input
          label="Name"
          required
          autoFocus
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Album-Aufnahme"
        />
        <Textarea
          label="Beschreibung"
          hint="Optional."
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          placeholder="Worum geht es in diesem Projekt?"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Status"
            value={draft.status}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as ProjectStatus }))}
          >
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input
            label="Fällig am"
            type="date"
            hint="Optional."
            value={draft.dueDate}
            onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
          />
        </div>

        <Field label="Farbe">
          <div className="flex flex-wrap gap-2">
            {ROLE_COLOR_KEYS.map((key) => {
              const selected = draft.color === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, color: key }))}
                  aria-pressed={selected}
                  aria-label={ROLE_COLOR_LABELS[key]}
                  title={ROLE_COLOR_LABELS[key]}
                  className="grid size-8 place-items-center rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: roleColorVar(key),
                    boxShadow: selected
                      ? `0 0 0 2px var(--vt-surface), 0 0 0 4px ${roleColorVar(key)}`
                      : undefined,
                  }}
                >
                  {selected ? <Check className="size-4 text-white drop-shadow" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        </Field>
      </form>
    </Dialog>
  );
}
