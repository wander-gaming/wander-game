import type { Tile, TriggerRegion, CellSize, GeneratorResult } from "@/types";

function neighbors8(x: number, y: number, grid: boolean[][], w: number, h: number): number {
  let count = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
        count++;
      } else if (!grid[ny][nx]) {
        count++;
      }
    }
  }
  return count;
}

function floodFill(grid: boolean[][], w: number, h: number): Set<string> {
  let bestRegion = new Set<string>();
  const visited = new Set<string>();

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!grid[y][x]) continue;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;

      const region = new Set<string>();
      const queue: Array<[number, number]> = [[x, y]];
      while (queue.length) {
        const [cx, cy] = queue.pop()!;
        const ck = `${cx},${cy}`;
        if (region.has(ck)) continue;
        region.add(ck);
        visited.add(ck);
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && grid[ny][nx]) {
            const nk = `${nx},${ny}`;
            if (!region.has(nk)) queue.push([nx, ny]);
          }
        }
      }

      if (region.size > bestRegion.size) bestRegion = region;
    }
  }

  return bestRegion;
}

export function generateCave(region: TriggerRegion, cellSize: CellSize, rand = Math.random): GeneratorResult {
  const { width: w, height: h } = region;
  const passes = 4 + Math.floor(rand() * 2);

  let grid: boolean[][] = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => rand() < 0.45)
  );

  for (let p = 0; p < passes; p++) {
    grid = grid.map((row, y) =>
      row.map((_, x) => neighbors8(x, y, grid, w, h) < 4)
    );
  }

  const largest = floodFill(grid, w, h);

  const tiles: Tile[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const key = `${x},${y}`;
      const isFloor = largest.has(key);
      tiles.push({
        x: region.x + x,
        y: region.y + y,
        terrain: isFloor ? "stone" : "void",
        structuralElement: null,
        hidden: false,
        revealed: false,
      });
    }
  }

  void cellSize;
  return { ok: true, tiles };
}
