import { useState } from "react";
import { useStore } from "@/store";
import { snapToGrid } from "@/utils/grid";
import { CanvasMount } from "@/renderer/CanvasMount";
import { ToolPalette } from "./ToolPalette";
import { AssetPalette } from "./AssetPalette";
import type { TerrainType, StructuralElementType, CellSize, GeneratorResult } from "@/types";
import type { LayoutType } from "@/workers/generators/index";

const CELL_SIZES: CellSize[] = [16, 32, 64];
const GEN_TYPES: LayoutType[] = ["dungeon", "cave", "tavern"];

export function WorldDesigner() {
  const paintTile = useStore(s => s.paintTile);
  const placeElement = useStore(s => s.placeElement);
  const map = useStore(s => s.map);
  const storeCellSize = useStore(s => s.cellSize);

  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType>("grass");
  const [cellSize, setCellSize] = useState<CellSize>(storeCellSize);
  const [genType, setGenType] = useState<LayoutType>("dungeon");
  const [genError, setGenError] = useState<string | null>(null);

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = snapToGrid(e.clientX - rect.left, e.clientY - rect.top, cellSize);
    paintTile(x, y, selectedTerrain);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const el = e.dataTransfer.getData("elementType") as StructuralElementType;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = snapToGrid(e.clientX - rect.left, e.clientY - rect.top, cellSize);
    placeElement(x, y, el);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleGenerate() {
    setGenError(null);
    const worker = new Worker(
      new URL("../../workers/generators/index.ts", import.meta.url),
      { type: "module" }
    );
    worker.postMessage({
      type: genType,
      region: { x: 0, y: 0, width: map?.width ?? 32, height: map?.height ?? 32 },
      cellSize,
    });
    worker.onmessage = (e: MessageEvent<GeneratorResult>) => {
      worker.terminate();
      const result = e.data;
      if (!result.ok) {
        setGenError(result.error);
        return;
      }
      for (const tile of result.tiles) {
        paintTile(tile.x, tile.y, tile.terrain);
      }
    };
  }

  return (
    <div style={{ display: "flex", height: "100%", width: "100%" }}>
      <ToolPalette selectedTerrain={selectedTerrain} onSelectTerrain={setSelectedTerrain} />

      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", gap: 8, padding: 8, alignItems: "center" }}>
          <label>
            Cell size:
            <select
              value={cellSize}
              onChange={e => setCellSize(Number(e.target.value) as CellSize)}
              style={{ marginLeft: 4 }}
            >
              {CELL_SIZES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label>
            Generate:
            <select
              value={genType}
              onChange={e => setGenType(e.target.value as LayoutType)}
              style={{ marginLeft: 4 }}
            >
              {GEN_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <button onClick={handleGenerate}>Generate</button>

          {genError && (
            <div style={{ color: "red", marginLeft: 8 }}>{genError}</div>
          )}
        </div>

        <div
          style={{ flex: 1, position: "relative" }}
          onClick={handleCanvasClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <CanvasMount />
        </div>
      </div>

      <AssetPalette />
    </div>
  );
}
