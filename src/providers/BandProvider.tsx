"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useAuth } from "./AuthProvider";
import { useCollection, useDocument } from "@/hooks/useCollection";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { bandDoc, memberDoc, membersCol, userDoc } from "@/lib/firebase/paths";
import { removeBandFromUser } from "@/lib/data/users";
import * as perms from "@/lib/permissions";
import type { Band, BandMember, UserProfile } from "@/types/models";

const ACTIVE_BAND_KEY = "veritrack:activeBandId";

type BandContextValue = {
  profile: UserProfile | null;
  /** Bands the user belongs to, from `users/{uid}.bandIds`. */
  bandIds: string[];
  activeBandId: string | null;
  setActiveBandId: (bandId: string | null) => void;
  band: Band | null;
  /** The current user's member document in the active band. */
  member: BandMember | null;
  members: BandMember[];
  loading: boolean;
  /** True once auth and the profile have resolved and the user is in no band. */
  hasNoBand: boolean;
  can: {
    manageBand: boolean;
    manageMembers: boolean;
    createProject: boolean;
    editTask: boolean;
    trackTime: boolean;
    isAdmin: boolean;
    isViewer: boolean;
  };
};

const BandContext = createContext<BandContextValue | null>(null);

export function BandProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [storedBandId, setStoredBandId] = useLocalStorage(ACTIVE_BAND_KEY);

  const profileRef = useMemo(() => (user ? userDoc(user.uid) : null), [user]);
  const { data: profile, loading: profileLoading } = useDocument(profileRef);

  const bandIds = useMemo(() => profile?.bandIds ?? [], [profile]);

  /**
   * Derived, never stored: the stored id only wins if the user is still in that
   * band, otherwise fall back to their first one. Computing this during render
   * rather than repairing it in an effect means a stale stored id can never
   * cause a band-scoped query to run with the wrong id for one frame.
   */
  const activeBandId =
    storedBandId && bandIds.includes(storedBandId) ? storedBandId : (bandIds[0] ?? null);

  // Persist the resolved choice so the fallback survives the next reload.
  useEffect(() => {
    if (activeBandId && activeBandId !== storedBandId) setStoredBandId(activeBandId);
  }, [activeBandId, storedBandId, setStoredBandId]);

  const setActiveBandId = useCallback(
    (bandId: string | null) => setStoredBandId(bandId),
    [setStoredBandId],
  );

  const bandRef = useMemo(() => (activeBandId ? bandDoc(activeBandId) : null), [activeBandId]);
  const { data: band, loading: bandLoading } = useDocument(bandRef);

  const memberRef = useMemo(
    () => (activeBandId && user ? memberDoc(activeBandId, user.uid) : null),
    [activeBandId, user],
  );
  const { data: member, loading: memberLoading } = useDocument(memberRef);

  const membersQuery = useMemo(
    () => (activeBandId ? membersCol(activeBandId) : null),
    [activeBandId],
  );
  const { data: members } = useCollection(membersQuery);

  const loading =
    authLoading || (!!user && profileLoading) || bandLoading || memberLoading;

  const value = useMemo<BandContextValue>(
    () => ({
      profile,
      bandIds,
      activeBandId,
      setActiveBandId,
      band,
      member,
      members,
      loading,
      hasNoBand: !authLoading && !!user && !profileLoading && bandIds.length === 0,
      can: {
        manageBand: perms.canManageBand(member),
        manageMembers: perms.canManageMembers(member),
        createProject: perms.canCreateProject(member),
        editTask: perms.canEditTask(member),
        trackTime: perms.canTrackTime(member),
        isAdmin: perms.isAdmin(member),
        isViewer: perms.isViewer(member),
      },
    }),
    [
      profile,
      bandIds,
      activeBandId,
      setActiveBandId,
      band,
      member,
      members,
      loading,
      authLoading,
      user,
      profileLoading,
    ],
  );

  return (
    <BandContext.Provider value={value}>
      {user
        ? bandIds.map((id) => <StaleBandPruner key={id} userId={user.uid} bandId={id} />)
        : null}
      {children}
    </BandContext.Provider>
  );
}

/**
 * Drops a `bandIds` entry the user can no longer actually open.
 *
 * Kick / leave: the band still exists, but the get is permission-denied.
 * Delete: leftover member docs still satisfy `isMember`, so the get succeeds
 * with `exists() === false` and no error. Either way the id must leave the
 * profile; only this client can write `users/{uid}`.
 */
function StaleBandPruner({ userId, bandId }: { userId: string; bandId: string }) {
  const { data: band, loading, error } = useDocument(bandDoc(bandId));
  useEffect(() => {
    if (loading) return;
    const missing = !band && !error;
    const denied = error?.code === "permission-denied";
    if (!missing && !denied) return;
    void removeBandFromUser(userId, bandId).catch(() => {});
  }, [userId, bandId, band, loading, error]);
  return null;
}

export function useBand() {
  const ctx = useContext(BandContext);
  if (!ctx) throw new Error("useBand must be used inside <BandProvider>");
  return ctx;
}
