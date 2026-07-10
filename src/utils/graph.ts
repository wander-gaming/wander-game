import type { StoryGraph } from "../types";

type NodeColor = "white" | "gray" | "black";

function dfsVisit(graph: StoryGraph, nodeId: string, color: Map<string, NodeColor>): boolean {
  color.set(nodeId, "gray");
  for (const edge of graph.edges.filter(e => e.sourceId === nodeId)) {
    const c = color.get(edge.targetId);
    if (c === "gray") return true;
    if (c === "white" && dfsVisit(graph, edge.targetId, color)) return true;
  }
  color.set(nodeId, "black");
  return false;
}

export function hasCycle(graph: StoryGraph): boolean {
  const color = new Map<string, NodeColor>();
  graph.nodes.forEach(n => color.set(n.id, "white"));
  for (const start of graph.nodes) {
    if (color.get(start.id) === "white") {
      if (dfsVisit(graph, start.id, color)) return true;
    }
  }
  return false;
}

export function edgeExists(graph: StoryGraph, sourceId: string, targetId: string): boolean {
  return graph.edges.some(e => e.sourceId === sourceId && e.targetId === targetId);
}
