import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";

// Bilet durum anahtarini (analiz_gelistiriliyor) okunabilir ada cevirmek icin
// ortak katman. Ayni queryKey (["tq-statuses"]) her yerde kullanildigi icin
// React Query bunu dedupe eder -- ek ag istegi olusmaz.

const prettify = (k) => String(k || "").replace(/_/g, " ");

export function useTicketStatuses() {
  const { data: statuses = [] } = useQuery({
    queryKey: ["tq-statuses"],
    queryFn: () => flowApi.entities.JTTicketStatus.filter({ is_active: true }, "sort_order", 500),
  });

  return useMemo(() => {
    const byKey = new Map();
    for (const s of statuses) {
      if (s && s.key != null && !byKey.has(s.key)) byKey.set(s.key, s);
    }
    return {
      statuses,
      byKey,
      // Durum adi -- tanim yoksa alt cizgiyi bosluga cevirerek geri don
      statusName: (key) => byKey.get(key)?.name || prettify(key),
      statusColor: (key) => byKey.get(key)?.color || "slate",
    };
  }, [statuses]);
}
