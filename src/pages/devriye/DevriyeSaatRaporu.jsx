import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const DURUM_LABEL = { zamaninda: "Zamanında", gec: "Geç", erken: "Erken", okutmadi: "Okutmadı" };
const DURUM_TONE = { zamaninda: "bg-emerald-100 text-emerald-700", gec: "bg-amber-100 text-amber-700", erken: "bg-blue-100 text-blue-700", okutmadi: "bg-rose-100 text-rose-700" };

export default function DevriyeSaatRaporu() {
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10));
  const [lokasyonId, setLokasyonId] = useState("");

  const { data: lokasyonlar = [] } = useQuery({ queryKey: ["devriye_lokasyonlar"], queryFn: () => flowApi.entities.DevriyeLokasyon.list("ad", 500) });
  const { data, isLoading } = useQuery({
    queryKey: ["devriye-saat-raporu", tarih, lokasyonId],
    queryFn: () => flowApi.devriye.saatRaporu({ tarih, lokasyon_id: lokasyonId || undefined }),
  });

  const detay = data?.detay || [];
  const sayaclar = data?.sayaclar || { zamaninda: 0, gec: 0, erken: 0, okutmadi: 0 };

  const cards = [
    { key: "zamaninda", label: "Zamanında", icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" },
    { key: "gec", label: "Geç", icon: Clock, tone: "text-amber-600 bg-amber-50" },
    { key: "erken", label: "Erken", icon: AlertTriangle, tone: "text-blue-600 bg-blue-50" },
    { key: "okutmadi", label: "Okutmadı", icon: XCircle, tone: "text-rose-600 bg-rose-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> Olması Gereken Saatler Raporu</h1>
        <p className="text-sm text-muted-foreground mt-1">Belirlenen saatte hangi noktaların okutulduğu / kaçtığı.</p>
      </div>

      <div className="flex gap-3 flex-wrap items-end">
        <div><Label className="mb-1.5 block">Tarih</Label><Input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} /></div>
        <div className="w-56">
          <Label className="mb-1.5 block">Lokasyon</Label>
          <Select value={lokasyonId || "hepsi"} onValueChange={(v) => setLokasyonId(v === "hepsi" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="hepsi">Tüm lokasyonlar</SelectItem>{lokasyonlar.map((l) => <SelectItem key={l.id} value={l.id}>{l.ad}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.key} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", c.tone)}><c.icon className="w-5 h-5" /></div>
            <div><p className="text-xl font-bold">{sayaclar[c.key] || 0}</p><p className="text-xs text-muted-foreground">{c.label}</p></div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? <div className="h-40 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> :
          detay.length === 0 ? <div className="h-40 flex items-center justify-center text-muted-foreground">Kayıt yok.</div> : (
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Lokasyon</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nokta</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Olması Gereken Saat</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Okuma Zamanı</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Güvenlik</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
              </tr>
            </thead>
            <tbody>
              {detay.map((d, i) => (
                <tr key={d.nokta_id + i} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3">{d.lokasyon_adi}</td>
                  <td className="px-4 py-3 font-medium">{d.nokta_adi}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.olmasi_gereken_saat}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.okuma_zamani || "—"}</td>
                  <td className="px-4 py-3">{d.guvenlik_adi || "—"}</td>
                  <td className="px-4 py-3"><span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", DURUM_TONE[d.durum])}>{DURUM_LABEL[d.durum] || d.durum}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
