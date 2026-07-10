// Feature: wander-game, Property 15: Duplicate edge rejection
// Feature: wander-game, Property 16: Cycle detection
import * as fc from "fast-check";
import { create } from "zustand";
import { createStorySlice, type StorySlice } from "../storySlice";

function makeStore() {
  return create<StorySlice>()((...a) => createStorySlice(...a));
}

function addNodes(store: ReturnType<typeof makeStore>, count: number) {
  const nodes = [];
  for (let i = 0; i < count; i++) {
    nodes.push(
      store.getState().addNode({
        campaignId: "camp-1",
        label: `Node ${i}`,
        description: "",
        position: { x: i * 10, y: 0 },
      })
    );
  }
  return nodes;
}

describe("Property 15: Duplicate edge rejection", () => {
  it("adding the same edge twice returns ok:false and leaves graph unchanged", () => {
    // Validates: Requirements 7.3
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 5 }), (n) => {
        const store = makeStore();
        const nodes = addNodes(store, n);

        const i = 0;
        const j = 1;

        const first = store.getState().addEdge(nodes[i].id, nodes[j].id, "link");
        expect(first.ok).toBe(true);

        const snapshot = JSON.stringify(store.getState().graph);

        const second = store.getState().addEdge(nodes[i].id, nodes[j].id, "link");
        expect(second.ok).toBe(false);

        expect(JSON.stringify(store.getState().graph)).toBe(snapshot);
      })
    );
  });
});

describe("Property 16: Cycle detection", () => {
  it("detectCycle returns true when a back-edge is force-injected", () => {
    // Validates: Requirements 7.5
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 6 }), (n) => {
        const store = makeStore();
        const nodes = addNodes(store, n);

        for (let i = 0; i < nodes.length - 1; i++) {
          const result = store.getState().addEdge(nodes[i].id, nodes[i + 1].id, "step");
          expect(result.ok).toBe(true);
        }

        expect(store.getState().detectCycle()).toBe(false);

        const backEdgeResult = store
          .getState()
          .addEdge(nodes[nodes.length - 1].id, nodes[0].id, "back");
        expect(backEdgeResult.ok).toBe(false);

        const now = new Date().toISOString();
        const backEdge = {
          id: "back",
          schemaVersion: 1,
          createdAt: now,
          updatedAt: now,
          campaignId: "camp-1",
          sourceId: nodes[nodes.length - 1].id,
          targetId: nodes[0].id,
          label: "back",
        };

        store.setState((s) => ({
          graph: { ...s.graph, edges: [...s.graph.edges, backEdge] },
        }));

        expect(store.getState().detectCycle()).toBe(true);
      })
    );
  });
});
