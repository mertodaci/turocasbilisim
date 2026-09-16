import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "recently_visited_v1";
const MAX_ITEMS = 6;

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Ziyaret edilen sayfaları localStorage'a kaydeder — cihaza özel, backend'e
// dokunmuyor. `recordVisit` rota değişiminde (AppLayout) çağrılır,
// `useRecentlyVisited` listeyi okuyan taraf (AdminDashboard) için.
export function recordVisit(path, labelKey) {
  if (!path || !labelKey) return;
  try {
    const stored = readStored();
    const prevCount = stored.find((it) => it.path === path)?.count || 0;
    const list = stored.filter((it) => it.path !== path);
    list.unshift({ path, labelKey, ts: Date.now(), count: prevCount + 1 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch {
    // localStorage kullanılamıyorsa sessizce yok say
  }
}

export function useRecentlyVisited() {
  const [items, setItems] = useState(() => readStored());

  const refresh = useCallback(() => setItems(readStored()), []);

  useEffect(() => {
    const onStorage = (e) => { if (e.key === STORAGE_KEY) refresh(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  return items;
}
