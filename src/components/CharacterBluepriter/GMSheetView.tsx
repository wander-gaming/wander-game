import { useStore } from "@/store";
import type { FieldDefinition } from "@/types";

export function GMSheetView() {
  const participants = useStore(s => s.participants);
  const characters = useStore(s => s.characters);
  const sheets = useStore(s => s.sheets);
  const templates = useStore(s => s.templates);

  const players = participants.filter(p => p.role === "player" && p.characterId !== null);

  if (players.length === 0) {
    return <div style={{ padding: 16 }}>No players in session.</div>;
  }

  function renderFieldValue(field: FieldDefinition, value: string | number | boolean | undefined) {
    if (field.type === "checkbox") {
      return value ? "Yes" : "No";
    }
    return value !== undefined ? String(value) : "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 16 }}>
      {players.map(participant => {
        const character = characters.find(c => c.id === participant.characterId);
        const sheet = character ? sheets.find(s => s.id === character.sheetId) : null;
        const template = sheet ? templates.find(t => t.id === sheet.templateId) : null;

        if (!character || !sheet || !template) {
          return (
            <div key={participant.userId}>
              <h2 style={{ margin: "0 0 4px 0" }}>{participant.displayName}</h2>
              <span style={{ color: "#888", fontSize: 13 }}>No sheet available.</span>
            </div>
          );
        }

        const assignedFieldIds = new Set(template.sections.flatMap(s => s.fieldIds));
        const unsectionedFields = template.fields.filter(f => !assignedFieldIds.has(f.id));

        return (
          <div key={participant.userId}>
            <h2 style={{ margin: "0 0 12px 0" }}>{participant.displayName}</h2>

            {template.sections.map(section => {
              const sectionFields = section.fieldIds
                .map(id => template.fields.find(f => f.id === id))
                .filter((f): f is FieldDefinition => f !== undefined);

              return (
                <div key={section.id} style={{ marginBottom: 12 }}>
                  <h3 style={{ margin: "0 0 8px 0" }}>{section.name}</h3>
                  {sectionFields.map(field => (
                    <div key={field.id} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{field.name}:</span>
                      <span>{renderFieldValue(field, sheet.values[field.id])}</span>
                    </div>
                  ))}
                </div>
              );
            })}

            {unsectionedFields.length > 0 && (
              <div>
                {template.sections.length > 0 && (
                  <h3 style={{ margin: "0 0 8px 0" }}>Other</h3>
                )}
                {unsectionedFields.map(field => (
                  <div key={field.id} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>{field.name}:</span>
                    <span>{renderFieldValue(field, sheet.values[field.id])}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
