import { create } from "zustand";
import { createMapSlice, type MapSlice } from "../mapSlice";
import type { GameMap, TerrainType, MapMutation } from "@/types";

function makeMap(): GameMap {
  const tiles: GameMap["tiles"] = {};
  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      tiles[`${x},${y}`] = { x, y, terrain: "grass", structuralElement: null, hidden: false, revealed: false };
    }
  }
  return {
    id: "test-map",
    schemaVersion: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    campaignId: "test",
    name: "Test",
    width: 4,
    height: 4,
    cellSize: 32,
    tiles,
    layers: [],
  };
}

describe("mapSlice bulk mutation undo/redo", () => {
  it("undo reverses a bulk mutation", () => {
    const store = create<MapSlice>()((...a) => createMapSlice(...a));
    store.setState({ map: makeMap() });

    const map = store.getState().map!;
    const before0 = map.tiles["0,0"];
    const before1 = map.tiles["1,0"];

    const bulk: MapMutation = {
      type: "bulk",
      mutations: [
        { type: "paint", x: 0, y: 0, before: "grass", after: "stone" },
        { type: "paint", x: 1, y: 0, before: "grass", after: "water" },
      ],
    };

    store.setState({
      map: {
        ...map,
        tiles: {
          ...map.tiles,
          "0,0": { ...before0, terrain: "stone" },
          "1,0": { ...before1, terrain: "water" },
        },
      },
      undoStack: [bulk],
      redoStack: [],
    });

    store.getState().undo();

    expect(store.getState().map!.tiles["0,0"].terrain).toBe("grass");
    expect(store.getState().map!.tiles["1,0"].terrain).toBe("grass");
    expect(store.getState().undoStack).toHaveLength(0);
    expect(store.getState().redoStack).toHaveLength(1);
  });

  it("redo reapplies a bulk mutation", () => {
    const store = create<MapSlice>()((...a) => createMapSlice(...a));
    store.setState({ map: makeMap() });

    const bulk: MapMutation = {
      type: "bulk",
      mutations: [
        { type: "paint", x: 0, y: 0, before: "grass", after: "stone" },
        { type: "paint", x: 1, y: 0, before: "grass", after: "water" },
      ],
    };

    store.setState({ redoStack: [bulk] });
    store.getState().redo();

    expect(store.getState().map!.tiles["0,0"].terrain).toBe("stone");
    expect(store.getState().map!.tiles["1,0"].terrain).toBe("water");
    expect(store.getState().redoStack).toHaveLength(0);
    expect(store.getState().undoStack).toHaveLength(1);
  });

  it("undo with a place mutation restores the before tile", () => {
    const store = create<MapSlice>()((...a) => createMapSlice(...a));
    const map = makeMap();
    const before = map.tiles["0,0"];
    const after = { ...before, structuralElement: "wall" as const };

    const mutation: MapMutation = { type: "place", x: 0, y: 0, before, after };
    store.setState({
      map: { ...map, tiles: { ...map.tiles, "0,0": after } },
      undoStack: [mutation],
    });

    store.getState().undo();
    expect(store.getState().map!.tiles["0,0"].structuralElement).toBeNull();
  });

  it("redo with a place mutation restores the after tile", () => {
    const store = create<MapSlice>()((...a) => createMapSlice(...a));
    const map = makeMap();
    const before = map.tiles["0,0"];
    const after = { ...before, structuralElement: "wall" as const };

    const mutation: MapMutation = { type: "place", x: 0, y: 0, before, after };
    store.setState({ map, redoStack: [mutation] });

    store.getState().redo();
    expect(store.getState().map!.tiles["0,0"].structuralElement).toBe("wall");
  });
});

describe("mapSlice null map guards", () => {
  it("undo does nothing when map is null", () => {
    const store = create<MapSlice>()((...a) => createMapSlice(...a));
    const mutation: MapMutation = { type: "paint", x: 0, y: 0, before: "grass", after: "stone" };
    store.setState({ map: null, undoStack: [mutation] });
    store.getState().undo();
    expect(store.getState().map).toBeNull();
  });

  it("redo does nothing when map is null", () => {
    const store = create<MapSlice>()((...a) => createMapSlice(...a));
    const mutation: MapMutation = { type: "paint", x: 0, y: 0, before: "grass", after: "stone" };
    store.setState({ map: null, redoStack: [mutation] });
    store.getState().redo();
    expect(store.getState().map).toBeNull();
  });

  it("undo does nothing when undoStack is empty", () => {
    const store = create<MapSlice>()((...a) => createMapSlice(...a));
    store.setState({ map: makeMap(), undoStack: [] });
    store.getState().undo();
    expect(store.getState().undoStack).toHaveLength(0);
  });

  it("redo does nothing when redoStack is empty", () => {
    const store = create<MapSlice>()((...a) => createMapSlice(...a));
    store.setState({ map: makeMap(), redoStack: [] });
    store.getState().redo();
    expect(store.getState().redoStack).toHaveLength(0);
  });
});

describe("paintTile on non-existent tile", () => {
  it("creates a new tile when key not in map", () => {
    const store = create<MapSlice>()((...a) => createMapSlice(...a));
    const map = makeMap();
    store.setState({ map });
    store.getState().paintTile(99, 99, "stone" as TerrainType);
    expect(store.getState().map!.tiles["99,99"].terrain).toBe("stone");
  });
});

describe("revealTiles with wrong mapId", () => {
  it("does not modify tiles when mapId does not match", () => {
    const store = create<MapSlice>()((...a) => createMapSlice(...a));
    store.setState({ map: makeMap() });
    store.getState().revealTiles(0, 0, 2, "wrong-map-id");
    expect(store.getState().map!.tiles["0,0"].revealed).toBe(false);
  });
});
