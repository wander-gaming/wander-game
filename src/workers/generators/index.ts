import type { TriggerRegion, CellSize, GeneratorResult } from "@/types";
import { generateDungeon } from "./dungeon";
import { generateCave } from "./cave";
import { generateTavern } from "./tavern";

export type LayoutType = "dungeon" | "cave" | "tavern";

export interface GenerateRequest {
  type: LayoutType;
  region: TriggerRegion;
  cellSize: CellSize;
}

export function generateLayout(type: LayoutType, region: TriggerRegion, cellSize: CellSize): GeneratorResult {
  try {
    switch (type) {
      case "dungeon": return generateDungeon(region, cellSize);
      case "cave":    return generateCave(region, cellSize);
      case "tavern":  return generateTavern(region, cellSize);
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

self.onmessage = (e: MessageEvent<GenerateRequest>) => {
  const { type, region, cellSize } = e.data;
  const result = generateLayout(type, region, cellSize);
  self.postMessage(result);
};
