import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Input } from "@/components/ui/input";
import { FileText, Paperclip } from "lucide-react";

export default function ArsivMusteriEvraklari() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["arsiv", "musteriEvraklari"], queryFn: flowApi.arsiv.musteriEvraklari });
  const filtered = data.filter((r) => !q || (r.customer_name || "").toLowerCase().includes(q.toLowerCase()) || (r.dosya_adi || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5" /> Müşteri Evrak Arşivi</h1>
        <p className="text-sm text-muted-foreground mt-1">Müşteri detayındaki "Evraklar" sekmesinden yüklenen tüm dosyalar.</p>
      </div>
      <Input placeholder="Müşteri veya dosya adı ara…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="bg-card border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
            <th className="text-left px-4 py-2">Müşteri</th>
            <th className="text-left px-4 py-2">Tip</th>
            <th className="text-left px-4 py-2">Dosya</th>
            <th className="text-left px-4 py-2">Tarih</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Yükleniyor…</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Kayıt yok</td></tr>}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.customer_name}</td>
                <td className="px-4 py-2">{r.evrak_tipi || "Diğer"}</td>
                <td className="px-4 py-2"><a href={r.dosya_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> {r.dosya_adi}</a></td>
                <td className="px-4 py-2">{(r.tarih || "").slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
