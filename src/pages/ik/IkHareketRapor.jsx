import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Download } from "lucide-react";
import * as XLSX from "xlsx";

const nf = (v) => (Number(v) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const now = new Date();
const ilkGun = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
const sonGun = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

const COLS = [
  ["personel_adi", "Personel"], ["status", "Durum"],
  ["avans", "Avans"], ["icra", "İcra"], ["bes", "BES"], ["diger_kesinti", "Diğer Kes."], ["gun_kes", "Gün Kes."],
  ["personel_masrafi", "Personel Masrafı"],
  ["izin_adet", "İzin Adet"], ["izin_gun", "İzin Gün"],
  ["mesai_fazla", "Fazla Mesai ₺"], ["mesai_tatil", "Tatil Mesai ₺"],
  ["yol", "Yol"], ["yemek", "Yemek"], ["ticket", "Ticket"], ["prim", "Prim"],
  ["bordro_brut", "Bordro Brüt"], ["bordro_net", "Bordro Net"],
];

export default function IkHareketRapor() {
  const [bas, setBas] = useState(ilkGun);
  const [bit, setBit] = useState(sonGun);
  const [sube, setSube] = useState("");
  const [personel, setPersonel] = useState("");

  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });
  const { data: personeller = [] } = useQuery({ queryKey: ["ik_personel_min"], queryFn: () => flowApi.entities.Employee.list("full_name", 5000) });

  const params = { bas, bit, ...(sube ? { sube_id: sube } : {}), ...(personel ? { personel_id: personel } : {}) };
  const { data, isFetching } = useQuery({
    queryKey: ["ik_hareket_rapor", params],
    queryFn: () => flowApi.ik.hareketRapor(params),
  });
  const rows = data?.personeller || [];
  const ozet = data?.ozet || {};

  const excel = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => Object.fromEntries(COLS.map(([k, l]) => [l, typeof r[k] === "number" ? r[k] : (r[k] || "")]))));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hareket Raporu");
    XLSX.writeFile(wb, `personel-hareket-${bas}_${bit}.xlsx`);
  };

  const kartlar = [
    ["Personel", ozet.personel_sayisi || 0],
    ["Toplam Avans", nf(ozet.toplam_avans)],
    ["Toplam İcra", nf(ozet.toplam_icra)],
    ["Toplam BES", nf(ozet.toplam_bes)],
    ["Toplam Masraf", nf(ozet.toplam_masraf)],
    ["Toplam İzin Gün", ozet.toplam_izin_gun || 0],
    ["Toplam Mesai ₺", nf(ozet.toplam_mesai)],
    ["Toplam Bordro Net", nf(ozet.toplam_bordro_net)],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="w-6 h-6 text-primary" /> Personel Hareket Raporları</h1>
          <p className="text-sm text-muted-foreground mt-1">Giriş-çıkış, avans, Yol/Yemek/Ticket, kesinti, masraf, izin, mesai ve bordro tek merkezde. Dönem = ay bazlı bordro/kesinti + tarih bazlı mesai/izin.</p>
        </div>
        <Button variant="outline" disabled={!rows.length} onClick={excel}><Download className="w-4 h-4 mr-1.5" /> Excel</Button>
      </div>

      <div className="flex gap-2 flex-wrap items-end">
        <div><Label className="mb-1 block text-xs">Başlangıç</Label><Input type="date" className="w-40" value={bas} onChange={(e) => setBas(e.target.value)} /></div>
        <div><Label className="mb-1 block text-xs">Bitiş</Label><Input type="date" className="w-40" value={bit} onChange={(e) => setBit(e.target.value)} /></div>
        <div><Label className="mb-1 block text-xs">Şube</Label>
          <Select value={sube || "hepsi"} onValueChange={(v) => setSube(v === "hepsi" ? "" : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Şube" /></SelectTrigger>
            <SelectContent><SelectItem value="hepsi">Tüm Şubeler</SelectItem>{subeler.map((s) => <SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="mb-1 block text-xs">Personel</Label>
          <Select value={personel || "hepsi"} onValueChange={(v) => setPersonel(v === "hepsi" ? "" : v)}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Personel" /></SelectTrigger>
            <SelectContent><SelectItem value="hepsi">Tüm Personel</SelectItem>{personeller.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kartlar.map(([l, v]) => (
          <div key={l} className="bg-card border rounded-xl p-3">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-lg font-bold mt-0.5">{v}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        {isFetching ? <div className="h-32 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> : (
          <table className="w-full text-xs min-w-[1400px]">
            <thead className="bg-muted/40 border-b">
              <tr>{COLS.map(([k, l]) => <th key={k} className={`px-2 py-2 font-semibold text-muted-foreground ${["personel_adi", "status"].includes(k) ? "text-left" : "text-right"}`}>{l}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.personel_id} className="border-b last:border-0">
                  {COLS.map(([k]) => (
                    <td key={k} className={`px-2 py-1.5 ${["personel_adi", "status"].includes(k) ? "" : "text-right"}`}>
                      {typeof r[k] === "number" ? nf(r[k]) : (r[k] || "—")}
                    </td>
                  ))}
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={COLS.length} className="px-4 py-6 text-center text-muted-foreground">Kayıt yok.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
