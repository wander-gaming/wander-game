import { create } from "zustand";
import { createCharacterSlice, type CharacterSlice } from "../characterSlice";
import type { SheetTemplate, SectionDefinition, FieldDefinition, Token, CharacterSheet } from "@/types";

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

const numericField = (): FieldDefinition => ({
  id: "f1",
  name: "HP",
  type: "numeric",
  defaultValue: 0,
});

const makeStore = () => create<CharacterSlice>()((...a) => createCharacterSlice(...a));

const baseToken = (): Token => ({
  id: "tok-1",
  schemaVersion: 1,
  createdAt: now,
  updatedAt: now,
  characterId: "char-1",
  mapId: "map-1",
  x: 0,
  y: 0,
  visionRadius: 3,
  hidden: false,
  ownerId: "user-1",
});

describe("setTokens / updateTokenPosition", () => {
  it("setTokens replaces token list", () => {
    const store = makeStore();
    store.getState().setTokens([baseToken()]);
    expect(store.getState().tokens).toHaveLength(1);
    expect(store.getState().tokens[0].id).toBe("tok-1");
  });

  it("updateTokenPosition moves a token", () => {
    const store = makeStore();
    store.getState().setTokens([baseToken()]);
    store.getState().updateTokenPosition("tok-1", 5, 10);
    const token = store.getState().tokens[0];
    expect(token.x).toBe(5);
    expect(token.y).toBe(10);
  });

  it("updateTokenPosition ignores unknown ids", () => {
    const store = makeStore();
    store.getState().setTokens([baseToken()]);
    store.getState().updateTokenPosition("no-such-token", 5, 10);
    expect(store.getState().tokens[0].x).toBe(0);
  });
});

describe("addTemplate", () => {
  it("adds a template to the list", () => {
    const store = makeStore();
    store.getState().addTemplate(baseTemplate());
    expect(store.getState().templates).toHaveLength(1);
  });
});

describe("addSection / deleteSection", () => {
  const section: SectionDefinition = { id: "sec-1", name: "Attributes", fieldIds: [] };

  it("addSection adds a section to the template", () => {
    const store = makeStore();
    store.setState({ templates: [baseTemplate()] });
    store.getState().addSection("tpl-1", section);
    expect(store.getState().templates[0].sections).toHaveLength(1);
    expect(store.getState().templates[0].sections[0].id).toBe("sec-1");
  });

  it("deleteSection removes the section", () => {
    const store = makeStore();
    store.setState({ templates: [{ ...baseTemplate(), sections: [section] }] });
    store.getState().deleteSection("tpl-1", "sec-1");
    expect(store.getState().templates[0].sections).toHaveLength(0);
  });
});

describe("assignFieldToSection / unassignFieldFromSection", () => {
  const section: SectionDefinition = { id: "sec-1", name: "Attributes", fieldIds: [] };

  it("assigns a field to a section", () => {
    const store = makeStore();
    store.setState({ templates: [{ ...baseTemplate(), fields: [numericField()], sections: [section] }] });
    store.getState().assignFieldToSection("tpl-1", "sec-1", "f1");
    expect(store.getState().templates[0].sections[0].fieldIds).toContain("f1");
  });

  it("does not duplicate a field already in the section", () => {
    const store = makeStore();
    store.setState({
      templates: [{ ...baseTemplate(), fields: [numericField()], sections: [{ ...section, fieldIds: ["f1"] }] }],
    });
    store.getState().assignFieldToSection("tpl-1", "sec-1", "f1");
    expect(store.getState().templates[0].sections[0].fieldIds).toHaveLength(1);
  });

  it("unassigns a field from a section", () => {
    const store = makeStore();
    store.setState({
      templates: [{ ...baseTemplate(), fields: [numericField()], sections: [{ ...section, fieldIds: ["f1"] }] }],
    });
    store.getState().unassignFieldFromSection("tpl-1", "sec-1", "f1");
    expect(store.getState().templates[0].sections[0].fieldIds).toHaveLength(0);
  });
});

describe("addField edge cases", () => {
  it("returns error when template not found", () => {
    const store = makeStore();
    const result = store.getState().addField("no-such-template", numericField());
    expect(result.ok).toBe(false);
  });

  it("propagates default value to existing sheets", () => {
    const sheet: CharacterSheet = {
      id: "sheet-1",
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      campaignId: "camp-1",
      templateId: "tpl-1",
      characterId: "char-1",
      values: {},
    };
    const store = makeStore();
    store.setState({ templates: [baseTemplate()], sheets: [sheet] });
    store.getState().addField("tpl-1", numericField());
    expect(store.getState().sheets[0].values["f1"]).toBe(0);
  });
});

