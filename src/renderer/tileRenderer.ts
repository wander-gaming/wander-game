import * as PIXI from "pixi.js";
import { store } from "@/store";
import { getLayers } from "./layers";
import type { TerrainType } from "@/types";

const TERRAIN_COLORS: Record<TerrainType, number> = {
  grass:  0x4a7c3f,
  stone:  0x7a7a7a,
  dirt:   0x8b6340,
  water:  0x2e6fa8,
  sand:   0xd4b96a,
  snow:   0xe8e8f0,
  void:   0x1a1a1a,
};

let activeSprites: Map<string, PIXI.Graphics> = new Map();
let freeList: PIXI.Graphics[] = [];

function getOrCreate(): PIXI.Graphics {
  return freeList.pop() ?? new PIXI.Graphics();
}

function recycle(g: PIXI.Graphics): void {
  g.removeFromParent();
  freeList.push(g);
}

function visibleRange(offset: number, screenSize: number, cellSize: number, zoom: number) {
  const start = Math.floor(-offset / zoom / cellSize) - 1;
  const end = Math.ceil((screenSize / zoom - offset / zoom) / cellSize) + 1;
  return { start, end };
}

export function initTileRenderer(app: PIXI.Application): void {
  store.subscribe((state) => {
    const { map, cellSize, zoom, pan } = state;
    if (!map) return;

    const { terrainLayer } = getLayers();
    const screen = app.screen;

    const xRange = visibleRange(pan.x, screen.width, cellSize, zoom);
    const yRange = visibleRange(pan.y, screen.height, cellSize, zoom);

    const nextKeys = new Set<string>();

    for (let y = Math.max(0, yRange.start); y <= Math.min(map.height - 1, yRange.end); y++) {
      for (let x = Math.max(0, xRange.start); x <= Math.min(map.width - 1, xRange.end); x++) {
        const key = `${x},${y}`;
        if (map.tiles[key]) nextKeys.add(key);
      }
    }

    for (const [key, g] of activeSprites) {
      if (!nextKeys.has(key)) {
        recycle(g);
        activeSprites.delete(key);
      }
    }

    for (const key of nextKeys) {
      const tile = map.tiles[key];
      if (!tile) continue;

      let g = activeSprites.get(key);
      if (!g) {
        g = getOrCreate();
        terrainLayer.addChild(g);
        activeSprites.set(key, g);
      }

      g.clear();
      g.rect(tile.x * cellSize, tile.y * cellSize, cellSize - 1, cellSize - 1)
       .fill(TERRAIN_COLORS[tile.terrain] ?? 0x333333);
    }
  });
}
