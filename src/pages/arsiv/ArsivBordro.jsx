import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Link } from "react-router-dom";
import { Wallet } from "lucide-react";

const AYLAR = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export default function ArsivBordro() {
  const { data = [], isLoading } = useQuery({ queryKey: ["arsiv", "bordro"], queryFn: flowApi.arsiv.bordro });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Wallet className="w-5 h-5" /> Bordro Arşivi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kapatılmış bordro dönemleri. Pusulalar bir dosya olarak saklanmaz — ihtiyaç
          duyulduğunda Bordrolama ekranından anlık üretilir.
        </p>
      </div>
      <div className="bg-card border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
            <th className="text-left px-4 py-2">Dönem</th>
            <th className="text-left px-4 py-2">Onaylayan</th>
            <th className="text-left px-4 py-2">Kapanış Tarihi</th>
            <th className="text-left px-4 py-2"></th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Yükleniyor…</td></tr>}
            {!isLoading && data.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Kapatılmış dönem yok</td></tr>}
            {data.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{AYLAR[r.ay]} {r.yil}</td>
                <td className="px-4 py-2">{r.onaylayan || "—"}</td>
                <td className="px-4 py-2">{(r.kapanis_tarihi || "").slice(0, 10) || "—"}</td>
                <td className="px-4 py-2"><Link to="/ik/bordro" className="text-primary hover:underline text-sm">Bordrolamada Görüntüle →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
