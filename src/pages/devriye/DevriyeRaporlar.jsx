import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

const DURUM_LABEL = { zamaninda: "Zamanında", gec: "Geç", erken: "Erken", plan_disi: "Plan Dışı" };
const DURUM_TONE = { zamaninda: "bg-emerald-100 text-emerald-700", gec: "bg-amber-100 text-amber-700", erken: "bg-blue-100 text-blue-700", plan_disi: "bg-slate-100 text-slate-700" };

export default function DevriyeRaporlar() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [baslangic, setBaslangic] = useState(weekAgo);
  const [bitis, setBitis] = useState(today);

  const { data: kayitlar = [], isLoading } = useQuery({
    queryKey: ["devriye-rapor", baslangic, bitis],
    queryFn: () => flowApi.devriye.rapor({ baslangic, bitis }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="w-6 h-6 text-primary" /> Devriye Raporları</h1>
        <p className="text-sm text-muted-foreground mt-1">Tarih aralığına göre QR okuma kayıtları.</p>
      </div>

      <div className="flex gap-3 flex-wrap items-end">
        <div><Label className="mb-1.5 block">Başlangıç</Label><Input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} /></div>
        <div><Label className="mb-1.5 block">Bitiş</Label><Input type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} /></div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? <div className="h-40 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> :
          kayitlar.length === 0 ? <div className="h-40 flex items-center justify-center text-muted-foreground">Kayıt yok.</div> : (
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Zaman</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Lokasyon</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nokta</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Güvenlik</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
              </tr>
            </thead>
            <tbody>
              {kayitlar.map((k, i) => (
                <tr key={k.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 text-muted-foreground">{k.okuma_zamani}</td>
                  <td className="px-4 py-3">{k.lokasyon_adi}</td>
                  <td className="px-4 py-3">{k.nokta_adi}</td>
                  <td className="px-4 py-3 font-medium">{k.guvenlik_adi}</td>
                  <td className="px-4 py-3"><span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", DURUM_TONE[k.durum])}>{DURUM_LABEL[k.durum] || k.durum}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
