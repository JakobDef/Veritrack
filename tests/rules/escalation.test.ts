import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ADMIN, BAND_ID, INVITE_CODE, MEMBER, VIEWER, as, createTestEnv, seed } from "./helpers";

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
});
