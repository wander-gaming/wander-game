import { useState, useRef, useCallback, useEffect } from "react";
import { useStore } from "@/store";
import type { StoryNode } from "@/types";

const NODE_W = 140;
const NODE_H = 54;
const BEZIER_OFFSET = 80;

interface Pos { x: number; y: number }

function sourceAnchor(pos: Pos): Pos {
  return { x: pos.x + NODE_W, y: pos.y + NODE_H / 2 };
}

function targetAnchor(pos: Pos): Pos {
  return { x: pos.x, y: pos.y + NODE_H / 2 };
}

function bezierPath(a: Pos, b: Pos): string {
  return `M ${a.x} ${a.y} C ${a.x + BEZIER_OFFSET} ${a.y}, ${b.x - BEZIER_OFFSET} ${b.y}, ${b.x} ${b.y}`;
}

function edgeMidpoint(a: Pos, b: Pos): Pos {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function FlowchartEditor() {
  const graph = useStore(s => s.graph);
  const addNode = useStore(s => s.addNode);
  const deleteNode = useStore(s => s.deleteNode);
  const addEdge = useStore(s => s.addEdge);

  const [localPos, setLocalPos] = useState<Record<string, Pos>>({});
  const [toast, setToast] = useState<string | null>(null);

  const [draggingNode, setDraggingNode] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [drawingEdge, setDrawingEdge] = useState<{ sourceId: string; cur: Pos } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (toast === null) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  function nodePos(node: StoryNode): Pos {
    return localPos[node.id] ?? node.position;
  }

  function handleAddNode() {
    const node = addNode({
      campaignId: "default",
      label: "New Node",
      description: "",
      position: { x: 80, y: 80 },
    });
    setLocalPos(p => ({ ...p, [node.id]: node.position }));
  }

  function onNodePointerDown(e: React.PointerEvent, nodeId: string) {
    e.stopPropagation();
    const pos = nodePos(graph.nodes.find(n => n.id === nodeId)!);
    setDraggingNode({ id: nodeId, ox: e.clientX - pos.x, oy: e.clientY - pos.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPortPointerDown(e: React.PointerEvent, nodeId: string) {
    e.stopPropagation();
    const node = graph.nodes.find(n => n.id === nodeId)!;
    const pos = nodePos(node);
    setDrawingEdge({ sourceId: nodeId, cur: sourceAnchor(pos) });
    containerRef.current?.setPointerCapture(e.pointerId);
  }

  const onContainerPointerMove = useCallback((e: React.PointerEvent) => {
    if (draggingNode) {
      setLocalPos(p => ({
        ...p,
        [draggingNode.id]: { x: e.clientX - draggingNode.ox, y: e.clientY - draggingNode.oy },
      }));
    }
    if (drawingEdge) {
      const rect = containerRef.current!.getBoundingClientRect();
      setDrawingEdge(d => d && ({ ...d, cur: { x: e.clientX - rect.left, y: e.clientY - rect.top } }));
    }
  }, [draggingNode, drawingEdge]);

  const onContainerPointerUp = useCallback((e: React.PointerEvent) => {
    if (draggingNode) {
      setDraggingNode(null);
    }
    if (drawingEdge) {
      const rect = containerRef.current!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const target = graph.nodes.find(n => {
        const p = nodePos(n);
        return n.id !== drawingEdge.sourceId &&
          px >= p.x && px <= p.x + NODE_W &&
          py >= p.y && py <= p.y + NODE_H;
      });

      if (target) {
        const result = addEdge(drawingEdge.sourceId, target.id, "");
        if (!result.ok) setToast(result.error);
      }
      setDrawingEdge(null);
    }
  }, [draggingNode, drawingEdge, graph.nodes, addEdge]);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%" }}
      onPointerMove={onContainerPointerMove}
      onPointerUp={onContainerPointerUp}
    >
      <button
        onClick={handleAddNode}
        style={{ position: "absolute", top: 8, left: 8, zIndex: 10 }}
      >
        Add Node
      </button>

      <svg
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        {graph.edges.map(edge => {
          const src = graph.nodes.find(n => n.id === edge.sourceId);
          const tgt = graph.nodes.find(n => n.id === edge.targetId);
          if (!src || !tgt) return null;
          const a = sourceAnchor(nodePos(src));
          const b = targetAnchor(nodePos(tgt));
          const mid = edgeMidpoint(a, b);
          return (
            <g key={edge.id}>
              <path d={bezierPath(a, b)} fill="none" stroke="#888" strokeWidth={2} />
              {edge.label && (
                <text x={mid.x} y={mid.y} textAnchor="middle" fontSize={12} fill="#555">
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {drawingEdge && (() => {
          const src = graph.nodes.find(n => n.id === drawingEdge.sourceId);
          if (!src) return null;
          const a = sourceAnchor(nodePos(src));
          return <path d={bezierPath(a, drawingEdge.cur)} fill="none" stroke="#aaa" strokeWidth={2} strokeDasharray="6 3" />;
        })()}
      </svg>

      {graph.nodes.map(node => {
        const pos = nodePos(node);
        return (
          <div
            key={node.id}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              width: NODE_W,
              height: NODE_H,
              background: "#fff",
              border: "1px solid #999",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              userSelect: "none",
              cursor: "grab",
            }}
            onPointerDown={e => onNodePointerDown(e, node.id)}
          >
            <span style={{ flex: 1, padding: "0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {node.label}
            </span>
            <button
              onClick={e => { e.stopPropagation(); deleteNode(node.id); }}
              style={{ marginRight: 4, lineHeight: 1, padding: "2px 5px", fontSize: 11 }}
            >
              ×
            </button>
            <div
              onPointerDown={e => onPortPointerDown(e, node.id)}
              style={{
                position: "absolute",
                right: -6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#666",
                cursor: "crosshair",
                zIndex: 1,
              }}
            />
          </div>
        );
      })}

      {toast && (
        <div style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#333",
          color: "#fff",
          padding: "8px 16px",
          borderRadius: 6,
          fontSize: 13,
          pointerEvents: "none",
          zIndex: 20,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
