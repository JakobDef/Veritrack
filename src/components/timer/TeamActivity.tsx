"use client";

import { useMemo } from "react";
import { Radio } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { useProjects } from "@/hooks/useProjects";
import { useTeamRunningTimers } from "@/hooks/useRunningTimer";
import { formatClock } from "@/lib/time";
import { roleColorVar } from "@/lib/roleColors";

/** Who else is tracking right now, updated live through onSnapshot. */
export function TeamActivity() {
  const { user } = useAuth();
  const { activeBandId, members } = useBand();
  const { byId } = useProjects(activeBandId);
  const { entries, loading } = useTeamRunningTimers(activeBandId);

  const memberById = useMemo(() => {
    const map = new Map(members.map((member) => [member.id, member]));
    return map;
  }, [members]);

  const others = entries.filter(({ entry }) => entry.userId !== user?.uid);

  if (loading) return <SkeletonList rows={2} />;

  if (others.length === 0) {
    return (
      <EmptyState
        compact
        icon={Radio}
        title="Gerade niemand sonst aktiv"
        description="Laufende Timer der Band tauchen hier automatisch auf."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {others.map(({ entry, elapsed }) => {
        const member = memberById.get(entry.userId);
        const project = byId.get(entry.projectId);
        const color = roleColorVar(member?.roleColor);
        return (
          <li
            key={entry.id}
            className="hover:bg-surface-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
          >
            <Avatar
              name={member?.displayName}
              src={member?.photoURL}
              color={color}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{member?.displayName ?? "Unbekannt"}</p>
              <p className="text-muted truncate text-xs">{project?.name ?? "Projekt"}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5">
              <span
                className="animate-live size-1.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="tabular text-muted font-mono text-xs">{formatClock(elapsed)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
