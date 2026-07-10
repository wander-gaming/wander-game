import type { StateCreator } from "zustand";
import type { StoryGraph, StoryNode, StoryEdge, StateObject, EdgeResult } from "../types";
import { hasCycle, edgeExists } from "../utils/graph";

function makeBase(): StateObject {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), schemaVersion: 1, createdAt: now, updatedAt: now };
}

export interface StorySlice {
  graph: StoryGraph;
  addNode: (node: Omit<StoryNode, keyof StateObject>) => StoryNode;
  deleteNode: (nodeId: string) => void;
  addEdge: (sourceId: string, targetId: string, label: string) => EdgeResult;
  deleteEdge: (edgeId: string) => void;
  detectCycle: () => boolean;
}

export const createStorySlice: StateCreator<StorySlice> = (set, get) => ({
  graph: { nodes: [], edges: [] },

  addNode(node) {
    const newNode: StoryNode = { ...makeBase(), ...node };
    set(s => ({ graph: { ...s.graph, nodes: [...s.graph.nodes, newNode] } }));
    return newNode;
  },

  deleteNode(nodeId) {
    set(s => ({
      graph: {
        nodes: s.graph.nodes.filter(n => n.id !== nodeId),
        edges: s.graph.edges.filter(e => e.sourceId !== nodeId && e.targetId !== nodeId),
      },
    }));
  },

  addEdge(sourceId, targetId, label) {
    const { graph } = get();
    if (edgeExists(graph, sourceId, targetId)) {
      return { ok: false, error: "Edge already exists between these nodes" };
    }
    const newEdge: StoryEdge = {
      ...makeBase(),
      campaignId: graph.nodes.find(n => n.id === sourceId)?.campaignId ?? "",
      sourceId,
      targetId,
      label,
    };
    const candidate: StoryGraph = { ...graph, edges: [...graph.edges, newEdge] };
    if (hasCycle(candidate)) {
      return { ok: false, error: "Adding this edge would create a cycle" };
    }
    set(() => ({ graph: candidate }));
    return { ok: true, edge: newEdge };
  },

  deleteEdge(edgeId) {
    set(s => ({ graph: { ...s.graph, edges: s.graph.edges.filter(e => e.id !== edgeId) } }));
  },

  detectCycle() {
    return hasCycle(get().graph);
  },
});
