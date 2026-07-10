import type { Tile, StructuralElementType, TriggerRegion, CellSize, GeneratorResult } from "@/types";

interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
  element: StructuralElementType;
  count: number;
}

const TEMPLATE = {
  wallBorder: true,
  entrance: { relX: 0.5, relY: 1.0, width: 2 },
  bar: { relX: 0.1, relY: 0.1, width: 0.3, height: 0.15 },
  hearth: { relX: 0.75, relY: 0.1 },
  furnitureZones: [
    { relX: 0.1, relY: 0.35, relW: 0.8, relH: 0.5, element: "furniture" as StructuralElementType, density: 0.12 },
  ],
};

export function generateTavern(region: TriggerRegion, cellSize: CellSize, rand = Math.random): GeneratorResult {
  const { x: ox, y: oy, width: w, height: h } = region;
  const tiles: Tile[] = [];

  const set = (x: number, y: number, terrain: Tile["terrain"], el: StructuralElementType | null) => {
    if (x >= ox && x < ox + w && y >= oy && y < oy + h) {
      tiles.push({ x, y, terrain, structuralElement: el, hidden: false, revealed: false });
    }
  };

  const floor = new Set<string>();
  const walls = new Set<string>();
  const elements = new Map<string, StructuralElementType>();

  const inBounds = (x: number, y: number) => x >= ox && x < ox + w && y >= oy && y < oy + h;

  for (let x = ox; x < ox + w; x++) {
    for (let y = oy; y < oy + h; y++) {
      const onEdge = x === ox || x === ox + w - 1 || y === oy || y === oy + h - 1;
      if (onEdge) {
        walls.add(`${x},${y}`);
      } else {
        floor.add(`${x},${y}`);
      }
    }
  }

  const entranceX = Math.floor(ox + w * TEMPLATE.entrance.relX);
  const entranceY = oy + h - 1;
  for (let dx = -1; dx <= 1; dx++) {
    const ex = entranceX + dx;
    if (inBounds(ex, entranceY)) {
      walls.delete(`${ex},${entranceY}`);
      floor.add(`${ex},${entranceY}`);
      elements.set(`${ex},${entranceY}`, "door");
    }
  }

  const barX = Math.floor(ox + w * TEMPLATE.bar.relX);
  const barY = Math.floor(oy + h * TEMPLATE.bar.relY);
  const barW = Math.max(3, Math.floor(w * TEMPLATE.bar.width));
  const barH = Math.max(2, Math.floor(h * TEMPLATE.bar.height));
  for (let bx = barX; bx < barX + barW; bx++) {
    for (let by = barY; by < barY + barH; by++) {
      if (inBounds(bx, by) && floor.has(`${bx},${by}`)) {
        elements.set(`${bx},${by}`, "furniture");
      }
    }
  }

  const hearthX = Math.floor(ox + w * TEMPLATE.hearth.relX);
  const hearthY = Math.floor(oy + h * TEMPLATE.hearth.relY);
  if (inBounds(hearthX, hearthY) && floor.has(`${hearthX},${hearthY}`)) {
    elements.set(`${hearthX},${hearthY}`, "furniture");
  }

  for (const zone of TEMPLATE.furnitureZones) {
    const zx = Math.floor(ox + w * zone.relX);
    const zy = Math.floor(oy + h * zone.relY);
    const zw = Math.floor(w * zone.relW);
    const zh = Math.floor(h * zone.relH);

    const candidates: Array<[number, number]> = [];
    for (let fx = zx; fx < zx + zw; fx++) {
      for (let fy = zy; fy < zy + zh; fy++) {
        const key = `${fx},${fy}`;
        if (floor.has(key) && !elements.has(key)) candidates.push([fx, fy]);
      }
    }

    const count = Math.floor(candidates.length * zone.density);
    for (let i = 0; i < count && candidates.length > 0; i++) {
      const idx = Math.floor(rand() * candidates.length);
      const [fx, fy] = candidates.splice(idx, 1)[0];
      elements.set(`${fx},${fy}`, zone.element);
    }
  }

  for (const key of walls) {
    const [x, y] = key.split(",").map(Number);
    set(x, y, "stone", elements.get(key) ?? null);
  }
  for (const key of floor) {
    const [x, y] = key.split(",").map(Number);
    set(x, y, "dirt", elements.get(key) ?? null);
  }

  void cellSize;
  return { ok: true, tiles };
}
