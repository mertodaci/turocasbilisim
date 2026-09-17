import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Users } from "lucide-react";

export default function FaturaRaporlar() {
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");

  const { data: aboneler = [], isLoading: aboneLoading } = useQuery({
    queryKey: ["fatura-aboneler"],
    queryFn: () => flowApi.entities.FaturaAbone.list("abone_adi", 5000),
  });
  const { data: faturalar = [], isLoading: faturaLoading } = useQuery({
    queryKey: ["fatura-islemler"],
    queryFn: () => flowApi.entities.FaturaIslem.list("-fatura_tarihi", 5000),
  });

  const filtreliFaturalar = useMemo(() => faturalar.filter((f) => {
    if (baslangic && (f.fatura_tarihi || "") < baslangic) return false;
    if (bitis && (f.fatura_tarihi || "") > bitis) return false;
    return true;
  }), [faturalar, baslangic, bitis]);

  const aboneOzet = useMemo(() => aboneler.map((a) => {
    const aitFaturalar = filtreliFaturalar.filter((f) => f.abone_id === a.id);
    const toplamTutar = aitFaturalar.reduce((sum, f) => sum + (Number(f.toplam_tutar) || 0), 0);
    return { ...a, faturaSayisi: aitFaturalar.length, toplamTutar };
  }), [aboneler, filtreliFaturalar]);

  const isLoading = aboneLoading || faturaLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> Fatura Raporları</h1>
        <p className="text-sm text-muted-foreground mt-1">Abone bazında fatura sayısı ve toplam tutarları.</p>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <Label className="mb-1.5 block text-xs">Başlangıç</Label>
          <Input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Bitiş</Label>
          <Input type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border/50">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold">Abone Raporu</h2>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
          ) : aboneOzet.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">Abone yok.</div>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Abone Adı</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Abone Türü</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Sözleşme/Mukavele No</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Fatura Sayısı</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Toplam Tutar</th>
                </tr>
              </thead>
              <tbody>
                {aboneOzet.map((a, i) => (
                  <tr key={a.id} className={`border-b last:border-0 ${i % 2 ? "bg-muted/10" : ""}`}>
                    <td className="px-4 py-3 font-medium">{a.abone_adi}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.abone_turu || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.sozlesme_no || "—"}</td>
                    <td className="px-4 py-3 text-right">{a.faturaSayisi}</td>
                    <td className="px-4 py-3 text-right font-medium">{a.toplamTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
