import { useState } from "react";
import { useStore } from "@/store";
import type { FieldDefinition } from "@/types";

interface Props {
  sheetId: string;
}

export function CharacterSheet({ sheetId }: Props) {
  const sheets = useStore(s => s.sheets);
  const characters = useStore(s => s.characters);
  const templates = useStore(s => s.templates);
  const updateSheetValue = useStore(s => s.updateSheetValue);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const sheet = sheets.find(s => s.id === sheetId);
  const character = sheet ? characters.find(c => c.id === sheet.characterId) : null;
  const template = sheet ? templates.find(t => t.id === sheet.templateId) : null;

  if (!sheet || !character || !template) {
    return <div>Character sheet not found.</div>;
  }

  function handleChange(fieldId: string, value: string | number | boolean) {
    const result = updateSheetValue(sheetId, fieldId, value);
    if (!result.ok) {
      setErrors(prev => ({ ...prev, [fieldId]: result.error }));
    } else {
      setErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  }

  function renderField(field: FieldDefinition) {
    const value = sheet!.values[field.id];
    const error = errors[field.id];

    let input: React.ReactNode;

    if (field.type === "text") {
      input = (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={e => handleChange(field.id, e.target.value)}
        />
      );
    } else if (field.type === "numeric") {
      input = (
        <input
          type="number"
          value={typeof value === "number" ? value : 0}
          min={field.min}
          max={field.max}
          onChange={e => handleChange(field.id, Number(e.target.value))}
        />
      );
    } else if (field.type === "checkbox") {
      input = (
        <input
          type="checkbox"
          checked={typeof value === "boolean" ? value : false}
          onChange={e => handleChange(field.id, e.target.checked)}
        />
      );
    } else if (field.type === "dropdown") {
      input = (
        <select
          value={typeof value === "string" ? value : ""}
          onChange={e => handleChange(field.id, e.target.value)}
        >
          {(field.options ?? []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    return (
      <div key={field.id} style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>{field.name}</span>
          {input}
        </label>
        {error && <span style={{ color: "red", fontSize: 12 }}>{error}</span>}
      </div>
    );
  }

  const assignedFieldIds = new Set(template.sections.flatMap(s => s.fieldIds));
  const unsectionedFields = template.fields.filter(f => !assignedFieldIds.has(f.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
      <h2 style={{ margin: 0 }}>{character.name}</h2>

      {template.sections.map(section => {
        const sectionFields = section.fieldIds
          .map(id => template.fields.find(f => f.id === id))
          .filter((f): f is FieldDefinition => f !== undefined);

        return (
          <div key={section.id}>
            <h3 style={{ margin: "0 0 8px 0" }}>{section.name}</h3>
            {sectionFields.map(renderField)}
          </div>
        );
      })}

      {unsectionedFields.length > 0 && (
        <div>
          {template.sections.length > 0 && (
            <h3 style={{ margin: "0 0 8px 0" }}>Other</h3>
          )}
          {unsectionedFields.map(renderField)}
        </div>
      )}
    </div>
  );
}
