import { useEffect, useRef } from "react";
import type { Campaign } from "@/types";
import { store } from "@/store/index";
import { serializeCampaign } from "@/utils/campaign";

export function useAutoSave(getCampaign: () => Campaign | null, endpoint: string): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      const campaign = getCampaign();
      if (!campaign) return;

      const serialized = serializeCampaign(campaign);
      if (serialized === lastSavedRef.current) return;

      if (timerRef.current !== null) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        lastSavedRef.current = serialized;
        fetch(endpoint, {
          method: "PATCH",
          body: serialized,
          headers: { "Content-Type": "application/json" },
        });
      }, 10_000);
    });

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      unsub();
    };
  }, [getCampaign, endpoint]);
}
