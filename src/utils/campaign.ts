import type { Campaign } from "@/types";
import { CampaignParseError } from "@/types";

function sortKeys(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(sortKeys);
  if (val !== null && typeof val === "object") {
    return Object.fromEntries(
      Object.keys(val as object)
        .sort()
        .map((k) => [k, sortKeys((val as Record<string, unknown>)[k])])
    );
  }
  return val;
}

export function serializeCampaign(c: Campaign): string {
  return JSON.stringify(sortKeys(c));
}

const required = [
  "id", "name", "ownerId", "maps", "templates",
  "characters", "sheets", "tokens", "story", "triggers",
] as const;

export function deserializeCampaign(json: string): Campaign {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new CampaignParseError("Invalid JSON");
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CampaignParseError("Expected a JSON object");
  }

  const obj = parsed as Record<string, unknown>;

  const sv = obj["schemaVersion"];
  if (typeof sv !== "number" || !Number.isFinite(sv) || sv <= 0) {
    throw new CampaignParseError("Invalid schemaVersion");
  }

  for (const key of required) {
    if (!(key in obj)) {
      throw new CampaignParseError(`Missing required field: ${key}`);
    }
  }

  return obj as unknown as Campaign;
}
