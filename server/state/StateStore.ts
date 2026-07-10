import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import type { Campaign } from "../types";
import { serializeCampaign, deserializeCampaign } from "../../src/utils/campaign";

const MAX_BACKUPS = 5;
const DATA_DIR = join(process.cwd(), "server", "state", "data");
const BACKUPS_DIR = join(process.cwd(), "server", "state", "backups");

function campaignPath(campaignId: string): string {
  return join(DATA_DIR, `${campaignId}.json`);
}

export class StateStore {
  constructor() {
    mkdirSync(DATA_DIR, { recursive: true });
    mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  read(campaignId: string): Campaign | null {
    const path = campaignPath(campaignId);
    if (!existsSync(path)) return null;
    try {
      return deserializeCampaign(readFileSync(path, "utf-8"));
    } catch {
      return null;
    }
  }

  write(campaign: Campaign): void {
    mkdirSync(DATA_DIR, { recursive: true });
    mkdirSync(BACKUPS_DIR, { recursive: true });

    const path = campaignPath(campaign.id);

    if (existsSync(path)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = join(BACKUPS_DIR, `${campaign.id}_${timestamp}.json`);
      writeFileSync(backupPath, readFileSync(path));
      this.pruneBackups(campaign.id);
    }

    writeFileSync(path, serializeCampaign(campaign), "utf-8");
  }

  private pruneBackups(campaignId: string): void {
    const prefix = `${campaignId}_`;
    const files = readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith(prefix) && f.endsWith(".json"))
      .sort();

    while (files.length > MAX_BACKUPS) {
      unlinkSync(join(BACKUPS_DIR, files.shift()!));
    }
  }
}
