import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, type Firestore } from "firebase/firestore";

export const PROJECT_ID = "demo-veritrack";

export const BAND_ID = "band-1";
export const OTHER_BAND_ID = "band-2";
export const PROJECT_ID_1 = "project-1";
export const TASK_ID_1 = "task-1";
export const INVITE_CODE = "SUNRAY42";
export const STALE_INVITE_CODE = "OLDCODE1";

export const ADMIN = "user-admin";
export const MEMBER = "user-member";
export const VIEWER = "user-viewer";
export const OUTSIDER = "user-outsider";

export const ENTRY_OF_MEMBER = "entry-member";
export const ENTRY_OF_ADMIN = "entry-admin";

export async function createTestEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
}

/**
 * Writes the fixture graph with rules disabled: one band containing an admin, a
 * member and a viewer, one project with one task, and one time entry per
 * writing user. `OUTSIDER` belongs to no band.
 */
export async function seed(env: RulesTestEnvironment) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore;

    await setDoc(doc(db, "bands", BAND_ID), {
      name: "Testband",
      description: "",
      photoURL: null,
      createdAt: new Date(),
      createdBy: ADMIN,
      inviteCode: INVITE_CODE,
    });

    await setDoc(doc(db, "inviteCodes", INVITE_CODE), {
      bandId: BAND_ID,
      bandName: "Testband",
      createdAt: new Date(),
    });

    // Points at a different band: proves the rules check the code resolves to
    // *this* band, not merely that some code exists.
    await setDoc(doc(db, "inviteCodes", STALE_INVITE_CODE), {
      bandId: OTHER_BAND_ID,
      bandName: "Fremdband",
      createdAt: new Date(),
    });

    const members: [string, string, string][] = [
      [ADMIN, "admin", "Gitarre"],
      [MEMBER, "member", "Schlagzeug"],
      [VIEWER, "viewer", "Management"],
    ];
    for (const [uid, permissionRole, role] of members) {
      await setDoc(doc(db, "bands", BAND_ID, "members", uid), {
        role,
        roleColor: "role-1",
        joinedAt: new Date(),
        status: "active",
        permissionRole,
        displayName: uid,
        photoURL: null,
        viaInviteCode: null,
      });
    }

    await setDoc(doc(db, "bands", BAND_ID, "projects", PROJECT_ID_1), {
      name: "Album",
      description: "",
      status: "active",
      color: "role-2",
      createdAt: new Date(),
      createdBy: ADMIN,
      dueDate: null,
    });

    await setDoc(doc(db, "bands", BAND_ID, "projects", PROJECT_ID_1, "tasks", TASK_ID_1), {
      title: "Drums einspielen",
      description: "",
      status: "todo",
      assignedTo: [MEMBER],
      dueDate: null,
      priority: "medium",
      createdAt: new Date(),
      bandId: BAND_ID,
      projectId: PROJECT_ID_1,
    });

    for (const [entryId, uid] of [
      [ENTRY_OF_MEMBER, MEMBER],
      [ENTRY_OF_ADMIN, ADMIN],
    ] as const) {
      await setDoc(doc(db, "bands", BAND_ID, "timeEntries", entryId), {
        userId: uid,
        projectId: PROJECT_ID_1,
        taskId: null,
        description: "Probe",
        startTime: new Date("2026-08-01T18:00:00Z"),
        endTime: new Date("2026-08-01T20:00:00Z"),
        duration: 120,
        createdAt: new Date(),
      });
    }
  });
}

/** Firestore handle acting as the given uid, typed for the modular SDK. */
export function as(env: RulesTestEnvironment, uid: string): Firestore {
  return env.authenticatedContext(uid).firestore() as unknown as Firestore;
}

export function asAnonymous(env: RulesTestEnvironment): Firestore {
  return env.unauthenticatedContext().firestore() as unknown as Firestore;
}
