import { describe, expect, it } from "vitest";
import {
  deltaPercent,
  projectProgress,
  seriesByDay,
  totalMinutes,
  totalsByFunctionalRole,
  totalsByMember,
  totalsByProject,
} from "@/lib/stats";
import type { TimeEntry } from "@/types/models";

const color = (key: string) => (key ? `var(--vt-${key})` : "var(--vt-faint)");

function entry(partial: Partial<TimeEntry> & { userId: string; projectId: string | null }): TimeEntry {
  return {
    id: Math.random().toString(36).slice(2),
    taskId: null,
    description: "",
    startTime: new Date(2026, 7, 9, 18, 0),
    endTime: new Date(2026, 7, 9, 20, 0),
    duration: 120,
    createdAt: new Date(),
    payoutId: null,
    ...partial,
  };
}

const members = [
  { id: "u1", displayName: "Michi", role: "Gitarre", roleColor: "role-1" },
  { id: "u2", displayName: "Lena", role: "Bass", roleColor: "role-4" },
  { id: "u3", displayName: "Tom", role: "Gitarre", roleColor: "role-6" },
];

const projects = [
  { id: "p1", name: "Album", color: "role-2" },
  { id: "p2", name: "Tour", color: "role-5" },
];

describe("totalMinutes", () => {
  it("sums durations", () => {
    expect(totalMinutes([entry({ userId: "u1", projectId: "p1" })])).toBe(120);
  });

  it("is zero for no entries", () => {
    expect(totalMinutes([])).toBe(0);
  });

  it("counts a still-running entry as zero rather than guessing", () => {
    const running = entry({ userId: "u1", projectId: "p1", endTime: null, duration: null });
    expect(totalMinutes([running])).toBe(0);
  });
});

describe("totalsByMember", () => {
  it("returns nothing for empty input", () => {
    expect(totalsByMember([], members, color)).toEqual([]);
  });

  it("sums per member and sorts by time descending", () => {
    const result = totalsByMember(
      [
        entry({ userId: "u1", projectId: "p1", duration: 60 }),
        entry({ userId: "u1", projectId: "p2", duration: 30 }),
        entry({ userId: "u2", projectId: "p1", duration: 120 }),
      ],
      members,
      color,
    );
    expect(result.map((s) => [s.label, s.minutes])).toEqual([
      ["Lena", 120],
      ["Michi", 90],
    ]);
  });

  it("drops members who tracked nothing", () => {
    const result = totalsByMember([entry({ userId: "u1", projectId: "p1" })], members, color);
    expect(result.map((s) => s.id)).toEqual(["u1"]);
  });

  it("carries the member's role color", () => {
    const result = totalsByMember([entry({ userId: "u2", projectId: "p1" })], members, color);
    expect(result[0]!.color).toBe("var(--vt-role-4)");
  });
});

describe("totalsByProject", () => {
  it("sums per project", () => {
    const result = totalsByProject(
      [
        entry({ userId: "u1", projectId: "p1", duration: 60 }),
        entry({ userId: "u2", projectId: "p1", duration: 60 }),
        entry({ userId: "u1", projectId: "p2", duration: 45 }),
      ],
      projects,
      color,
    );
    expect(result.map((s) => [s.label, s.minutes])).toEqual([
      ["Album", 120],
      ["Tour", 45],
    ]);
  });

  it("keeps time booked on a deleted project visible", () => {
    // Otherwise the pie chart would silently disagree with the headline total.
    const result = totalsByProject(
      [entry({ userId: "u1", projectId: "gone", duration: 90 })],
      projects,
      color,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.label).toBe("Gelöschte Projekte");
    expect(result[0]!.minutes).toBe(90);
  });

  it("buckets unassigned time as Ohne Projekt", () => {
    const result = totalsByProject(
      [entry({ userId: "u1", projectId: null, duration: 40 })],
      projects,
      color,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("__unassigned__");
    expect(result[0]!.label).toBe("Ohne Projekt");
    expect(result[0]!.color).toBe("var(--vt-muted)");
    expect(result[0]!.minutes).toBe(40);
  });

  it("keeps unassigned and deleted-orphan slices distinct", () => {
    const result = totalsByProject(
      [
        entry({ userId: "u1", projectId: null, duration: 30 }),
        entry({ userId: "u1", projectId: "gone", duration: 90 }),
      ],
      projects,
      color,
    );
    expect(result.map((s) => [s.label, s.minutes])).toEqual([
      ["Gelöschte Projekte", 90],
      ["Ohne Projekt", 30],
    ]);
  });
});

describe("totalsByFunctionalRole", () => {
  it("groups two members sharing a role", () => {
    const result = totalsByFunctionalRole(
      [
        entry({ userId: "u1", projectId: "p1", duration: 60 }),
        entry({ userId: "u3", projectId: "p1", duration: 30 }),
        entry({ userId: "u2", projectId: "p1", duration: 45 }),
      ],
      members,
      color,
    );
    expect(result.map((s) => [s.label, s.minutes])).toEqual([
      ["Gitarre", 90],
      ["Bass", 45],
    ]);
  });

  it("buckets members without a functional role", () => {
    const result = totalsByFunctionalRole(
      [entry({ userId: "u9", projectId: "p1", duration: 20 })],
      members,
      color,
    );
    expect(result[0]!.label).toBe("Ohne Rolle");
  });
});

describe("seriesByDay", () => {
  const days = [new Date(2026, 7, 9), new Date(2026, 7, 10), new Date(2026, 7, 11)];

  it("emits a point for every day, including empty ones", () => {
    const result = seriesByDay(
      [entry({ userId: "u1", projectId: "p1", startTime: new Date(2026, 7, 10, 9), duration: 30 })],
      days,
    );
    expect(result.map((p) => p.minutes)).toEqual([0, 30, 0]);
  });

  it("ignores entries outside the given days", () => {
    const result = seriesByDay(
      [entry({ userId: "u1", projectId: "p1", startTime: new Date(2026, 6, 1, 9), duration: 999 })],
      days,
    );
    expect(result.every((p) => p.minutes === 0)).toBe(true);
  });

  it("buckets by local start day", () => {
    const gig = entry({
      userId: "u1",
      projectId: "p1",
      startTime: new Date(2026, 7, 9, 22, 0),
      endTime: new Date(2026, 7, 10, 1, 0),
      duration: 180,
    });
    const result = seriesByDay([gig], days);
    expect(result[0]!.minutes).toBe(180);
    expect(result[1]!.minutes).toBe(0);
  });
});

describe("projectProgress", () => {
  it("counts done versus open and skips projects without tasks", () => {
    const tasks = [
      { projectId: "p1", status: "done" as const },
      { projectId: "p1", status: "todo" as const },
      { projectId: "p1", status: "in_progress" as const },
    ];
    const result = projectProgress(tasks, projects, color);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ label: "Album", done: 1, open: 2, total: 3, percent: 33 });
  });

  it("returns nothing when there are no tasks at all", () => {
    expect(projectProgress([], projects, color)).toEqual([]);
  });
});

describe("deltaPercent", () => {
  it("computes growth and decline", () => {
    expect(deltaPercent(150, 100)).toBe(50);
    expect(deltaPercent(50, 100)).toBe(-50);
  });

  it("has no baseline to compare against when the previous period was empty", () => {
    expect(deltaPercent(120, 0)).toBeNull();
  });
});
