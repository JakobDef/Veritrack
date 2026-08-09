import type { BandMember, TimeEntry } from "@/types/models";

/**
 * Client-side mirror of `firestore.rules`.
 *
 * This exists to hide affordances the server would reject anyway. It is NOT a
 * security boundary: the rules are. Any change here must be made in
 * `firestore.rules` too, and `tests/unit/permissions.test.ts` asserts the same
 * allow/deny matrix as `tests/rules/firestore.rules.test.ts` so the two cannot
 * quietly drift apart.
 *
 * `member` is null when the current user is not (yet) part of the band.
 */

type Member = Pick<BandMember, "id" | "permissionRole" | "status"> | null | undefined;

function isActive(member: Member): member is NonNullable<Member> {
  return !!member && member.status === "active";
}

export function isAdmin(member: Member): boolean {
  return isActive(member) && member.permissionRole === "admin";
}

/** Admin or member. Viewers are strictly read-only. */
export function canWrite(member: Member): boolean {
  return isActive(member) && (member.permissionRole === "admin" || member.permissionRole === "member");
}

export function isViewer(member: Member): boolean {
  return isActive(member) && member.permissionRole === "viewer";
}

export function canReadBand(member: Member): boolean {
  return isActive(member);
}

/** Band name, description, photo, invite-code regeneration, deletion. */
export function canManageBand(member: Member): boolean {
  return isAdmin(member);
}

/** Invite, remove, change someone's permission role. */
export function canManageMembers(member: Member): boolean {
  return isAdmin(member);
}

export function canCreateProject(member: Member): boolean {
  return isAdmin(member);
}

export function canEditProject(member: Member): boolean {
  return isAdmin(member);
}

export function canDeleteProject(member: Member): boolean {
  return isAdmin(member);
}

export function canEditTask(member: Member): boolean {
  return canWrite(member);
}

export function canTrackTime(member: Member): boolean {
  return canWrite(member);
}

/** Own entries always; an admin may correct anyone's. */
export function canEditTimeEntry(
  entry: Pick<TimeEntry, "userId">,
  member: Member,
): boolean {
  if (!isActive(member)) return false;
  if (isAdmin(member)) return true;
  return canWrite(member) && entry.userId === member.id;
}

/** Members may edit their own functional role and color; admins may edit anyone's. */
export function canEditFunctionalRole(targetUserId: string, member: Member): boolean {
  if (!isActive(member)) return false;
  return isAdmin(member) || member.id === targetUserId;
}

/** Nobody may change their own permission role, not even an admin. */
export function canEditPermissionRole(targetUserId: string, member: Member): boolean {
  return isAdmin(member) && member!.id !== targetUserId;
}

/**
 * Admins remove others. Leaving on your own is limited to plain members: a
 * viewer who could leave would rejoin through the invite code as a member and
 * undo their own demotion, and an admin who could leave could strand the band
 * with nobody able to manage it. Both cases go through an admin instead.
 */
export function canRemoveMember(targetUserId: string, member: Member): boolean {
  if (!isActive(member)) return false;
  if (member.id === targetUserId) return member.permissionRole === "member";
  return isAdmin(member);
}

/** Whether the current user may walk out of the band unaided. */
export function canLeaveBand(member: Member): boolean {
  return isActive(member) && member.permissionRole === "member";
}
