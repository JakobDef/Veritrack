import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import {
  ADMIN,
  BAND_ID,
  ENTRY_OF_ADMIN,
  ENTRY_OF_MEMBER,
  INVITE_CODE,
  MEMBER,
  OUTSIDER,
  PROJECT_ID_1,
  STALE_INVITE_CODE,
  TASK_ID_1,
  VIEWER,
  as,
  asAnonymous,
  createTestEnv,
  seed,
} from "./helpers";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createTestEnv();
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await seed(env);
});

const bandRef = (db: ReturnType<typeof as>) => doc(db, "bands", BAND_ID);
const memberRef = (db: ReturnType<typeof as>, uid: string) =>
  doc(db, "bands", BAND_ID, "members", uid);
const projectRef = (db: ReturnType<typeof as>) =>
  doc(db, "bands", BAND_ID, "projects", PROJECT_ID_1);
const taskRef = (db: ReturnType<typeof as>, taskId = TASK_ID_1) =>
  doc(db, "bands", BAND_ID, "projects", PROJECT_ID_1, "tasks", taskId);
const entryRef = (db: ReturnType<typeof as>, entryId: string) =>
  doc(db, "bands", BAND_ID, "timeEntries", entryId);
const payoutRef = (db: ReturnType<typeof as>, payoutId = "payout-1") =>
  doc(db, "bands", BAND_ID, "payouts", payoutId);

const payoutPayload = (createdBy: string) => ({
  userId: MEMBER,
  minutes: 120,
  hourlyRateCents: 1250,
  amountCents: 2500,
  createdAt: new Date(),
  createdBy,
});

describe("band reads", () => {
  it("denies an anonymous visitor", async () => {
    await assertFails(getDoc(bandRef(asAnonymous(env))));
  });

  it("denies a signed-in non-member", async () => {
    await assertFails(getDoc(bandRef(as(env, OUTSIDER))));
  });

  it("allows every active member, including a viewer", async () => {
    for (const uid of [ADMIN, MEMBER, VIEWER]) {
      await assertSucceeds(getDoc(bandRef(as(env, uid))));
    }
  });

  it("denies a non-member reading time entries", async () => {
    await assertFails(getDoc(entryRef(as(env, OUTSIDER), ENTRY_OF_MEMBER)));
  });

  it("lets a non-member read their own member document, which the join flow needs", async () => {
    await assertSucceeds(getDoc(memberRef(as(env, OUTSIDER), OUTSIDER)));
  });

  it("still denies a non-member reading somebody else's member document", async () => {
    await assertFails(getDoc(memberRef(as(env, OUTSIDER), MEMBER)));
  });
});

describe("band settings", () => {
  it("allows an admin to rename the band", async () => {
    await assertSucceeds(updateDoc(bandRef(as(env, ADMIN)), { name: "Neuer Name" }));
  });

  it("denies a member renaming the band", async () => {
    await assertFails(updateDoc(bandRef(as(env, MEMBER)), { name: "Gekapert" }));
  });

  it("denies a member deleting the band", async () => {
    await assertFails(deleteDoc(bandRef(as(env, MEMBER))));
  });

  it("denies rewriting createdBy, even as admin", async () => {
    await assertFails(updateDoc(bandRef(as(env, ADMIN)), { createdBy: MEMBER }));
  });

  it("allows an admin to set hourlyRateCents", async () => {
    await assertSucceeds(updateDoc(bandRef(as(env, ADMIN)), { hourlyRateCents: 1250 }));
  });

  it("denies a member setting hourlyRateCents", async () => {
    await assertFails(updateDoc(bandRef(as(env, MEMBER)), { hourlyRateCents: 1250 }));
  });

  it("denies flipping seeded back to false in the same write as a rate change", async () => {
    await assertFails(
      updateDoc(bandRef(as(env, ADMIN)), { hourlyRateCents: 1250, seeded: false }),
    );
  });
});

