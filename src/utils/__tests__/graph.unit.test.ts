import { describe, it, expect } from "vitest";
import { hasCycle, edgeExists } from "@/utils/graph";
import type { StoryGraph } from "@/types";

function makeGraph(nodeIds: string[], edges: Array<[string, string]>): StoryGraph {
  const now = new Date().toISOString();
  return {
    nodes: nodeIds.map(id => ({
      id, schemaVersion: 1, createdAt: now, updatedAt: now,
      campaignId: "t", label: id, description: "", position: { x: 0, y: 0 },
    })),
    edges: edges.map(([sourceId, targetId], i) => ({
      id: `e${i}`, schemaVersion: 1, createdAt: now, updatedAt: now,
      campaignId: "t", sourceId, targetId, label: "",
    })),
  };
}

describe("hasCycle", () => {
  it("linear chain A→B→C returns false", () => {
    const g = makeGraph(["A", "B", "C"], [["A", "B"], ["B", "C"]]);
    expect(hasCycle(g)).toBe(false);
  });

  it("diamond A→B, A→C, B→D, C→D returns false", () => {
    const g = makeGraph(["A", "B", "C", "D"], [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"]]);
    expect(hasCycle(g)).toBe(false);
  });

  it("back-edge A→B→C→A returns true", () => {
    const g = makeGraph(["A", "B", "C"], [["A", "B"], ["B", "C"], ["C", "A"]]);
    expect(hasCycle(g)).toBe(true);
  });

  it("self-loop A→A returns true", () => {
    const g = makeGraph(["A"], [["A", "A"]]);
    expect(hasCycle(g)).toBe(true);
  });
});

describe("edgeExists", () => {
  it("returns true when edge A→B exists", () => {
    const g = makeGraph(["A", "B"], [["A", "B"]]);
    expect(edgeExists(g, "A", "B")).toBe(true);
  });

  it("returns false for reverse direction B→A when only A→B exists", () => {
    const g = makeGraph(["A", "B"], [["A", "B"]]);
    expect(edgeExists(g, "B", "A")).toBe(false);
  });

  it("returns false on empty graph", () => {
    const g = makeGraph([], []);
    expect(edgeExists(g, "A", "B")).toBe(false);
  });
});