describe("updateSheetValue error paths", () => {
  it("returns error when sheet not found", () => {
    const store = makeStore();
    const result = store.getState().updateSheetValue("no-sheet", "f1", 10);
    expect(result.ok).toBe(false);
  });

  it("returns error when template not found", () => {
    const store = makeStore();
    const sheet: CharacterSheet = {
      id: "sheet-1",
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      campaignId: "camp-1",
      templateId: "no-template",
      characterId: "char-1",
      values: {},
    };
    store.setState({ sheets: [sheet], templates: [] });
    const result = store.getState().updateSheetValue("sheet-1", "f1", 10);
    expect(result.ok).toBe(false);
  });

  it("returns error when field not found", () => {
    const store = makeStore();
    const sheet: CharacterSheet = {
      id: "sheet-1",
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      campaignId: "camp-1",
      templateId: "tpl-1",
      characterId: "char-1",
      values: {},
    };
    store.setState({ templates: [baseTemplate()], sheets: [sheet] });
    const result = store.getState().updateSheetValue("sheet-1", "no-field", 10);
    expect(result.ok).toBe(false);
  });

  it("accepts a valid numeric value", () => {
    const store = makeStore();
    const field = numericField();
    const sheet: CharacterSheet = {
      id: "sheet-1",
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      campaignId: "camp-1",
      templateId: "tpl-1",
      characterId: "char-1",
      values: { [field.id]: 0 },
    };
    store.setState({ templates: [{ ...baseTemplate(), fields: [field] }], sheets: [sheet] });
    const result = store.getState().updateSheetValue("sheet-1", field.id, 42);
    expect(result.ok).toBe(true);
    expect(store.getState().sheets[0].values[field.id]).toBe(42);
  });

  it("accepts a valid text value", () => {
    const store = makeStore();
    const field: FieldDefinition = { id: "f2", name: "Notes", type: "text", defaultValue: "" };
    const sheet: CharacterSheet = {
      id: "sheet-1",
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      campaignId: "camp-1",
      templateId: "tpl-1",
      characterId: "char-1",
      values: { [field.id]: "" },
    };
    store.setState({ templates: [{ ...baseTemplate(), fields: [field] }], sheets: [sheet] });
    const result = store.getState().updateSheetValue("sheet-1", field.id, "hello");
    expect(result.ok).toBe(true);
  });

  it("accepts a valid checkbox value", () => {
    const store = makeStore();
    const field: FieldDefinition = { id: "f3", name: "Active", type: "checkbox", defaultValue: false };
    const sheet: CharacterSheet = {
      id: "sheet-1",
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      campaignId: "camp-1",
      templateId: "tpl-1",
      characterId: "char-1",
      values: { [field.id]: false },
    };
    store.setState({ templates: [{ ...baseTemplate(), fields: [field] }], sheets: [sheet] });
    const result = store.getState().updateSheetValue("sheet-1", field.id, true);
    expect(result.ok).toBe(true);
  });

  it("accepts a valid dropdown value", () => {
    const store = makeStore();
    const field: FieldDefinition = {
      id: "f4",
      name: "Class",
      type: "dropdown",
      defaultValue: "warrior",
      options: ["warrior", "mage"],
    };
    const sheet: CharacterSheet = {
      id: "sheet-1",
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      campaignId: "camp-1",
      templateId: "tpl-1",
      characterId: "char-1",
      values: { [field.id]: "warrior" },
    };
    store.setState({ templates: [{ ...baseTemplate(), fields: [field] }], sheets: [sheet] });
    const result = store.getState().updateSheetValue("sheet-1", field.id, "mage");
    expect(result.ok).toBe(true);
  });
});

describe("deleteField cross-template isolation", () => {
  it("does not modify sheets belonging to a different template", () => {
    const store = makeStore();
    const field = numericField();
    const otherSheet: CharacterSheet = {
      id: "other-sheet",
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      campaignId: "camp-1",
      templateId: "other-tpl",
      characterId: "char-2",
      values: { [field.id]: 99 },
    };
    store.setState({
      templates: [{ ...baseTemplate(), fields: [field] }],
      sheets: [otherSheet],
    });
    store.getState().deleteField("tpl-1", field.id);
    expect(store.getState().sheets[0].values[field.id]).toBe(99);
  });
});
