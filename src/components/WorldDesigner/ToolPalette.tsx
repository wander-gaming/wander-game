import { useStore } from "@/store";
import type { TerrainType } from "@/types";

const TERRAINS: TerrainType[] = ["grass", "stone", "dirt", "water", "sand", "snow", "void"];

interface Props {
  selectedTerrain: TerrainType;
  onSelectTerrain: (t: TerrainType) => void;
}

export function ToolPalette({ selectedTerrain, onSelectTerrain }: Props) {
  const undo = useStore(s => s.undo);
  const redo = useStore(s => s.redo);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 8, width: 100 }}>
      {TERRAINS.map(t => (
        <button
          key={t}
          onClick={() => onSelectTerrain(t)}
          style={{ fontWeight: selectedTerrain === t ? "bold" : "normal" }}
        >
          {t}
        </button>
      ))}
      <hr />
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
    </div>
  );
}