describe("projects", () => {
  it("allows an admin to create a project", async () => {
    await assertSucceeds(
      setDoc(doc(as(env, ADMIN), "bands", BAND_ID, "projects", "new-project"), {
        name: "Tour",
        description: "",
        status: "active",
        color: "role-3",
        createdAt: new Date(),
        createdBy: ADMIN,
        dueDate: null,
      }),
    );
  });

  it("denies a member creating a project", async () => {
    await assertFails(
      setDoc(doc(as(env, MEMBER), "bands", BAND_ID, "projects", "new-project"), {
        name: "Tour",
        description: "",
        status: "active",
        color: "role-3",
        createdAt: new Date(),
        createdBy: MEMBER,
        dueDate: null,
      }),
    );
  });

  it("denies a member deleting a project", async () => {
    await assertFails(deleteDoc(projectRef(as(env, MEMBER))));
  });

  it("allows an admin to delete a project", async () => {
    await assertSucceeds(deleteDoc(projectRef(as(env, ADMIN))));
  });
});

describe("tasks", () => {
  const newTask = (uid: string) => ({
    title: "Neue Aufgabe",
    description: "",
    status: "todo",
    assignedTo: [uid],
    dueDate: null,
    priority: "medium",
    createdAt: new Date(),
    bandId: BAND_ID,
    projectId: PROJECT_ID_1,
  });

  it("allows a member to create a task", async () => {
    await assertSucceeds(setDoc(taskRef(as(env, MEMBER), "task-new"), newTask(MEMBER)));
  });

  it("denies a viewer creating a task", async () => {
    await assertFails(setDoc(taskRef(as(env, VIEWER), "task-new"), newTask(VIEWER)));
  });

  it("denies a viewer moving a task between columns", async () => {
    await assertFails(updateDoc(taskRef(as(env, VIEWER)), { status: "done" }));
  });

  it("allows a member to move a task", async () => {
    await assertSucceeds(updateDoc(taskRef(as(env, MEMBER)), { status: "in_progress" }));
  });

  it("denies re-pointing a task at another band", async () => {
    await assertFails(updateDoc(taskRef(as(env, MEMBER)), { bandId: "band-2" }));
  });

  it("denies a task claiming a bandId it was not created under", async () => {
    await assertFails(
      setDoc(taskRef(as(env, MEMBER), "task-forged"), { ...newTask(MEMBER), bandId: "band-2" }),
    );
  });
});

