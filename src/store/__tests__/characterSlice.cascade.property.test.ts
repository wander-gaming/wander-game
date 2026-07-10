// Feature: wander-game, Property 12: Cascade field delete
// Feature: wander-game, Property 13: Character sheet field type validation
import * as fc from "fast-check";
import { create } from "zustand";
import { createCharacterSlice, type CharacterSlice } from "../characterSlice";
import type { SheetTemplate, CharacterSheet, FieldDefinition } from "@/types";

const now = new Date().toISOString();

const makeTemplate = (fields: FieldDefinition[]): SheetTemplate => ({
  id: "tpl-1",
  schemaVersion: 1,
  createdAt: now,
  updatedAt: now,
  campaignId: "camp-1",
  name: "Test Template",
  fields,
  sections: [],
});

const makeSheet = (id: string, fields: FieldDefinition[]): CharacterSheet => ({
  id,
  schemaVersion: 1,
  createdAt: now,
  updatedAt: now,
  campaignId: "camp-1",
  templateId: "tpl-1",
  characterId: `char-${id}`,
  values: Object.fromEntries(fields.map((f) => [f.id, f.defaultValue])),
});

const fieldArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1 }),
  type: fc.constantFrom("text" as const),
  defaultValue: fc.string(),
});

describe("Property 12: Cascade field delete", () => {
  it("deleted field id is absent from all derived sheet values", () => {
    // Validates: Requirements 4.6
    fc.assert(
      fc.property(
        fc.array(fieldArb, { minLength: 1, maxLength: 5 }).chain((fields) =>
          fc.tuple(
            fc.constant(fields),
            fc.integer({ min: 0, max: fields.length - 1 }),
            fc.array(fc.uuid(), { minLength: 1, maxLength: 3 })
          )
        ),
        ([fields, idx, sheetIds]) => {
          const store = create<CharacterSlice>()((...a) => createCharacterSlice(...a));
          const sheets = sheetIds.map((id) => makeSheet(id, fields));
          store.setState({ templates: [makeTemplate(fields)], sheets });

          store.getState().deleteField("tpl-1", fields[idx].id);

          const deletedId = fields[idx].id;
          const updatedSheets = store.getState().sheets;
          return updatedSheets.every((s) => !(deletedId in s.values));
        }
      )
    );
  });
});

describe("Property 13: Character sheet field type validation", () => {
  const makeStore = (field: FieldDefinition) => {
    const store = create<CharacterSlice>()((...a) => createCharacterSlice(...a));
    store.setState({
      templates: [makeTemplate([field])],
      sheets: [makeSheet("sheet-1", [field])],
    });
    return store;
  };

  it("numeric field rejects non-number values", () => {
    // Validates: Requirements 5.4
    const field: FieldDefinition = {
      id: "f1",
      name: "HP",
      type: "numeric",
      defaultValue: 0,
    };
    fc.assert(
      fc.property(
        fc.oneof(fc.string({ minLength: 1 }), fc.boolean()),
        (value) => {
          const store = makeStore(field);
          const result = store.getState().updateSheetValue("sheet-1", "f1", value);
          return result.ok === false;
        }
      )
    );
  });

  it("numeric field rejects values outside default range", () => {
    // Validates: Requirements 5.4
    const field: FieldDefinition = {
      id: "f1",
      name: "HP",
      type: "numeric",
      defaultValue: 0,
    };
    fc.assert(
      fc.property(
        fc.integer().filter((n) => n < -999999 || n > 999999),
        (value) => {
          const store = makeStore(field);
          const result = store.getState().updateSheetValue("sheet-1", "f1", value);
          return result.ok === false;
        }
      )
    );
  });

  it("text field rejects non-string values", () => {
    // Validates: Requirements 5.5
    const field: FieldDefinition = {
      id: "f1",
      name: "Notes",
      type: "text",
      defaultValue: "",
    };
    fc.assert(
      fc.property(
        fc.oneof(fc.integer(), fc.boolean()),
        (value) => {
          const store = makeStore(field);
          const result = store.getState().updateSheetValue("sheet-1", "f1", value);
          return result.ok === false;
        }
      )
    );
  });

  it("checkbox field rejects non-boolean values", () => {
    // Validates: Requirements 5.5
    const field: FieldDefinition = {
      id: "f1",
      name: "Active",
      type: "checkbox",
      defaultValue: false,
    };
    fc.assert(
      fc.property(
        fc.oneof(fc.string({ minLength: 1 }), fc.integer()),
        (value) => {
          const store = makeStore(field);
          const result = store.getState().updateSheetValue("sheet-1", "f1", value);
          return result.ok === false;
        }
      )
    );
  });

  it("dropdown field rejects values not in options", () => {
    // Validates: Requirements 5.5
    const options = ["a", "b", "c"];
    const field: FieldDefinition = {
      id: "f1",
      name: "Choice",
      type: "dropdown",
      defaultValue: "a",
      options,
    };
    fc.assert(
      fc.property(
        fc.string().filter((s) => !options.includes(s)),
        (value) => {
          const store = makeStore(field);
          const result = store.getState().updateSheetValue("sheet-1", "f1", value);
          return result.ok === false;
        }
      )
    );
  });
});
