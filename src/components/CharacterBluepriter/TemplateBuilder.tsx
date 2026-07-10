import { useCallback, useState } from "react";
import { useStore, store } from "@/store";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { Campaign, FieldType, FieldDefinition, SectionDefinition } from "@/types";

interface Props {
  templateId: string;
}

const FIELD_TYPES: FieldType[] = ["text", "numeric", "checkbox", "dropdown"];

function newId() {
  return crypto.randomUUID();
}

interface FieldFormState {
  name: string;
  type: FieldType;
  defaultText: string;
  defaultNum: number;
  defaultBool: boolean;
  min: string;
  max: string;
  optionsRaw: string;
}

function initForm(): FieldFormState {
  return {
    name: "",
    type: "text",
    defaultText: "",
    defaultNum: 0,
    defaultBool: false,
    min: "",
    max: "",
    optionsRaw: "",
  };
}

const NOW = new Date().toISOString();

const STUB_CAMPAIGN_ID = "local";

function buildCampaign(): Campaign | null {
  const s = store.getState();
  const map = s.map;
  return {
    id: STUB_CAMPAIGN_ID,
    schemaVersion: 1,
    createdAt: NOW,
    updatedAt: new Date().toISOString(),
    name: "local",
    ownerId: "local",
    maps: map ? [map] : [],
    templates: s.templates,
    characters: s.characters,
    sheets: s.sheets,
    tokens: [],
    story: s.graph,
    triggers: [],
  };
}

export function TemplateBuilder({ templateId }: Props) {
  const templates = useStore(s => s.templates);
  const addField = useStore(s => s.addField);
  const deleteField = useStore(s => s.deleteField);
  const addSection = useStore(s => s.addSection);
  const deleteSection = useStore(s => s.deleteSection);
  const assignFieldToSection = useStore(s => s.assignFieldToSection);
  const unassignFieldFromSection = useStore(s => s.unassignFieldFromSection);

  const template = templates.find(t => t.id === templateId);

  const [form, setForm] = useState<FieldFormState>(initForm);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [saved, setSaved] = useState(false);

  const getCampaign = useCallback(buildCampaign, []);
  useAutoSave(getCampaign, `/api/campaigns/${STUB_CAMPAIGN_ID}`);

  if (!template) {
    return <div>Template not found.</div>;
  }

  function setFormField<K extends keyof FieldFormState>(key: K, value: FieldFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleTypeChange(type: FieldType) {
    setForm(prev => ({ ...prev, type, defaultText: "", defaultNum: 0, defaultBool: false }));
  }

  function buildFieldDef(): FieldDefinition {
    const base = {
      id: newId(),
      name: form.name.trim(),
      type: form.type,
    };

    if (form.type === "numeric") {
      const def: FieldDefinition = { ...base, defaultValue: form.defaultNum };
      if (form.min !== "") def.min = Number(form.min);
      if (form.max !== "") def.max = Number(form.max);
      return def;
    }

    if (form.type === "checkbox") {
      return { ...base, defaultValue: form.defaultBool };
    }

    if (form.type === "dropdown") {
      const options = form.optionsRaw
        .split(",")
        .map(o => o.trim())
        .filter(Boolean);
      return { ...base, defaultValue: form.defaultText, options };
    }

    return { ...base, defaultValue: form.defaultText };
  }

  function handleAddField() {
    if (!form.name.trim()) return;
    const field = buildFieldDef();
    const result = addField(templateId, field);
    if (!result.ok) {
      setFieldError(result.error);
      return;
    }
    setFieldError(null);
    setForm(initForm());
  }

  function handleAddSection() {
    if (!sectionName.trim()) return;
    const section: SectionDefinition = {
      id: newId(),
      name: sectionName.trim(),
      fieldIds: [],
    };
    addSection(templateId, section);
    setSectionName("");
  }

  function toggleFieldInSection(sectionId: string, fieldId: string, assigned: boolean) {
    if (assigned) {
      unassignFieldFromSection(templateId, sectionId, fieldId);
    } else {
      assignFieldToSection(templateId, sectionId, fieldId);
    }
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>{template.name} - Fields</h2>
        <button onClick={handleSave}>Save</button>
        {saved && (
          <span style={{ color: "green", fontSize: 13 }}>Saved</span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400 }}>
        <input
          placeholder="Field name"
          value={form.name}
          onChange={e => setFormField("name", e.target.value)}
        />

        <select value={form.type} onChange={e => handleTypeChange(e.target.value as FieldType)}>
          {FIELD_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {form.type === "text" && (
          <input
            placeholder="Default value"
            value={form.defaultText}
            onChange={e => setFormField("defaultText", e.target.value)}
          />
        )}

        {form.type === "numeric" && (
          <>
            <input
              type="number"
              placeholder="Default value"
              value={form.defaultNum}
              onChange={e => setFormField("defaultNum", Number(e.target.value))}
            />
            <input
              type="number"
              placeholder="Min (optional)"
              value={form.min}
              onChange={e => setFormField("min", e.target.value)}
            />
            <input
              type="number"
              placeholder="Max (optional)"
              value={form.max}
              onChange={e => setFormField("max", e.target.value)}
            />
          </>
        )}

        {form.type === "checkbox" && (
          <label>
            Default checked:
            <input
              type="checkbox"
              checked={form.defaultBool}
              onChange={e => setFormField("defaultBool", e.target.checked)}
              style={{ marginLeft: 4 }}
            />
          </label>
        )}

        {form.type === "dropdown" && (
          <>
            <input
              placeholder="Options (comma-separated)"
              value={form.optionsRaw}
              onChange={e => setFormField("optionsRaw", e.target.value)}
            />
            <input
              placeholder="Default value"
              value={form.defaultText}
              onChange={e => setFormField("defaultText", e.target.value)}
            />
          </>
        )}

        {fieldError && (
          <div style={{ color: "red" }}>{fieldError}</div>
        )}

        <button onClick={handleAddField}>Add field</button>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {template.fields.map(field => (
          <li key={field.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <span>{field.name}</span>
            <span style={{ color: "#888", fontSize: 12 }}>({field.type})</span>
            <button onClick={() => deleteField(templateId, field.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <h2>Sections</h2>

      <div style={{ display: "flex", gap: 8, maxWidth: 400 }}>
        <input
          placeholder="Section name"
          value={sectionName}
          onChange={e => setSectionName(e.target.value)}
          style={{ flex: 1 }}
        />
        <button onClick={handleAddSection}>Add section</button>
      </div>

      {template.sections.map(section => (
        <div key={section.id} style={{ border: "1px solid #ccc", padding: 12, maxWidth: 400 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong>{section.name}</strong>
            <button onClick={() => deleteSection(templateId, section.id)}>Delete</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {template.fields.map(field => {
              const assigned = section.fieldIds.includes(field.id);
              return (
                <label key={field.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={assigned}
                    onChange={() => toggleFieldInSection(section.id, field.id, assigned)}
                  />
                  {field.name}
                </label>
              );
            })}
            {template.fields.length === 0 && (
              <span style={{ color: "#888", fontSize: 12 }}>No fields yet.</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
