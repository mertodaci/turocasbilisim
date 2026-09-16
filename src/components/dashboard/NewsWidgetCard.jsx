import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_CATEGORIES = [
  { id: "son-dakika", label: "Son Dakika" },
  { id: "ekonomi", label: "Ekonomi" },
  { id: "teknoloji", label: "Teknoloji" },
  { id: "spor", label: "Spor" },
  { id: "dunya", label: "Dünya" },
  { id: "saglik", label: "Sağlık" },
  { id: "kultur_sanat", label: "Kültür-Sanat" },
];

// turkiyeningazetesi.com'dan (Mert'in sitesi) backend'in çektiği haberleri
// 5 saniyede bir döngüyle gösteren bülten widget'ı. Kategori seçimi
// dashboard_layout'un config.haber_bulteni.categories alanında saklanır —
// editMode'da dişli ikonuyla açılıp kapanan basit bir checkbox listesi.
export default function NewsWidgetCard({ iconSquareTone, categories = [], editMode, onCategoriesChange }) {
  const { data } = useQuery({
    queryKey: ["haberler"],
    queryFn: () => fetch("/api/haberler", { credentials: "include" }).then((r) => r.json()),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const items = useMemo(() => {
    const all = data?.items || [];
    if (!categories.length) return all;
    return all.filter((i) => categories.includes(i.category_id));
  }, [data, categories]);

  useEffect(() => { setIndex(0); }, [items.length]);
  useEffect(() => {
    if (items.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), 5000);
    return () => clearInterval(timer);
  }, [items.length]);

  const current = items[index];
  const toggleCategory = (id) => {
    const next = categories.includes(id) ? categories.filter((c) => c !== id) : [...categories, id];
    onCategoriesChange(next);
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden relative">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconSquareTone)}><Newspaper className="w-4 h-4" /></span>
        <h3 className="text-xs font-bold uppercase tracking-wide text-foreground flex-1">Haber Bülteni</h3>
        {editMode && (
          <button type="button" onClick={() => setSettingsOpen((v) => !v)} className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted" title="Kategori seç">
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {settingsOpen && (
        <div className="px-4 py-3 border-b border-border/50 bg-muted/30 space-y-1.5">
          <p className="text-[11px] text-muted-foreground mb-1">Kategori seçilmezse tümü gösterilir.</p>
          {ALL_CATEGORIES.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={categories.includes(c.id)} onChange={() => toggleCategory(c.id)} className="rounded" />
              {c.label}
            </label>
          ))}
        </div>
      )}

      <div className="p-4 pt-3 min-h-[130px]">
        {!current ? (
          <p className="text-xs text-muted-foreground">Haber bulunamadı.</p>
        ) : (
          <a href={current.source_url || "#"} target="_blank" rel="noopener noreferrer" className="block group">
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-primary mb-1.5">{current.category_label}</span>
            <p className="text-sm font-semibold text-foreground leading-snug group-hover:underline">{current.title}</p>
            {current.summary && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{current.summary}</p>}
            <p className="text-[11px] text-muted-foreground mt-2">{current.date_text}{current.source_name ? ` · ${current.source_name}` : ""}</p>
          </a>
        )}
        {items.length > 1 && (
          <div className="flex items-center gap-1 mt-3">
            {items.map((_, i) => (
              <span key={i} className={cn("h-1 rounded-full transition-all", i === index ? "w-4 bg-primary" : "w-1 bg-muted")} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
