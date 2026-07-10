import { StateCreator } from "zustand";
import type {
  GameMap,
  CellSize,
  TerrainType,
  StructuralElementType,
  MapMutation,
  Tile,
} from "@/types";

export interface MapSlice {
  map: GameMap | null;
  cellSize: CellSize;
  zoom: number;
  pan: { x: number; y: number };
  undoStack: MapMutation[];
  redoStack: MapMutation[];
  paintTile: (x: number, y: number, terrain: TerrainType) => void;
  placeElement: (x: number, y: number, el: StructuralElementType) => void;
  undo: () => void;
  redo: () => void;
  setZoom: (z: number) => void;
  setPan: (dx: number, dy: number) => void;
  revealTiles: (tokenX: number, tokenY: number, visionRadius: number, mapId: string) => void;
}

export const createMapSlice: StateCreator<MapSlice> = (set, get) => ({
  map: null,
  cellSize: 32,
  zoom: 1,
  pan: { x: 0, y: 0 },
  undoStack: [],
  redoStack: [],

  paintTile: (x, y, terrain) => {
    const { map } = get();
    if (!map) return;
    const key = `${x},${y}`;
    const existing = map.tiles[key];
    const before: TerrainType = existing?.terrain ?? "void";
    const mutation: MapMutation = { type: "paint", x, y, before, after: terrain };
    set((s) => ({
      map: {
        ...s.map!,
        tiles: {
          ...s.map!.tiles,
          [key]: { ...(s.map!.tiles[key] ?? { x, y, structuralElement: null, hidden: false, revealed: false }), terrain },
        },
      },
      undoStack: [...s.undoStack, mutation],
      redoStack: [],
    }));
  },

  placeElement: (x, y, el) => {
    const { map } = get();
    if (!map) return;
    const key = `${x},${y}`;
    const existing: Tile = map.tiles[key] ?? { x, y, terrain: "void", structuralElement: null, hidden: false, revealed: false };
    const updated: Tile = { ...existing, structuralElement: el };
    const mutation: MapMutation = { type: "place", x, y, before: existing, after: updated };
    set((s) => ({
      map: {
        ...s.map!,
        tiles: { ...s.map!.tiles, [key]: updated },
      },
      undoStack: [...s.undoStack, mutation],
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack } = get();
    if (!undoStack.length) return;
    const mutation = undoStack[undoStack.length - 1];
    set((s) => {
      const map = s.map;
      if (!map) return {};
      return {
        map: applyMutationBefore(map, mutation),
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, mutation],
      };
    });
  },

  redo: () => {
    const { redoStack } = get();
    if (!redoStack.length) return;
    const mutation = redoStack[redoStack.length - 1];
    set((s) => {
      const map = s.map;
      if (!map) return {};
      return {
        map: applyMutationAfter(map, mutation),
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack, mutation],
      };
    });
  },

  setZoom: (z) => set({ zoom: Math.min(4.0, Math.max(0.25, z)) }),

  setPan: (dx, dy) => set({ pan: { x: dx, y: dy } }),

  revealTiles: (tokenX, tokenY, visionRadius, mapId) => {
    const { map } = get();
    if (!map || map.id !== mapId) return;
    const updates: GameMap["tiles"] = {};
    for (let x = Math.max(0, tokenX - visionRadius); x <= Math.min(map.width - 1, tokenX + visionRadius); x++) {
      for (let y = Math.max(0, tokenY - visionRadius); y <= Math.min(map.height - 1, tokenY + visionRadius); y++) {
        if (Math.max(Math.abs(x - tokenX), Math.abs(y - tokenY)) <= visionRadius) {
          const key = `${x},${y}`;
          const tile = map.tiles[key] ?? { x, y, terrain: "void" as TerrainType, structuralElement: null, hidden: false, revealed: false };
          updates[key] = { ...tile, revealed: true };
        }
      }
    }
    set((s) => ({
      map: { ...s.map!, tiles: { ...s.map!.tiles, ...updates } },
    }));
  },
})

function applyMutationBefore(map: GameMap, mutation: MapMutation): GameMap {
  if (mutation.type === "paint") {
    const key = `${mutation.x},${mutation.y}`;
    return {
      ...map,
      tiles: { ...map.tiles, [key]: { ...map.tiles[key], terrain: mutation.before } },
    };
  }
  if (mutation.type === "place") {
    const key = `${mutation.x},${mutation.y}`;
    return { ...map, tiles: { ...map.tiles, [key]: mutation.before } };
  }
  if (mutation.type === "bulk") {
    return [...mutation.mutations].reverse().reduce(applyMutationBefore, map);
  }
  return map;
}

function applyMutationAfter(map: GameMap, mutation: MapMutation): GameMap {
  if (mutation.type === "paint") {
    const key = `${mutation.x},${mutation.y}`;
    return {
      ...map,
      tiles: { ...map.tiles, [key]: { ...map.tiles[key], terrain: mutation.after } },
    };
  }
  if (mutation.type === "place") {
    const key = `${mutation.x},${mutation.y}`;
    return { ...map, tiles: { ...map.tiles, [key]: mutation.after } };
  }
  if (mutation.type === "bulk") {
    return mutation.mutations.reduce(applyMutationAfter, map);
  }
  return map;
}
