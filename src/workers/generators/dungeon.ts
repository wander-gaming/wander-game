import type { Tile, TerrainType, TriggerRegion, CellSize, GeneratorResult } from "@/types";

interface Rect { x: number; y: number; w: number; h: number }
interface Room { x: number; y: number; w: number; h: number }
interface Node { room: Room; left: Node | null; right: Node | null }

const MIN_ROOM = 5;

function split(rect: Rect, rand: () => number): [Rect, Rect] | null {
  const canH = rect.h >= MIN_ROOM * 2;
  const canV = rect.w >= MIN_ROOM * 2;
  if (!canH && !canV) return null;
  const horiz = canH && canV ? rand() < 0.5 : canH;
  if (horiz) {
    const lo = Math.ceil(rect.h * 0.4);
    const hi = Math.floor(rect.h * 0.6);
    const s = lo + Math.floor(rand() * (hi - lo + 1));
    return [
      { x: rect.x, y: rect.y, w: rect.w, h: s },
      { x: rect.x, y: rect.y + s, w: rect.w, h: rect.h - s },
    ];
  }
  const lo = Math.ceil(rect.w * 0.4);
  const hi = Math.floor(rect.w * 0.6);
  const s = lo + Math.floor(rand() * (hi - lo + 1));
  return [
    { x: rect.x, y: rect.y, w: s, h: rect.h },
    { x: rect.x + s, y: rect.y, w: rect.w - s, h: rect.h },
  ];
}

function carveRoom(rect: Rect, rand: () => number): Room {
  const inset = 1 + Math.floor(rand() * 3);
  return {
    x: rect.x + inset,
    y: rect.y + inset,
    w: Math.max(3, rect.w - inset * 2),
    h: Math.max(3, rect.h - inset * 2),
  };
}

function buildTree(rect: Rect, rand: () => number): Node {
  const pair = split(rect, rand);
  if (!pair) {
    return { room: carveRoom(rect, rand), left: null, right: null };
  }
  const left = buildTree(pair[0], rand);
  const right = buildTree(pair[1], rand);
  const room = {
    x: Math.min(left.room.x, right.room.x),
    y: Math.min(left.room.y, right.room.y),
    w: Math.max(left.room.x + left.room.w, right.room.x + right.room.w) - Math.min(left.room.x, right.room.x),
    h: Math.max(left.room.y + left.room.h, right.room.y + right.room.h) - Math.min(left.room.y, right.room.y),
  };
  return { room, left, right };
}

function center(r: Room): [number, number] {
  return [Math.floor(r.x + r.w / 2), Math.floor(r.y + r.h / 2)];
}

function collectFloor(node: Node, floor: Set<string>, corridors: Set<string>): void {
  if (!node.left && !node.right) {
    for (let x = node.room.x; x < node.room.x + node.room.w; x++) {
      for (let y = node.room.y; y < node.room.y + node.room.h; y++) {
        floor.add(`${x},${y}`);
      }
    }
    return;
  }
  if (node.left) collectFloor(node.left, floor, corridors);
  if (node.right) collectFloor(node.right, floor, corridors);

  if (node.left && node.right) {
    const [ax, ay] = center(node.left.room);
    const [bx, by] = center(node.right.room);
    let cx = ax;
    while (cx !== bx) {
      corridors.add(`${cx},${ay}`);
      cx += cx < bx ? 1 : -1;
    }
    corridors.add(`${bx},${ay}`);
    let cy = ay;
    while (cy !== by) {
      corridors.add(`${bx},${cy}`);
      cy += cy < by ? 1 : -1;
    }
    corridors.add(`${bx},${by}`);
  }
}

export function generateDungeon(region: TriggerRegion, _cellSize: CellSize, rand = Math.random): GeneratorResult {
  const rect: Rect = { x: region.x, y: region.y, w: region.width, h: region.height };
  const tree = buildTree(rect, rand);

  const floor = new Set<string>();
  const corridors = new Set<string>();
  collectFloor(tree, floor, corridors);

  for (const key of corridors) floor.add(key);

  const tileMap = new Map<string, TerrainType>();
  for (const key of floor) tileMap.set(key, "stone");

  for (const key of floor) {
    const [x, y] = key.split(",").map(Number);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nk = `${x + dx},${y + dy}`;
        if (!tileMap.has(nk)) tileMap.set(nk, "void");
      }
    }
  }

  const tiles: Tile[] = [];
  for (const [key, terrain] of tileMap) {
    const [x, y] = key.split(",").map(Number);
    if (x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height) {
      tiles.push({ x, y, terrain, structuralElement: null, hidden: false, revealed: false });
    }
  }

  return { ok: true, tiles };
}
