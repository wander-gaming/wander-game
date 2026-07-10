import * as PIXI from "pixi.js";
import { store } from "@/store";
import { getLayers } from "./layers";

let activeSprites: Map<string, PIXI.Sprite> = new Map();
let freeList: PIXI.Sprite[] = [];

function getOrCreateSprite(): PIXI.Sprite {
  return freeList.pop() ?? new PIXI.Sprite();
}

function recycleSprite(sprite: PIXI.Sprite): void {
  sprite.removeFromParent();
  freeList.push(sprite);
}

function visibleRange(offset: number, screenSize: number, cellSize: number, zoom: number) {
  const start = Math.floor(-offset / zoom / cellSize);
  const end = Math.ceil((screenSize / zoom - offset / zoom) / cellSize);
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

    for (let y = yRange.start; y <= yRange.end; y++) {
      for (let x = xRange.start; x <= xRange.end; x++) {
        const key = `${x},${y}`;
        const tile = map.tiles[key];
        if (!tile) continue;
        nextKeys.add(key);
      }
    }

    for (const [key, sprite] of activeSprites) {
      if (!nextKeys.has(key)) {
        recycleSprite(sprite);
        activeSprites.delete(key);
      }
    }

    for (const key of nextKeys) {
      const tile = map.tiles[key];
      if (!tile) continue;

      let sprite = activeSprites.get(key);
      if (!sprite) {
        sprite = getOrCreateSprite();
        try {
          sprite.texture = PIXI.Texture.from(tile.terrain);
        } catch {
          sprite.texture = PIXI.Texture.EMPTY;
        }
        sprite.x = tile.x * cellSize;
        sprite.y = tile.y * cellSize;
        sprite.width = cellSize;
        sprite.height = cellSize;
        terrainLayer.addChild(sprite);
        activeSprites.set(key, sprite);
      }
    }
  });
}
