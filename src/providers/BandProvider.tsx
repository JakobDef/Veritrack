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
  const { data: band, loading: bandLoading, error: bandError } = useDocument(bandRef);

  /**
   * Self-heal a stale `bandIds` entry.
   *
   * Removing a member deletes their member document, but the remover cannot
   * write to somebody else's user profile (the rules deny it, correctly), so
   * the removed user's `bandIds` still lists the band. Reading it then fails
   * with permission-denied and the app would otherwise sit on an empty shell
   * naming a band the user can no longer see, with no way out. The affected
   * client is the only one allowed to fix its own profile, so it does.
   */
  useEffect(() => {
    if (!user || !activeBandId) return;
    if (bandError?.code !== "permission-denied") return;
    void removeBandFromUser(user.uid, activeBandId).catch(() => {});
  }, [user, activeBandId, bandError]);

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

  return <BandContext.Provider value={value}>{children}</BandContext.Provider>;
}

export function useBand() {
  const ctx = useContext(BandContext);
  if (!ctx) throw new Error("useBand must be used inside <BandProvider>");
  return ctx;
}
