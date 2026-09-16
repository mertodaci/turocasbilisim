import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { ClipboardList } from "lucide-react";

export default function ArsivIsTakibi() {
  const { data = [], isLoading } = useQuery({ queryKey: ["arsiv", "isTakibi"], queryFn: flowApi.arsiv.isTakibi });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="w-5 h-5" /> İş Takibi Arşivi</h1>
        <p className="text-sm text-muted-foreground mt-1">Arşivlenmiş ya da kapanmış (çözülmüş) biletler.</p>
      </div>
      <div className="bg-card border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
            <th className="text-left px-4 py-2">Başlık</th>
            <th className="text-left px-4 py-2">Müşteri</th>
            <th className="text-left px-4 py-2">Durum</th>
            <th className="text-left px-4 py-2">Kapanış</th>
            <th className="text-left px-4 py-2">Ek Sayısı</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Yükleniyor…</td></tr>}
            {!isLoading && data.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Kayıt yok</td></tr>}
            {data.map((r) => {
              let ekSayisi = 0;
              try { ekSayisi = (JSON.parse(r.attachments || "[]") || []).length; } catch { /* noop */ }
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{r.title}</td>
                  <td className="px-4 py-2">{r.customer_name || "—"}</td>
                  <td className="px-4 py-2">{r.status}</td>
                  <td className="px-4 py-2">{(r.resolved_at || "").slice(0, 10) || "—"}</td>
                  <td className="px-4 py-2">{ekSayisi}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
