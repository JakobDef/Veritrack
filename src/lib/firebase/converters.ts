import {
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from "firebase/firestore";
import type {
  Band,
  BandMember,
  InviteCode,
  MemberStatus,
  PermissionRole,
  Payout,
  Project,
  ProjectStatus,
  Task,
  TaskPriority,
  TaskStatus,
  TimeEntry,
  UserProfile,
} from "@/types/models";

/**
 * Converters map Firestore `Timestamp` to `Date` on read and strip the `id`
 * field on write (the id is the document key, storing it again would let the
 * two drift apart).
 *
 * `serverTimestamp()` resolves to `null` in the local echo of a write before
 * the server responds, so every date read goes through `toDate`, which falls
 * back to "now". Without that the UI briefly renders "Invalid Date" on the very
 * document the user just created.
 */

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date();
}

function toDateOrNull(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function int(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Drop `id` before writing; it lives in the document key. */
function stripId<T extends { id?: string }>(data: T): DocumentData {
  const { id: _id, ...rest } = data;
  void _id;
  return rest as DocumentData;
}

export const userConverter: FirestoreDataConverter<UserProfile> = {
  toFirestore: stripId,
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): UserProfile {
    const d = snap.data(options);
    return {
      id: snap.id,
      displayName: str(d.displayName, "Unbenannt"),
      email: str(d.email),
      photoURL: strOrNull(d.photoURL),
      createdAt: toDate(d.createdAt),
      bandIds: Array.isArray(d.bandIds) ? d.bandIds.filter((v): v is string => typeof v === "string") : [],
    };
  },
};

export const bandConverter: FirestoreDataConverter<Band> = {
  toFirestore: stripId,
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): Band {
    const d = snap.data(options);
    return {
      id: snap.id,
      name: str(d.name, "Unbenannte Band"),
      description: str(d.description),
      photoURL: strOrNull(d.photoURL),
      createdAt: toDate(d.createdAt),
      createdBy: str(d.createdBy),
      inviteCode: str(d.inviteCode),
      seeded: d.seeded === true,
      hourlyRateCents: int(d.hourlyRateCents, 0),
    };
  },
};

const PERMISSION_ROLES: PermissionRole[] = ["admin", "member", "viewer"];
const MEMBER_STATUSES: MemberStatus[] = ["active", "invited"];

export const memberConverter: FirestoreDataConverter<BandMember> = {
  toFirestore: stripId,
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): BandMember {
    const d = snap.data(options);
    const permissionRole = PERMISSION_ROLES.includes(d.permissionRole)
      ? (d.permissionRole as PermissionRole)
      : "member";
    const status = MEMBER_STATUSES.includes(d.status) ? (d.status as MemberStatus) : "active";
    return {
      id: snap.id,
      role: str(d.role),
      roleColor: str(d.roleColor),
      joinedAt: toDate(d.joinedAt),
      status,
      permissionRole,
      displayName: str(d.displayName, "Unbenannt"),
      photoURL: strOrNull(d.photoURL),
      viaInviteCode: strOrNull(d.viaInviteCode),
    };
  },
};

const PROJECT_STATUSES: ProjectStatus[] = ["active", "paused", "done"];

export const projectConverter: FirestoreDataConverter<Project> = {
  toFirestore: stripId,
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): Project {
    const d = snap.data(options);
    return {
      id: snap.id,
      name: str(d.name, "Unbenanntes Projekt"),
      description: str(d.description),
      status: PROJECT_STATUSES.includes(d.status) ? (d.status as ProjectStatus) : "active",
      color: str(d.color, "role-1"),
      createdAt: toDate(d.createdAt),
      createdBy: str(d.createdBy),
      dueDate: toDateOrNull(d.dueDate),
    };
  },
};

const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];
const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

export const taskConverter: FirestoreDataConverter<Task> = {
  toFirestore: stripId,
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): Task {
    const d = snap.data(options);
    return {
      id: snap.id,
      title: str(d.title, "Ohne Titel"),
      description: str(d.description),
      status: TASK_STATUSES.includes(d.status) ? (d.status as TaskStatus) : "todo",
      assignedTo: Array.isArray(d.assignedTo)
        ? d.assignedTo.filter((v): v is string => typeof v === "string")
        : [],
      dueDate: toDateOrNull(d.dueDate),
      priority: TASK_PRIORITIES.includes(d.priority) ? (d.priority as TaskPriority) : "medium",
      createdAt: toDate(d.createdAt),
      bandId: str(d.bandId),
      projectId: str(d.projectId),
    };
  },
};

export const timeEntryConverter: FirestoreDataConverter<TimeEntry> = {
  toFirestore: stripId,
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): TimeEntry {
    const d = snap.data(options);
    return {
      id: snap.id,
      userId: str(d.userId),
      projectId: strOrNull(d.projectId),
      taskId: strOrNull(d.taskId),
      description: str(d.description),
      startTime: toDate(d.startTime),
      endTime: toDateOrNull(d.endTime),
      duration: typeof d.duration === "number" ? d.duration : null,
      createdAt: toDate(d.createdAt),
      payoutId: strOrNull(d.payoutId),
    };
  },
};

export const payoutConverter: FirestoreDataConverter<Payout> = {
  toFirestore: stripId,
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): Payout {
    const d = snap.data(options);
    return {
      id: snap.id,
      userId: str(d.userId),
      minutes: int(d.minutes),
      hourlyRateCents: int(d.hourlyRateCents),
      amountCents: int(d.amountCents),
      createdAt: toDate(d.createdAt),
      createdBy: str(d.createdBy),
    };
  },
};

export const inviteCodeConverter: FirestoreDataConverter<InviteCode> = {
  toFirestore: stripId,
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): InviteCode {
    const d = snap.data(options);
    return {
      id: snap.id,
      bandId: str(d.bandId),
      bandName: str(d.bandName),
      createdAt: toDate(d.createdAt),
    };
  },
};
