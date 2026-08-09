import { describe, expect, it } from "vitest";
import {
  canCreateProject,
  canDeleteProject,
  canEditFunctionalRole,
  canEditPermissionRole,
  canEditTask,
  canEditTimeEntry,
  canManageBand,
  canManageMembers,
  canReadBand,
  canRemoveMember,
  canTrackTime,
  canWrite,
  isAdmin,
  isViewer,
} from "@/lib/permissions";
import type { BandMember, PermissionRole } from "@/types/models";

/**
 * Mirrors the matrix asserted in tests/rules/firestore.rules.test.ts. If a case
 * here disagrees with the rules test, one of the two is wrong: fix both.
 */

function member(
  id: string,
  permissionRole: PermissionRole,
  status: BandMember["status"] = "active",
) {
  return { id, permissionRole, status };
}

const admin = member("admin", "admin");
const plain = member("member", "member");
const viewer = member("viewer", "viewer");
const invited = member("invited", "member", "invited");

describe("role predicates", () => {
  it("separates admin from the rest", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(plain)).toBe(false);
    expect(isAdmin(viewer)).toBe(false);
  });

  it("treats admin and member as writers, viewer as read-only", () => {
    expect(canWrite(admin)).toBe(true);
    expect(canWrite(plain)).toBe(true);
    expect(canWrite(viewer)).toBe(false);
    expect(isViewer(viewer)).toBe(true);
  });

  it("denies everything to a non-member", () => {
    for (const subject of [null, undefined]) {
      expect(canReadBand(subject)).toBe(false);
      expect(canWrite(subject)).toBe(false);
      expect(isAdmin(subject)).toBe(false);
      expect(canTrackTime(subject)).toBe(false);
    }
  });

  it("treats a merely invited member as inactive", () => {
    expect(canReadBand(invited)).toBe(false);
    expect(canWrite(invited)).toBe(false);
    expect(canTrackTime(invited)).toBe(false);
  });
});

describe("band and project management is admin-only", () => {
  it.each([
    ["admin", admin, true],
    ["member", plain, false],
    ["viewer", viewer, false],
  ] as const)("%s", (_label, subject, expected) => {
    expect(canManageBand(subject)).toBe(expected);
    expect(canManageMembers(subject)).toBe(expected);
    expect(canCreateProject(subject)).toBe(expected);
    expect(canDeleteProject(subject)).toBe(expected);
  });
});

describe("tasks", () => {
  it("lets admins and members edit, viewers not", () => {
    expect(canEditTask(admin)).toBe(true);
    expect(canEditTask(plain)).toBe(true);
    expect(canEditTask(viewer)).toBe(false);
  });
});

describe("time entries", () => {
  const ownEntry = { userId: "member" };
  const foreignEntry = { userId: "someone-else" };

  it("lets a member edit their own entry only", () => {
    expect(canEditTimeEntry(ownEntry, plain)).toBe(true);
    expect(canEditTimeEntry(foreignEntry, plain)).toBe(false);
  });

  it("lets an admin edit anyone's entry", () => {
    expect(canEditTimeEntry(ownEntry, admin)).toBe(true);
    expect(canEditTimeEntry(foreignEntry, admin)).toBe(true);
  });

  it("denies a viewer editing even an entry carrying their own uid", () => {
    expect(canEditTimeEntry({ userId: "viewer" }, viewer)).toBe(false);
  });
});

describe("the two role concepts stay separate", () => {
  it("lets a member change their own functional role but not their permission role", () => {
    expect(canEditFunctionalRole("member", plain)).toBe(true);
    expect(canEditPermissionRole("member", plain)).toBe(false);
  });

  it("denies a member changing someone else's functional role", () => {
    expect(canEditFunctionalRole("viewer", plain)).toBe(false);
  });

  it("lets an admin change anyone's functional role", () => {
    expect(canEditFunctionalRole("member", admin)).toBe(true);
    expect(canEditFunctionalRole("viewer", admin)).toBe(true);
  });

  it("stops an admin demoting themselves, which would risk an admin-less band", () => {
    expect(canEditPermissionRole("admin", admin)).toBe(false);
    expect(canEditPermissionRole("member", admin)).toBe(true);
  });
});

describe("removing members", () => {
  it("lets an admin remove anyone", () => {
    expect(canRemoveMember("member", admin)).toBe(true);
  });

  it("lets anyone leave on their own", () => {
    expect(canRemoveMember("member", plain)).toBe(true);
    expect(canRemoveMember("viewer", viewer)).toBe(true);
  });

  it("denies removing somebody else without admin", () => {
    expect(canRemoveMember("viewer", plain)).toBe(false);
  });
});
