import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { ymd } from "@/lib/dateUtils";

// ymd(): toISOString().slice(0,10) UTC donusumu yuzunden Turkiye (+3) saat
// diliminde ay basini bir gun geriye kaydiriyordu.
const ay0 = () => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), 1)); };
const bugun = () => ymd(new Date());

export default function IkPuantajRapor() {
  const [f, setF] = useState({ t1: ay0(), t2: bugun(), sube_id: "", tur: "tumu" });

  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });
  const { data, isFetching } = useQuery({
    queryKey: ["ik_puantaj_rapor", f],
    queryFn: () => flowApi.ik.puantajRapor({ t1: f.t1, t2: f.t2, tur: f.tur, ...(f.sube_id ? { sube_id: f.sube_id } : {}) }),
  });
  const rows = data?.rows || [];

  const excel = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      Tarih: r.tarih, Personel: r.personel_adi, Şube: r.sube_adi, Durum: r.durum_kodu,
      Giriş: r.giris_saat, Çıkış: r.cikis_saat, "Geç (dk)": r.gec_dk, "Erken (dk)": r.erken_dk, "Mesai (dk)": r.mesai_dk, Özet: r.ozet,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Puantaj");
    XLSX.writeFile(wb, `puantaj-rapor-${f.t1}_${f.t2}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> Puantaj Raporları</h1>
        <p className="text-sm text-muted-foreground mt-1">Geç gelen, gelmeyen, izinli/raporlu ve gece çalışan personel; tarih ve şube bazlı.</p>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div><label className="text-xs text-muted-foreground block mb-1">Başlangıç</label><Input type="date" className="w-40" value={f.t1} onChange={(e) => setF({ ...f, t1: e.target.value })} /></div>
        <div><label className="text-xs text-muted-foreground block mb-1">Bitiş</label><Input type="date" className="w-40" value={f.t2} onChange={(e) => setF({ ...f, t2: e.target.value })} /></div>
        <Select value={f.sube_id || "hepsi"} onValueChange={(v) => setF({ ...f, sube_id: v === "hepsi" ? "" : v })}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Şube" /></SelectTrigger>
          <SelectContent><SelectItem value="hepsi">Tüm Şubeler</SelectItem>{subeler.map((s) => <SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={f.tur} onValueChange={(v) => setF({ ...f, tur: v })}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tumu">Tümü</SelectItem>
            <SelectItem value="gec">Geç Gelenler</SelectItem>
            <SelectItem value="gelmeyen">Gelmeyenler</SelectItem>
            <SelectItem value="izinli">İzinli / Raporlu</SelectItem>
            <SelectItem value="gece">Gece Çalışanlar</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={excel} disabled={!rows.length}><Download className="w-4 h-4 mr-1.5" /> Excel</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg">
        <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Kayıt</p><p className="text-xl font-bold">{data?.ozet?.kayit ?? 0}</p></div>
        <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Toplam Gecikme</p><p className="text-xl font-bold">{data?.ozet?.gec_toplam_dk ?? 0} dk</p></div>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        {isFetching ? <div className="h-32 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> : (
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Tarih</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Personel</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Şube</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Durum</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Giriş / Çıkış</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Geç / Mesai (dk)</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Özet</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 2000).map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-2 text-muted-foreground">{r.tarih}</td>
                  <td className="px-4 py-2">{r.personel_adi}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.sube_adi || "—"}</td>
                  <td className="px-4 py-2">{r.durum_kodu}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.giris_saat || "—"} / {r.cikis_saat || "—"}</td>
                  <td className="px-4 py-2 text-right">{r.gec_dk || 0} / {r.mesai_dk || 0}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.ozet || "—"}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Kayıt yok.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
