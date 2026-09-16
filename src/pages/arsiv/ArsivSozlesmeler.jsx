import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { ScrollText } from "lucide-react";

export default function ArsivSozlesmeler() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["arsiv", "sozlesmeler"], queryFn: flowApi.arsiv.sozlesmeler });
  const filtered = data.filter((r) => !q || (r.company_name || "").toLowerCase().includes(q.toLowerCase()) || (r.title || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><ScrollText className="w-5 h-5" /> Sözleşme Arşivi</h1>
        <p className="text-sm text-muted-foreground mt-1">Süresi dolmuş veya iptal edilmiş sözleşmeler.</p>
      </div>
      <Input placeholder="Firma veya sözleşme ara…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="bg-card border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
            <th className="text-left px-4 py-2">Firma</th>
            <th className="text-left px-4 py-2">Sözleşme</th>
            <th className="text-left px-4 py-2">Durum</th>
            <th className="text-left px-4 py-2">Bitiş Tarihi</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Yükleniyor…</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Kayıt yok</td></tr>}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2"><Link to={`/musteri/${r.customer_id}`} className="text-primary hover:underline">{r.company_name || "—"}</Link></td>
                <td className="px-4 py-2">{r.title}</td>
                <td className="px-4 py-2">{r.status === "iptal" ? "İptal" : "Süresi Doldu"}</td>
                <td className="px-4 py-2">{(r.end_date || "").slice(0, 10) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
