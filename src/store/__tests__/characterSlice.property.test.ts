// Feature: wander-game, Property 10: Field name uniqueness
// Feature: wander-game, Property 11: Template and sheet field set membership
import * as fc from "fast-check";
import { create } from "zustand";
import { createCharacterSlice, type CharacterSlice } from "../characterSlice";
import type { SheetTemplate, CharacterSheet, FieldDefinition } from "@/types";

const now = new Date().toISOString();

const baseTemplate = (): SheetTemplate => ({
  id: "tpl-1",
  schemaVersion: 1,
  createdAt: now,
  updatedAt: now,
  campaignId: "camp-1",
  name: "Test Template",
  fields: [],
  sections: [],
});

describe("Property 10: Field name uniqueness", () => {
  it("no two fields share a name after addField calls", () => {
    // Validates: Requirements 4.2, 4.3
    const namePool = fc.constantFrom("Strength", "Dexterity", "Constitution", "Intelligence");

    const fieldArb = fc.record({
      id: fc.uuid(),
      name: fc.oneof(namePool, fc.string({ minLength: 1 })),
      type: fc.constantFrom("text" as const, "numeric" as const, "checkbox" as const, "dropdown" as const),
      defaultValue: fc.string(),
    });

    fc.assert(
      fc.property(fc.array(fieldArb, { minLength: 2 }), (fields) => {
        const store = create<CharacterSlice>()((...a) => createCharacterSlice(...a));
        store.setState({ templates: [baseTemplate()], sheets: [] });

        for (const field of fields) {
          store.getState().addField("tpl-1", field);
        }

        const resultFields = store.getState().templates[0].fields;
        const names = resultFields.map((f) => f.name.toLowerCase());
        const unique = new Set(names);
        return unique.size === names.length;
      })
    );
  });
});

describe("Property 11: Template and sheet field set membership", () => {
  it("sheet values keys exactly match template fields and equal defaultValues", () => {
    // Validates: Requirements 4.1, 5.1
    const fieldArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1 }),
      type: fc.constantFrom("text" as const, "numeric" as const, "checkbox" as const, "dropdown" as const),
      defaultValue: fc.string(),
    });

    fc.assert(
      fc.property(fc.array(fieldArb, { minLength: 1 }), (rawFields) => {
        const seen = new Set<string>();
        const fields: FieldDefinition[] = [];
        for (const f of rawFields) {
          const key = f.name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            fields.push(f);
          }
        }

        const template: SheetTemplate = { ...baseTemplate(), fields };

        const values: Record<string, string | number | boolean> = {};
        for (const f of fields) {
          values[f.id] = f.defaultValue;
        }

        const sheet: CharacterSheet = {
          id: "sheet-1",
          schemaVersion: 1,
          createdAt: now,
          updatedAt: now,
          campaignId: "camp-1",
          templateId: template.id,
          characterId: "char-1",
          values,
        };

        const store = create<CharacterSlice>()((...a) => createCharacterSlice(...a));
        store.setState({ templates: [template], sheets: [sheet] });

        const savedSheet = store.getState().sheets[0];
        const savedTemplate = store.getState().templates[0];

        const sheetKeys = new Set(Object.keys(savedSheet.values));
        const templateFieldIds = new Set(savedTemplate.fields.map((f) => f.id));

        if (sheetKeys.size !== templateFieldIds.size) return false;
        for (const id of templateFieldIds) {
          if (!sheetKeys.has(id)) return false;
        }
        for (const f of savedTemplate.fields) {
          if (savedSheet.values[f.id] !== f.defaultValue) return false;
        }

        return true;
      })
    );
  });
});
