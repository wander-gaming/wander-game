import type { StateCreator } from "zustand";
import type {
  SheetTemplate,
  Character,
  CharacterSheet,
  FieldDefinition,
  FieldValue,
  ValidationResult,
} from "@/types/index";

export interface CharacterSlice {
  templates: SheetTemplate[];
  characters: Character[];
  sheets: CharacterSheet[];
  addField: (templateId: string, field: FieldDefinition) => ValidationResult;
  deleteField: (templateId: string, fieldId: string) => void;
  updateSheetValue: (sheetId: string, fieldId: string, value: FieldValue) => ValidationResult;
}

export const createCharacterSlice: StateCreator<CharacterSlice> = (set, get) => ({
  templates: [],
  characters: [],
  sheets: [],

  addField(templateId, field) {
    const { templates, sheets } = get();
    const template = templates.find((t) => t.id === templateId);
    if (!template) return { ok: false, error: "Template not found" };

    const duplicate = template.fields.some(
      (f) => f.name.toLowerCase() === field.name.toLowerCase()
    );
    if (duplicate) return { ok: false, error: `Field name "${field.name}" already exists` };

    set({
      templates: templates.map((t) =>
        t.id === templateId ? { ...t, fields: [...t.fields, field] } : t
      ),
      sheets: sheets.map((s) =>
        s.templateId === templateId
          ? { ...s, values: { ...s.values, [field.id]: field.defaultValue } }
          : s
      ),
    });

    return { ok: true };
  },

  deleteField(templateId, fieldId) {
    const { templates, sheets } = get();

    set({
      templates: templates.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          fields: t.fields.filter((f) => f.id !== fieldId),
          sections: t.sections.map((s) => ({
            ...s,
            fieldIds: s.fieldIds.filter((id) => id !== fieldId),
          })),
        };
      }),
      sheets: sheets.map((s) => {
        if (s.templateId !== templateId) return s;
        const values = { ...s.values };
        delete values[fieldId];
        return { ...s, values };
      }),
    });
  },

  updateSheetValue(sheetId, fieldId, value) {
    const { sheets, templates } = get();
    const sheet = sheets.find((s) => s.id === sheetId);
    if (!sheet) return { ok: false, error: "Sheet not found" };

    const template = templates.find((t) => t.id === sheet.templateId);
    if (!template) return { ok: false, error: "Template not found" };

    const field = template.fields.find((f) => f.id === fieldId);
    if (!field) return { ok: false, error: "Field not found" };

    if (field.type === "numeric") {
      if (typeof value !== "number") return { ok: false, error: "Expected a number" };
      const min = field.min ?? -999999;
      const max = field.max ?? 999999;
      if (value < min || value > max) {
        return { ok: false, error: `Value must be between ${min} and ${max}` };
      }
    } else if (field.type === "text") {
      if (typeof value !== "string") return { ok: false, error: "Expected a string" };
    } else if (field.type === "checkbox") {
      if (typeof value !== "boolean") return { ok: false, error: "Expected a boolean" };
    } else if (field.type === "dropdown") {
      if (typeof value !== "string") return { ok: false, error: "Expected a string" };
      if (!field.options?.includes(value)) {
        return { ok: false, error: `"${value}" is not a valid option` };
      }
    }

    set({
      sheets: sheets.map((s) =>
        s.id === sheetId ? { ...s, values: { ...s.values, [fieldId]: value } } : s
      ),
    });

    return { ok: true };
  },
});
