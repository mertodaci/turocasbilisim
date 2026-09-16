import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { flowApi } from "@/api/flowApiClient";

// Genel "Son N kayıt" widget'ı — her modül kendi entity/sort/eşleme
// bilgisini geçirir, kart iskeleti ve sorgu davranışı ortak.
export default function RecentEntityWidgetCard({
  title, icon: Icon, iconSquareTone, entity, sort = "-created_date", limit = 5,
  mapItem, linkTo, emptyText = "Henüz kayıt yok",
}) {
  const { data: items = [] } = useQuery({
    queryKey: ["dash-recent", entity, sort, limit],
    queryFn: () => flowApi.entities[entity].list(sort, limit),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconSquareTone)}><Icon className="w-4 h-4" /></span>
        <h3 className="text-xs font-bold uppercase tracking-wide text-foreground flex-1">{title}</h3>
        {linkTo && (
          <Link to={linkTo} className="text-xs font-medium text-primary hover:underline shrink-0">Tümü</Link>
        )}
      </div>
      <div className="p-4 pt-3">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => {
              const { label, sub, to } = mapItem(item);
              const Row = to ? Link : "div";
              return (
                <Row key={item.id} {...(to ? { to } : {})} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl hover:bg-muted/60 transition-colors">
                  <span className="text-sm truncate">{label}</span>
                  {sub && <span className="text-[11px] text-muted-foreground shrink-0">{sub}</span>}
                </Row>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
