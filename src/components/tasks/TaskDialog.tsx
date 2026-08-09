"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createTask, deleteTask, updateTask } from "@/lib/data/tasks";
import { formatDateInput } from "@/lib/dates";
import { roleColorVar } from "@/lib/roleColors";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type BandMember,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/types/models";
import { cn } from "@/lib/cn";

type Draft = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignedTo: string[];
};

function draftFrom(task: Task | null, fallbackStatus: TaskStatus): Draft {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? fallbackStatus,
    priority: task?.priority ?? "medium",
    dueDate: task?.dueDate ? formatDateInput(task.dueDate) : "",
    assignedTo: task?.assignedTo ?? [],
  };
}

export function TaskDialog({
  open,
  onClose,
  bandId,
  projectId,
  task,
  initialStatus,
  members,
  canEdit,
}: {
  open: boolean;
  onClose: () => void;
  bandId: string;
  projectId: string;
  /** Null means "create". */
  task: Task | null;
  initialStatus: TaskStatus;
  members: BandMember[];
  canEdit: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(task, initialStatus));
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast, toastError } = useToast();

  // See ProjectForm: render-phase re-seed so reopening the dialog for a
  // different task never shows the previous task's values.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const seedKey = open ? (task?.id ?? `new:${initialStatus}`) : null;
  if (seedKey !== seededFor) {
    setSeededFor(seedKey);
    if (seedKey) setDraft(draftFrom(task, initialStatus));
  }

  const isEdit = task !== null;

  function toggleAssignee(userId: string) {
    setDraft((d) => ({
      ...d,
      assignedTo: d.assignedTo.includes(userId)
        ? d.assignedTo.filter((id) => id !== userId)
        : [...d.assignedTo, userId],
    }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setBusy(true);
    try {
      const payload = {
        title: draft.title,
        description: draft.description,
        status: draft.status,
        priority: draft.priority,
        assignedTo: draft.assignedTo,
        dueDate: draft.dueDate ? new Date(`${draft.dueDate}T12:00:00`) : null,
      };
      if (isEdit) await updateTask(bandId, projectId, task.id, payload);
      else await createTask(bandId, projectId, payload);
      onClose();
    } catch (err) {
      toastError(err, "Die Aufgabe konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!task) return;
    setBusy(true);
    try {
      await deleteTask(bandId, projectId, task.id);
      toast("Aufgabe gelöscht.", "info");
      setConfirmOpen(false);
      onClose();
    } catch (err) {
      toastError(err, "Die Aufgabe konnte nicht gelöscht werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={isEdit ? "Aufgabe" : "Neue Aufgabe"}
        footer={
          canEdit ? (
            <>
              {isEdit ? (
                <Button
                  variant="ghost"
                  onClick={() => setConfirmOpen(true)}
                  disabled={busy}
                  className="text-danger mr-auto"
                >
                  <Trash2 className="size-4" aria-hidden />
                  Löschen
                </Button>
              ) : null}
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                Abbrechen
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="task-form"
                loading={busy}
                disabled={!draft.title.trim()}
              >
                {isEdit ? "Speichern" : "Anlegen"}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              Schließen
            </Button>
          )
        }
      >
        <form id="task-form" className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Input
            label="Titel"
            required
            autoFocus
            disabled={!canEdit}
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Drums einspielen"
          />
          <Textarea
            label="Beschreibung"
            hint="Optional."
            disabled={!canEdit}
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Status"
              disabled={!canEdit}
              value={draft.status}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as TaskStatus }))}
            >
              {(Object.entries(TASK_STATUS_LABELS) as [TaskStatus, string][]).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <Select
              label="Priorität"
              disabled={!canEdit}
              value={draft.priority}
              onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value as TaskPriority }))}
            >
              {(Object.entries(TASK_PRIORITY_LABELS) as [TaskPriority, string][]).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <Input
              label="Fällig am"
              type="date"
              disabled={!canEdit}
              value={draft.dueDate}
              onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
            />
          </div>

          <Field label="Zugewiesen an" hint="Mehrfachauswahl möglich.">
            <div className="flex flex-wrap gap-1.5">
              {members.map((member) => {
                const selected = draft.assignedTo.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => toggleAssignee(member.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-xs transition-colors disabled:opacity-60",
                      selected
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border text-muted hover:border-border-strong hover:text-text",
                    )}
                  >
                    <Avatar
                      name={member.displayName}
                      src={member.photoURL}
                      color={roleColorVar(member.roleColor)}
                      size="xs"
                    />
                    {member.displayName}
                  </button>
                );
              })}
            </div>
          </Field>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void onDelete()}
        loading={busy}
        title="Aufgabe löschen?"
        description="Bereits erfasste Zeit auf dieser Aufgabe bleibt erhalten."
      />
    </>
  );
}
