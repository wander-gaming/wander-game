import { create } from "zustand";
import { createStorySlice, type StorySlice } from "../storySlice";

const makeStore = () => create<StorySlice>()((...a) => createStorySlice(...a));

describe("deleteNode", () => {
  it("removes the node from the graph", () => {
    const store = makeStore();
    const node = store.getState().addNode({
      campaignId: "c1",
      label: "Start",
      description: "",
      position: { x: 0, y: 0 },
    });
    store.getState().deleteNode(node.id);
    expect(store.getState().graph.nodes).toHaveLength(0);
  });

  it("removes all edges connected to the deleted node", () => {
    const store = makeStore();
    const a = store.getState().addNode({ campaignId: "c1", label: "A", description: "", position: { x: 0, y: 0 } });
    const b = store.getState().addNode({ campaignId: "c1", label: "B", description: "", position: { x: 1, y: 0 } });
    const c = store.getState().addNode({ campaignId: "c1", label: "C", description: "", position: { x: 2, y: 0 } });
    store.getState().addEdge(a.id, b.id, "A->B");
    store.getState().addEdge(b.id, c.id, "B->C");

    store.getState().deleteNode(b.id);

    expect(store.getState().graph.edges).toHaveLength(0);
  });

  it("only removes edges touching the deleted node", () => {
    const store = makeStore();
    const a = store.getState().addNode({ campaignId: "c1", label: "A", description: "", position: { x: 0, y: 0 } });
    const b = store.getState().addNode({ campaignId: "c1", label: "B", description: "", position: { x: 1, y: 0 } });
    const c = store.getState().addNode({ campaignId: "c1", label: "C", description: "", position: { x: 2, y: 0 } });
    store.getState().addEdge(a.id, b.id, "A->B");
    store.getState().addEdge(a.id, c.id, "A->C");

    store.getState().deleteNode(b.id);

    expect(store.getState().graph.edges).toHaveLength(1);
    expect(store.getState().graph.edges[0].targetId).toBe(c.id);
  });
});

describe("deleteEdge", () => {
  it("removes the edge by id", () => {
    const store = makeStore();
    const a = store.getState().addNode({ campaignId: "c1", label: "A", description: "", position: { x: 0, y: 0 } });
    const b = store.getState().addNode({ campaignId: "c1", label: "B", description: "", position: { x: 1, y: 0 } });
    const result = store.getState().addEdge(a.id, b.id, "go");
    if (!result.ok || !result.edge) throw new Error("addEdge failed");

    store.getState().deleteEdge(result.edge.id);
    expect(store.getState().graph.edges).toHaveLength(0);
  });

  it("does not remove other edges", () => {
    const store = makeStore();
    const a = store.getState().addNode({ campaignId: "c1", label: "A", description: "", position: { x: 0, y: 0 } });
    const b = store.getState().addNode({ campaignId: "c1", label: "B", description: "", position: { x: 1, y: 0 } });
    const c = store.getState().addNode({ campaignId: "c1", label: "C", description: "", position: { x: 2, y: 0 } });
    const r1 = store.getState().addEdge(a.id, b.id, "A->B");
    const r2 = store.getState().addEdge(a.id, c.id, "A->C");
    if (!r1.ok || !r1.edge || !r2.ok || !r2.edge) throw new Error("addEdge failed");

    store.getState().deleteEdge(r1.edge.id);
    expect(store.getState().graph.edges).toHaveLength(1);
    expect(store.getState().graph.edges[0].id).toBe(r2.edge.id);
  });
});
