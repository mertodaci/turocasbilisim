import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Layers, RefreshCw, AlertTriangle, Clock, CalendarCheck } from "lucide-react";
import { toast } from "sonner";

const DURUM_BADGE = {
  acik: "bg-emerald-100 text-emerald-700",
  kapali: "bg-slate-100 text-slate-500",
  suresi_gecti: "bg-red-100 text-red-700",
};
const DURUM_LBL = { acik: "Açık", kapali: "Kapalı", suresi_gecti: "Süresi Geçti" };

export default function StokPartiTakibi() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filtre, setFiltre] = useState({ q: "", urun_id: "", depo_id: "", durum: "acik" });

  const { data: ozet } = useQuery({ queryKey: ["stok_parti_ozet"], queryFn: () => flowApi.stok.partiOzet() });
  const { data: tutarlilik } = useQuery({ queryKey: ["stok_fifo_tutarlilik"], queryFn: () => flowApi.stok.fifoTutarlilik() });
  const { data: partiler = [], isLoading } = useQuery({
    queryKey: ["stok_partiler", filtre],
    queryFn: () => flowApi.stok.partiler(filtre),
  });
  const { data: urunler = [] } = useQuery({ queryKey: ["stok_urunler-min"], queryFn: () => flowApi.entities.StokUrun.list("ad", 5000) });
  const { data: depolar = [] } = useQuery({ queryKey: ["stok_depolar"], queryFn: () => flowApi.entities.StokDepo.list("ad", 2000) });

  const yenidenHesapla = useMutation({
    mutationFn: () => flowApi.stok.fifoYenidenHesapla(),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["stok_partiler"] });
      queryClient.invalidateQueries({ queryKey: ["stok_parti_ozet"] });
      queryClient.invalidateQueries({ queryKey: ["stok_fifo_tutarlilik"] });
      toast.success(`FIFO yeniden kuruldu — ${r.fis} fiş, ${r.parti} parti, ${r.tahsis} tahsis`);
    },
    onError: (e) => toast.error(String(e?.message || "Hesaplanamadı")),
  });

  const k = ozet || {};
  const kart = (icon, lbl, val, alt, cls) => {
    const Icon = icon;
    return (
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className={`w-4 h-4 ${cls || ""}`} />{lbl}</div>
        <p className="text-2xl font-bold mt-1">{val ?? 0}</p>
        {alt && <p className="text-[11px] text-muted-foreground">{alt}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="w-6 h-6 text-primary" /> Parti & Raf Ömrü Takibi</h1>
          <p className="text-sm text-muted-foreground mt-1">Çıkışlar en eski uygun partiden (SKT, sonra giriş tarihi) düşer. Transferde lot/maliyet/tarih hedefe taşınır.</p>
        </div>
        {user?.role === "admin" && (
          <Button variant="outline" disabled={yenidenHesapla.isPending} onClick={() => { if (confirm("Tüm parti ve tahsis kayıtları silinip onaylı fişlerden yeniden kurulacak. Devam?")) yenidenHesapla.mutate(); }}>
            <RefreshCw className={`w-4 h-4 mr-2 ${yenidenHesapla.isPending ? "animate-spin" : ""}`} /> FIFO Yeniden Hesapla
          </Button>
        )}
      </div>

      {tutarlilik?.sayisi > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300">{tutarlilik.sayisi} ürün/depo için parti izi ile stok bakiyesi uyuşmuyor</p>
              <p className="text-amber-700 dark:text-amber-400/80 mt-0.5">
                Genelde parti kaydı açılmadan yapılan çıkışlardan olur. FIFO maliyeti ve SKT takibi eksik kalır.
                {user?.role === "admin" ? " Düzeltmek için “FIFO Yeniden Hesapla”yı çalıştırın." : " Bir yönetici “FIFO Yeniden Hesapla” çalıştırmalı."}
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-amber-700 dark:text-amber-400/80">
                {tutarlilik.tutarsiz.slice(0, 6).map((r, i) => (
                  <li key={i}>• {r.urun_adi} @ {r.depo_adi}: stok {r.hareket_net}, parti {r.parti_kalan} (fark {r.fark > 0 ? "+" : ""}{r.fark})</li>
                ))}
                {tutarlilik.sayisi > 6 && <li>• … +{tutarlilik.sayisi - 6} kayıt daha</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kart(Layers, "Açık Parti", k.acik_parti, `Bakiye: ${(k.acik_miktar ?? 0)}`)}
        {kart(AlertTriangle, "Süresi Geçen", k.suresi_gecen, "SKT geçmiş, bakiyesi olan", "text-red-500")}
        {kart(Clock, "Süresi Yaklaşan", k.suresi_yaklasan, "30 gün içinde SKT", "text-amber-500")}
        {kart(CalendarCheck, "Kontrol Tarihi Gelen", k.kontrol_tarihi_gelen, "Kontrol bekliyor", "text-blue-500")}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Lot / ürün / tedarikçi ara" value={filtre.q} onChange={(e) => setFiltre({ ...filtre, q: e.target.value })} />
        <div className="w-56"><SearchableSelect value={filtre.urun_id} onChange={(v) => setFiltre({ ...filtre, urun_id: v })}
          options={[{ value: "", label: "Tüm Ürünler" }, ...urunler.map((u) => ({ value: u.id, label: u.ad }))]} placeholder="Ürün" /></div>
        <Select value={filtre.depo_id || "hepsi"} onValueChange={(v) => setFiltre({ ...filtre, depo_id: v === "hepsi" ? "" : v })}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Depo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hepsi">Tüm Depolar</SelectItem>
            {depolar.map((d) => <SelectItem key={d.id} value={d.id}>{d.ad}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtre.durum} onValueChange={(v) => setFiltre({ ...filtre, durum: v })}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="acik">Açık Partiler</SelectItem>
            <SelectItem value="suresi_gecti">Süresi Geçti</SelectItem>
            <SelectItem value="kapali">Kapalı</SelectItem>
            <SelectItem value="hepsi">Tümü</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : partiler.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2"><Layers className="w-8 h-8 opacity-40" /><p>Parti yok.</p></div>
        ) : (
          <table className="w-full text-sm min-w-[980px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ürün</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Depo / Raf</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Lot</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Giriş / SKT</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Giren</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Kalan</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Maliyet</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Kaynak</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
              </tr>
            </thead>
            <tbody>
              {partiler.map((p, i) => (
                <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{p.urun_adi}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.depo_adi}{p.raf_adi ? ` / ${p.raf_adi}` : ""}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.lot_no || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.giris_tarihi || "—"}{p.skt ? ` · SKT ${String(p.skt).slice(0, 10)}` : ""}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{p.giris_miktar}</td>
                  <td className="px-4 py-3 text-right font-semibold">{p.kalan_bakiye}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{(p.alis_maliyeti ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.kaynak_fis_no || p.kaynak_tip || "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${DURUM_BADGE[p.durum] || ""}`}>{DURUM_LBL[p.durum] || p.durum}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