describe("time entries", () => {
  it("allows a member to edit their own entry", async () => {
    await assertSucceeds(
      updateDoc(entryRef(as(env, MEMBER), ENTRY_OF_MEMBER), { description: "Korrigiert" }),
    );
  });

  it("denies a member editing another member's entry", async () => {
    await assertFails(
      updateDoc(entryRef(as(env, MEMBER), ENTRY_OF_ADMIN), { description: "Fremd" }),
    );
  });

  it("allows an admin to edit any entry", async () => {
    await assertSucceeds(
      updateDoc(entryRef(as(env, ADMIN), ENTRY_OF_MEMBER), { description: "Admin-Korrektur" }),
    );
  });

  it("denies reassigning an entry to another user", async () => {
    await assertFails(updateDoc(entryRef(as(env, ADMIN), ENTRY_OF_MEMBER), { userId: ADMIN }));
  });

  it("denies a member deleting another member's entry", async () => {
    await assertFails(deleteDoc(entryRef(as(env, MEMBER), ENTRY_OF_ADMIN)));
  });

  it("allows a member to delete their own entry", async () => {
    await assertSucceeds(deleteDoc(entryRef(as(env, MEMBER), ENTRY_OF_MEMBER)));
  });

  it("denies creating an entry on behalf of someone else", async () => {
    await assertFails(
      setDoc(entryRef(as(env, MEMBER), "forged"), {
        userId: ADMIN,
        projectId: PROJECT_ID_1,
        taskId: null,
        description: "",
        startTime: new Date(),
        endTime: null,
        duration: null,
        createdAt: new Date(),
      }),
    );
  });

  it("denies a viewer tracking time at all", async () => {
    await assertFails(
      setDoc(entryRef(as(env, VIEWER), "viewer-entry"), {
        userId: VIEWER,
        projectId: PROJECT_ID_1,
        taskId: null,
        description: "",
        startTime: new Date(),
        endTime: null,
        duration: null,
        createdAt: new Date(),
      }),
    );
  });

  it("allows an admin to stamp payoutId on an unpaid completed entry", async () => {
    await assertSucceeds(
      updateDoc(entryRef(as(env, ADMIN), ENTRY_OF_MEMBER), { payoutId: "p-1" }),
    );
  });

  it("denies an admin stamping payoutId on a running entry", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "bands", BAND_ID, "timeEntries", "running"), {
        userId: MEMBER,
        projectId: PROJECT_ID_1,
        taskId: null,
        description: "Läuft",
        startTime: new Date(),
        endTime: null,
        duration: null,
        createdAt: new Date(),
      });
    });
    await assertFails(updateDoc(entryRef(as(env, ADMIN), "running"), { payoutId: "p-1" }));
  });

  it("still allows an admin to edit the description of an unpaid entry", async () => {
    await assertSucceeds(
      updateDoc(entryRef(as(env, ADMIN), ENTRY_OF_MEMBER), { description: "Unbezahlt ok" }),
    );
  });

  it("still allows a member to edit and delete their own unpaid entry", async () => {
    await assertSucceeds(
      updateDoc(entryRef(as(env, MEMBER), ENTRY_OF_MEMBER), { description: "Unbezahlt eigen" }),
    );
    await assertSucceeds(deleteDoc(entryRef(as(env, MEMBER), ENTRY_OF_MEMBER)));
  });

  it("denies an admin deleting a paid entry", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "bands", BAND_ID, "timeEntries", "paid-admin"), {
        userId: MEMBER,
        projectId: PROJECT_ID_1,
        taskId: null,
        description: "Bezahlt",
        startTime: new Date("2026-08-01T18:00:00Z"),
        endTime: new Date("2026-08-01T20:00:00Z"),
        duration: 120,
        createdAt: new Date(),
        payoutId: "p-1",
      });
    });
    await assertFails(deleteDoc(entryRef(as(env, ADMIN), "paid-admin")));
  });

  it("allows an admin to delete an unpaid entry", async () => {
    await assertSucceeds(deleteDoc(entryRef(as(env, ADMIN), ENTRY_OF_MEMBER)));
  });
});

describe("payouts", () => {
  it("allows an admin to create a payout with createdBy matching auth.uid", async () => {
    await assertSucceeds(setDoc(payoutRef(as(env, ADMIN)), payoutPayload(ADMIN)));
  });

  it("denies payout update even for an admin", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "bands", BAND_ID, "payouts", "payout-1"), payoutPayload(ADMIN));
    });
    await assertFails(updateDoc(payoutRef(as(env, ADMIN)), { amountCents: 1 }));
  });

  it("denies payout delete even for an admin", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "bands", BAND_ID, "payouts", "payout-1"), payoutPayload(ADMIN));
    });
    await assertFails(deleteDoc(payoutRef(as(env, ADMIN))));
  });

  it("allows an admin to get and list payouts", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "bands", BAND_ID, "payouts", "payout-1"), payoutPayload(ADMIN));
    });
    await assertSucceeds(getDoc(payoutRef(as(env, ADMIN))));
    await assertSucceeds(getDocs(collection(as(env, ADMIN), "bands", BAND_ID, "payouts")));
  });
});

