import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import {
  ADMIN,
  BAND_ID,
  ENTRY_OF_MEMBER,
  INVITE_CODE,
  MEMBER,
  PROJECT_ID_1,
  VIEWER,
  as,
  createTestEnv,
  seed,
} from "./helpers";

/**
 * Sequence attacks.
 *
 * The rest of the rules suite checks one operation at a time, which is exactly
 * why it missed these: each individual write is legitimate, and only the order
 * grants privileges the user was not meant to have.
 */

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

const memberRef = (db: ReturnType<typeof as>, uid: string) =>
  doc(db, "bands", BAND_ID, "members", uid);

const rejoinPayload = (permissionRole: string) => ({
  role: "Bass",
  roleColor: "role-2",
  joinedAt: new Date(),
  status: "active",
  permissionRole,
  displayName: "Zurück",
  photoURL: null,
  viaInviteCode: INVITE_CODE,
});

describe("a viewer cannot upgrade themselves by leaving and rejoining", () => {
  it("denies a viewer deleting their own membership", async () => {
    // Leaving is only for plain members. A viewer who could leave would simply
    // rejoin through the invite code as a member, undoing their demotion.
    await assertFails(deleteDoc(memberRef(as(env, VIEWER), VIEWER)));
  });

  it("denies a viewer overwriting their own document with a higher role", async () => {
    await assertFails(setDoc(memberRef(as(env, VIEWER), VIEWER), rejoinPayload("member")));
  });

  it("still lets a viewer read the band, invite code included", async () => {
    // Not a leak to fix: members legitimately see the code. It is the reason
    // rejoining must not be able to grant more than the user already had.
    await assertSucceeds(getDoc(doc(as(env, VIEWER), "bands", BAND_ID)));
  });
});

describe("a plain member may still leave and come back", () => {
  it("allows a member to leave", async () => {
    await assertSucceeds(deleteDoc(memberRef(as(env, MEMBER), MEMBER)));
  });

  it("allows that member to rejoin with a valid code, as a member", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await deleteDoc(doc(ctx.firestore(), "bands", BAND_ID, "members", MEMBER));
    });
    await assertSucceeds(setDoc(memberRef(as(env, MEMBER), MEMBER), rejoinPayload("member")));
  });

  it("denies that member rejoining as an admin", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await deleteDoc(doc(ctx.firestore(), "bands", BAND_ID, "members", MEMBER));
    });
    await assertFails(setDoc(memberRef(as(env, MEMBER), MEMBER), rejoinPayload("admin")));
  });
});

describe("the band creator has no permanent back door", () => {
  it("denies an admin deleting their own membership", async () => {
    // Otherwise the band can be left with no admin at all.
    await assertFails(deleteDoc(memberRef(as(env, ADMIN), ADMIN)));
  });

  it("denies the creator re-seeding themselves as admin after being demoted", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "bands", BAND_ID, "members", ADMIN),
        { permissionRole: "viewer" },
        { merge: true },
      );
    });
    await assertFails(
      setDoc(memberRef(as(env, ADMIN), ADMIN), { permissionRole: "admin" }, { merge: true }),
    );
  });

  it("denies the creator re-seeding themselves after being removed entirely", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await deleteDoc(doc(ctx.firestore(), "bands", BAND_ID, "members", ADMIN));
    });
    await assertFails(setDoc(memberRef(as(env, ADMIN), ADMIN), rejoinPayload("admin")));
  });
});

describe("an admin cannot change their own permission role", () => {
  it("denies self-demotion, which could leave the band adminless", async () => {
    await assertFails(
      updateDoc(memberRef(as(env, ADMIN), ADMIN), { permissionRole: "viewer" }),
    );
  });

  it("still allows an admin to change somebody else's permission role", async () => {
    await assertSucceeds(
      updateDoc(memberRef(as(env, ADMIN), MEMBER), { permissionRole: "viewer" }),
    );
  });

  it("still allows an admin to edit their own functional role", async () => {
    await assertSucceeds(updateDoc(memberRef(as(env, ADMIN), ADMIN), { role: "Mandoline" }));
  });

  it("denies self-demotion via updateDoc of own permissionRole (leftover)", async () => {
    await assertFails(
      updateDoc(memberRef(as(env, ADMIN), ADMIN), { permissionRole: "member" }),
    );
  });
});

