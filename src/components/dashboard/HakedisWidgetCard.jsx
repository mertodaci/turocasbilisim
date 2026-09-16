import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { flowApi } from "@/api/flowApiClient";
import { num, tl, rowTahsilEdilen } from "@/lib/hakedisUtils";

// Yönetim Merkezi widget'ı — Hakedişler ekranındaki (Hakedisler.jsx) `totals`
// hesaplamasıyla aynı mantık, yalnızca içinde bulunulan yıla daraltılmış.
export default function HakedisWidgetCard({ iconSquareTone }) {
  const { data: rows = [] } = useQuery({
    queryKey: ["hakedisler"],
    queryFn: () => flowApi.entities.Hakedis.list("-year", 5000),
    staleTime: 5 * 60 * 1000,
  });

  const currentYear = new Date().getFullYear();
  const totals = useMemo(() => {
    let hedef = 0, gerceklesen = 0;
    for (const r of rows) {
      if (Number(r.year) !== currentYear) continue;
      hedef += num(r.yil_hedefi) || 0;
      gerceklesen += rowTahsilEdilen(r);
    }
    return { hedef, gerceklesen, kalan: hedef - gerceklesen };
  }, [rows, currentYear]);

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconSquareTone)}><Wallet className="w-4 h-4" /></span>
        <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">Hakediş Özeti · {currentYear}</h3>
      </div>
      <div className="p-4 pt-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Yıl Hedefi</span>
          <span className="font-semibold text-blue-600">{tl(totals.hedef)} ₺</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Gerçekleşen</span>
          <span className="font-semibold text-emerald-600">{tl(totals.gerceklesen)} ₺</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Kalan</span>
          <span className="font-semibold text-orange-600">{tl(totals.kalan)} ₺</span>
        </div>
        <Link to="/hakedisler" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-1">
          Hakedişler'i Aç →
        </Link>
      </div>
    </div>
  );
}