describe("member management", () => {
  it("allows an admin to change someone's permission role", async () => {
    await assertSucceeds(updateDoc(memberRef(as(env, ADMIN), MEMBER), { permissionRole: "viewer" }));
  });

  it("denies a member promoting themselves to admin", async () => {
    await assertFails(updateDoc(memberRef(as(env, MEMBER), MEMBER), { permissionRole: "admin" }));
  });

  it("denies a member changing someone else's functional role", async () => {
    await assertFails(updateDoc(memberRef(as(env, MEMBER), VIEWER), { role: "Triangel" }));
  });

  it("allows a member to change their own functional role and color", async () => {
    await assertSucceeds(
      updateDoc(memberRef(as(env, MEMBER), MEMBER), { role: "Percussion", roleColor: "role-5" }),
    );
  });

  it("denies a member reactivating themselves after being set to invited", async () => {
    await assertFails(updateDoc(memberRef(as(env, MEMBER), MEMBER), { status: "invited" }));
  });

  it("allows an admin to remove a member", async () => {
    await assertSucceeds(deleteDoc(memberRef(as(env, ADMIN), MEMBER)));
  });

  it("denies a member removing another member", async () => {
    await assertFails(deleteDoc(memberRef(as(env, MEMBER), VIEWER)));
  });

  it("allows a member to leave on their own", async () => {
    await assertSucceeds(deleteDoc(memberRef(as(env, MEMBER), MEMBER)));
  });
});

describe("joining by invite code", () => {
  const joinPayload = (code: string | null, permissionRole = "member") => ({
    role: "Bass",
    roleColor: "role-4",
    joinedAt: new Date(),
    status: "active",
    permissionRole,
    displayName: "Neuling",
    photoURL: null,
    viaInviteCode: code,
  });

  it("allows an outsider holding a valid code to join as a member", async () => {
    await assertSucceeds(
      setDoc(memberRef(as(env, OUTSIDER), OUTSIDER), joinPayload(INVITE_CODE)),
    );
  });

  it("denies joining without a code", async () => {
    await assertFails(setDoc(memberRef(as(env, OUTSIDER), OUTSIDER), joinPayload(null)));
  });

  it("denies joining with a made-up code", async () => {
    await assertFails(setDoc(memberRef(as(env, OUTSIDER), OUTSIDER), joinPayload("NOPE1234")));
  });

  it("denies joining with a code that belongs to a different band", async () => {
    await assertFails(
      setDoc(memberRef(as(env, OUTSIDER), OUTSIDER), joinPayload(STALE_INVITE_CODE)),
    );
  });

  it("denies a joiner granting themselves admin", async () => {
    await assertFails(
      setDoc(memberRef(as(env, OUTSIDER), OUTSIDER), joinPayload(INVITE_CODE, "admin")),
    );
  });

  it("denies creating a member document for somebody else", async () => {
    await assertFails(setDoc(memberRef(as(env, OUTSIDER), "someone-else"), joinPayload(INVITE_CODE)));
  });

  it("lets any signed-in user resolve a single code but never list them", async () => {
    await assertSucceeds(getDoc(doc(as(env, OUTSIDER), "inviteCodes", INVITE_CODE)));
    await assertFails(getDoc(doc(asAnonymous(env), "inviteCodes", INVITE_CODE)));
  });

  it("denies a member revoking an invite code", async () => {
    await assertFails(deleteDoc(doc(as(env, MEMBER), "inviteCodes", INVITE_CODE)));
  });

  it("allows an admin to revoke an invite code", async () => {
    await assertSucceeds(deleteDoc(doc(as(env, ADMIN), "inviteCodes", INVITE_CODE)));
  });
});

describe("user profiles", () => {
  it("allows a user to read and write their own profile", async () => {
    await assertSucceeds(
      setDoc(doc(as(env, MEMBER), "users", MEMBER), {
        displayName: "Member",
        email: "m@example.com",
        photoURL: null,
        createdAt: new Date(),
        bandIds: [BAND_ID],
      }),
    );
    await assertSucceeds(getDoc(doc(as(env, MEMBER), "users", MEMBER)));
  });

  it("denies reading someone else's profile", async () => {
    await assertFails(getDoc(doc(as(env, MEMBER), "users", ADMIN)));
  });
});