const entryRef = (db: ReturnType<typeof as>, entryId: string) =>
  doc(db, "bands", BAND_ID, "timeEntries", entryId);
const payoutRef = (db: ReturnType<typeof as>, payoutId = "payout-1") =>
  doc(db, "bands", BAND_ID, "payouts", payoutId);

const unpaidOwnEntry = {
  userId: MEMBER,
  projectId: PROJECT_ID_1,
  taskId: null,
  description: "Probe",
  startTime: new Date("2026-08-01T18:00:00Z"),
  endTime: new Date("2026-08-01T20:00:00Z"),
  duration: 120,
  createdAt: new Date(),
};

async function seedPaidOwnEntry() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "bands", BAND_ID, "timeEntries", "paid-own"), {
      ...unpaidOwnEntry,
      payoutId: "payout-1",
    });
  });
}

async function seedPayoutDoc() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "bands", BAND_ID, "payouts", "payout-1"), {
      userId: MEMBER,
      minutes: 120,
      hourlyRateCents: 1250,
      amountCents: 2500,
      createdAt: new Date(),
      createdBy: ADMIN,
    });
  });
}

describe("a member cannot self-serve paid status", () => {
  it("denies a member stamping payoutId on their own unpaid entry", async () => {
    await assertFails(updateDoc(entryRef(as(env, MEMBER), ENTRY_OF_MEMBER), { payoutId: "payout-fake" }));
  });

  it("denies a member creating an entry already marked paid", async () => {
    await assertFails(
      setDoc(entryRef(as(env, MEMBER), "pre-paid"), {
        ...unpaidOwnEntry,
        payoutId: "payout-fake",
      }),
    );
  });

  it("denies a member clearing payoutId on a paid entry", async () => {
    await seedPaidOwnEntry();
    await assertFails(updateDoc(entryRef(as(env, MEMBER), "paid-own"), { payoutId: null }));
  });

  it("denies a member deleting a paid entry", async () => {
    await seedPaidOwnEntry();
    await assertFails(deleteDoc(entryRef(as(env, MEMBER), "paid-own")));
  });

  it("denies a member editing a paid entry", async () => {
    await seedPaidOwnEntry();
    await assertFails(updateDoc(entryRef(as(env, MEMBER), "paid-own"), { description: "x" }));
  });
});

describe("an admin stamp may only set payoutId", () => {
  it("denies stamping payoutId together with another field", async () => {
    await assertFails(
      updateDoc(entryRef(as(env, ADMIN), ENTRY_OF_MEMBER), { payoutId: "p-1", duration: 999 }),
    );
  });
});

describe("payouts are admin-only and immutable", () => {
  it("denies a viewer reading a payout document", async () => {
    await seedPayoutDoc();
    await assertFails(getDoc(payoutRef(as(env, VIEWER))));
  });

  it("denies a member reading a payout document", async () => {
    await seedPayoutDoc();
    await assertFails(getDoc(payoutRef(as(env, MEMBER))));
  });

  it("denies a viewer listing payouts", async () => {
    await seedPayoutDoc();
    await assertFails(getDocs(collection(as(env, VIEWER), "bands", BAND_ID, "payouts")));
  });

  it("denies a member listing payouts", async () => {
    await seedPayoutDoc();
    await assertFails(getDocs(collection(as(env, MEMBER), "bands", BAND_ID, "payouts")));
  });

  it("denies a member creating a payout document", async () => {
    await assertFails(
      setDoc(payoutRef(as(env, MEMBER)), {
        userId: MEMBER,
        minutes: 120,
        hourlyRateCents: 1250,
        amountCents: 2500,
        createdAt: new Date(),
        createdBy: MEMBER,
      }),
    );
  });
});
