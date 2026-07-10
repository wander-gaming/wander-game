import type { CellSize } from "@/types";

export function snapToGrid(pixelX: number, pixelY: number, cellSize: CellSize): { x: number; y: number } {
  return {
    x: Math.round(pixelX / cellSize),
    y: Math.round(pixelY / cellSize),
  };
}
