import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Download } from "lucide-react";
import * as XLSX from "xlsx";

const nf = (v) => (Number(v) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const now = new Date();
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const COLS = [
  ["tc", "TC"], ["personel_adi", "Adı Soyadı"], ["sube_adi", "İşyeri"], ["gorev", "Görev"],
  ["aylik_ucret", "Maaş"], ["saatlik_ucret", "Saatlik"], ["dakikalik_ucret", "Dakikalık"],
  ["genel_net", "Net"], ["resmi_toplam", "Brüt"], ["calisilan_gun", "Gün"], ["eksik_gun", "Eksik Gün"],
  ["avans", "Avans"], ["icra", "İcra"], ["bes", "BES"], ["diger_kesinti", "Diğer Kesinti"], ["personel_masrafi", "Personel Masrafı"],
  ["fesih_tazminati", "Fesih Tazminatı"], ["ihbar_tazminati", "İhbar Tazminatı"], ["kasa_tazminati", "Kasa Tazminatı"],
  ["ozel_sigorta", "Özel Sigorta"], ["ozel_sigorta_es_cocuk", "Özel Sigorta Eş-Çocuk"],
  ["prim", "Prim"], ["fazla_mesai", "Fazla Mesai"], ["bayram", "Tatil Mesai"], ["yemek", "Yemek"], ["ticket", "Ticket"], ["yol", "Yol"],
];

export default function IkMaasOzet() {
  const [yil, setYil] = useState(now.getFullYear());
  const [ay, setAy] = useState(now.getMonth() + 1);
  const [sube, setSube] = useState("");

  const { data, isFetching } = useQuery({ queryKey: ["ik_bordro_liste", yil, ay, sube], queryFn: () => flowApi.ik.bordroListe({ yil, ay, ...(sube ? { sube_id: sube } : {}) }) });
  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });
  const rows = data?.rows || [];

  const excel = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => Object.fromEntries(COLS.map(([k, l]) => [l, typeof r[k] === "number" ? r[k] : (r[k] || "")]))));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Maaş Özet");
    XLSX.writeFile(wb, `maas-ozet-${yil}-${ay}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="w-6 h-6 text-primary" /> Maaş Özet Raporu</h1>
          <p className="text-sm text-muted-foreground mt-1">Tüm bordro kalemleri tek tabloda (kıdem/ihbar/kasa tazminatı, özel sigorta dahil). Excel'e aktarılır.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Input type="number" className="w-20" value={yil} onChange={(e) => setYil(Number(e.target.value))} />
          <Select value={String(ay)} onValueChange={(v) => setAy(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{AYLAR.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={sube || "hepsi"} onValueChange={(v) => setSube(v === "hepsi" ? "" : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Şube" /></SelectTrigger>
            <SelectContent><SelectItem value="hepsi">Tüm Şubeler</SelectItem>{subeler.map((s) => <SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" disabled={!rows.length} onClick={excel}><Download className="w-4 h-4 mr-1.5" /> Excel</Button>
        </div>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        {isFetching ? <div className="h-32 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> : (
          <table className="w-full text-xs min-w-[1600px]">
            <thead className="bg-muted/40 border-b">
              <tr>{COLS.map(([k, l]) => <th key={k} className={`px-2 py-2 font-semibold text-muted-foreground ${["personel_adi", "sube_adi", "gorev", "tc"].includes(k) ? "text-left" : "text-right"}`}>{l}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  {COLS.map(([k]) => (
                    <td key={k} className={`px-2 py-1.5 ${["personel_adi", "sube_adi", "gorev", "tc"].includes(k) ? "" : "text-right"}`}>
                      {typeof r[k] === "number" ? nf(r[k]) : (r[k] || "—")}
                    </td>
                  ))}
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={COLS.length} className="px-4 py-6 text-center text-muted-foreground">Bu dönem için bordro yok.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
