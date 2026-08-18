/**
 * Firestore data model.
 *
 * These are the *application* shapes: every Firestore `Timestamp` is already
 * mapped to a JS `Date` by the converters in `src/lib/firebase/converters.ts`.
 *
 * The field set follows the agreed model exactly. Three additive extensions
 * exist, each forced by security rules or query shape (see the plan Log):
 *   - `BandMember.displayName` / `.photoURL` are denormalized so the members,
 *     timetable and stats views need one query instead of one read per user,
 *     and so `users/{uid}` can stay readable only by its owner.
 *   - `BandMember.viaInviteCode` records the code used to join. The rules check
 *     it against `inviteCodes/{code}`, which is what makes a regenerated code
 *     actually revoke old invite links.
 *   - `Task.bandId` / `.projectId` are denormalized so the dashboard can run one
 *     `collectionGroup("tasks")` query for "my open tasks" across all projects.
 */

/** Free-form and purely informational: "Gitarre", "Gesang", "Management". */
export type FunctionalRole = string;

/** Controls what a member may do. Never conflated with the functional role. */
export type PermissionRole = "admin" | "member" | "viewer";

export type MemberStatus = "active" | "invited";

export type ProjectStatus = "active" | "paused" | "done";

export type TaskStatus = "todo" | "in_progress" | "done";

export type TaskPriority = "low" | "medium" | "high";

export type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt: Date;
  bandIds: string[];
};

export type Band = {
  id: string;
  name: string;
  description: string;
  photoURL: string | null;
  createdAt: Date;
  createdBy: string;
  inviteCode: string;
  /**
   * One-way latch. False only during band creation, while the creator seeds
   * their own admin membership; the rules use it to close that window
   * permanently afterwards. See `firestore.rules`.
   */
  seeded: boolean;
};

export type BandMember = {
  /** Document id === the user's uid. */
  id: string;
  role: FunctionalRole;
  roleColor: string;
  joinedAt: Date;
  status: MemberStatus;
  permissionRole: PermissionRole;
  displayName: string;
  photoURL: string | null;
  viaInviteCode: string | null;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  color: string;
  createdAt: Date;
  createdBy: string;
  dueDate: Date | null;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedTo: string[];
  dueDate: Date | null;
  priority: TaskPriority;
  createdAt: Date;
  bandId: string;
  projectId: string;
};

export type TimeEntry = {
  id: string;
  userId: string;
  /** `null` when the entry is not assigned to a project. */
  projectId: string | null;
  taskId: string | null;
  description: string;
  startTime: Date;
  /** `null` while the timer is still running. */
  endTime: Date | null;
  /** Whole minutes; `null` while running. */
  duration: number | null;
  createdAt: Date;
};

/** Lists, stats, and filters: an entry with `projectId === null`. */
export const UNASSIGNED_PROJECT_LABEL = "Ohne Projekt";

/** Project picker idle option. Distinct from the list/stats label. */
export const UNASSIGNED_PROJECT_PICKER_LABEL = "Kein Projekt";

/** Leftover id whose project document was deleted. */
export const DELETED_PROJECT_LABEL = "Gelöschtes Projekt";

/** localStorage / filter / stats bucket key for unassigned entries. Not a Firestore id. */
export const UNASSIGNED_PROJECT_KEY = "__unassigned__";

/** Lookup document that lets a signed-out-of-the-band user resolve a code. */
export type InviteCode = {
  id: string;
  bandId: string;
  bandName: string;
  createdAt: Date;
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Aktiv",
  paused: "Pausiert",
  done: "Fertig",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Zu tun",
  in_progress: "In Arbeit",
  done: "Fertig",
};

export const TASK_STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
};

export const PERMISSION_ROLE_LABELS: Record<PermissionRole, string> = {
  admin: "Admin",
  member: "Mitglied",
  viewer: "Betrachter",
};

export const PERMISSION_ROLE_HINTS: Record<PermissionRole, string> = {
  admin: "Verwaltet Band, Mitglieder und Projekte.",
  member: "Trackt Zeit und bearbeitet Aufgaben.",
  viewer: "Sieht alles, ändert nichts.",
};

/** Suggestions only. The functional role is a free text field. */
export const FUNCTIONAL_ROLE_SUGGESTIONS = [
  "Gesang",
  "Gitarre",
  "Bass",
  "Schlagzeug",
  "Keyboard",
  "Produktion",
  "Management",
  "Booking",
] as const;
