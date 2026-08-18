import { collection, collectionGroup, doc } from "firebase/firestore";
import { db } from "./client";
import {
  bandConverter,
  inviteCodeConverter,
  memberConverter,
  payoutConverter,
  projectConverter,
  taskConverter,
  timeEntryConverter,
  userConverter,
} from "./converters";

/**
 * Every Firestore path in the app is built here. No string-concatenated paths
 * anywhere else: a typo in a collection name is otherwise a silent no-op that
 * only shows up as an empty list.
 */

export const usersCol = () => collection(db, "users").withConverter(userConverter);
export const userDoc = (userId: string) => doc(db, "users", userId).withConverter(userConverter);

export const bandsCol = () => collection(db, "bands").withConverter(bandConverter);
export const bandDoc = (bandId: string) => doc(db, "bands", bandId).withConverter(bandConverter);

export const inviteCodesCol = () =>
  collection(db, "inviteCodes").withConverter(inviteCodeConverter);
export const inviteCodeDoc = (code: string) =>
  doc(db, "inviteCodes", code).withConverter(inviteCodeConverter);

export const membersCol = (bandId: string) =>
  collection(db, "bands", bandId, "members").withConverter(memberConverter);
export const memberDoc = (bandId: string, userId: string) =>
  doc(db, "bands", bandId, "members", userId).withConverter(memberConverter);

export const projectsCol = (bandId: string) =>
  collection(db, "bands", bandId, "projects").withConverter(projectConverter);
export const projectDoc = (bandId: string, projectId: string) =>
  doc(db, "bands", bandId, "projects", projectId).withConverter(projectConverter);

export const tasksCol = (bandId: string, projectId: string) =>
  collection(db, "bands", bandId, "projects", projectId, "tasks").withConverter(taskConverter);
export const taskDoc = (bandId: string, projectId: string, taskId: string) =>
  doc(db, "bands", bandId, "projects", projectId, "tasks", taskId).withConverter(taskConverter);

/** Spans every project in every band; always filter by `bandId`. */
export const allTasksGroup = () => collectionGroup(db, "tasks").withConverter(taskConverter);

export const timeEntriesCol = (bandId: string) =>
  collection(db, "bands", bandId, "timeEntries").withConverter(timeEntryConverter);
export const timeEntryDoc = (bandId: string, entryId: string) =>
  doc(db, "bands", bandId, "timeEntries", entryId).withConverter(timeEntryConverter);

export const payoutsCol = (bandId: string) =>
  collection(db, "bands", bandId, "payouts").withConverter(payoutConverter);
export const payoutDoc = (bandId: string, payoutId: string) =>
  doc(db, "bands", bandId, "payouts", payoutId).withConverter(payoutConverter);
