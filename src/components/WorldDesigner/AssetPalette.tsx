import type { StructuralElementType } from "@/types";

const ELEMENTS: StructuralElementType[] = ["wall", "door", "window", "stairs", "furniture"];

export function AssetPalette() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 8, width: 100 }}>
      {ELEMENTS.map(el => (
        <div
          key={el}
          draggable
          onDragStart={e => e.dataTransfer.setData("elementType", el)}
          style={{ cursor: "grab", padding: "4px 8px", border: "1px solid #ccc", userSelect: "none" }}
        >
          {el}
        </div>
      ))}
    </div>
  );
}
