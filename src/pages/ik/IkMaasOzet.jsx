import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { ymd } from "@/lib/dateUtils";
import { paraSade, sayi } from "@/lib/ikFormat";

const nf = paraSade;
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

// Kolon: [anahtar, etiket, tip]  — tip: "para" (varsayılan sayısal, ₺), "gun" (gün/adet, ₺ yok), "metin"
const OZET_COLS = [
  ["tc", "TC", "metin"], ["personel_adi", "Adı Soyadı", "metin"], ["sube_adi", "İşyeri", "metin"], ["gorev", "Görev", "metin"],
  ["aylik_ucret", "Maaş ₺"], ["saatlik_ucret", "Saatlik ₺"], ["dakikalik_ucret", "Dakikalık ₺"],
  ["genel_net", "Net ₺"], ["resmi_toplam", "Brüt ₺"], ["sgk_isci", "SGK ₺"], ["issizlik_isci", "İşsizlik ₺"], ["gelir_vergisi", "Gelir Vergisi ₺"], ["damga_vergisi", "Damga Vergisi ₺"],
  ["calisilan_gun", "Gün", "gun"], ["eksik_gun", "Eksik Gün", "gun"],
  ["avans", "Avans ₺"], ["icra", "İcra ₺"], ["bes", "BES ₺"], ["diger_kesinti", "Diğer Kesinti ₺"], ["personel_masrafi", "Masraf Kesintisi ₺"],
  ["fesih_tazminati", "Fesih Tazminatı ₺"], ["ihbar_tazminati", "İhbar Tazminatı ₺"], ["kasa_tazminati", "Kasa Tazminatı ₺"],
  ["ozel_sigorta", "Özel Sigorta ₺"], ["ozel_sigorta_es_cocuk", "Özel Sigorta Eş-Çocuk ₺"],
  ["prim", "Prim ₺"], ["fazla_mesai", "Fazla Mesai ₺"], ["bayram", "Tatil Mesai ₺"], ["yemek", "Yemek ₺"], ["ticket", "Ticket ₺"], ["yol", "Yol ₺"],
];
const HAREKET_COLS = [
  ["personel_adi", "Personel", "metin"], ["status", "Durum", "metin"],
  ["avans", "Avans ₺"], ["icra", "İcra ₺"], ["bes", "BES ₺"], ["diger_kesinti", "Diğer Kes. ₺"], ["gun_kes", "Gün Kes. ₺"],
  ["personel_masrafi", "Masraf Kesintisi ₺"],
  ["izin_adet", "İzin Adet", "gun"], ["izin_gun", "İzin Gün", "gun"],
  ["mesai_fazla", "Fazla Mesai ₺"], ["mesai_tatil", "Tatil Mesai ₺"],
  ["yol", "Yol ₺"], ["yemek", "Yemek ₺"], ["ticket", "Ticket ₺"], ["prim", "Prim ₺"],
  ["bordro_brut", "Bordro Brüt ₺"], ["bordro_net", "Bordro Net ₺"],
];

function hucre(val, tip) {
  if (tip === "metin") return val || "—";
  if (tip === "gun") return typeof val === "number" ? sayi(val) : (val ?? "—");
  return typeof val === "number" ? paraSade(val) : (val ?? "—");
}

function DataTable({ cols, rows, isFetching, emptyText }) {
  return (
    <div className="bg-card border rounded-2xl overflow-x-auto">
      {isFetching ? <div className="h-32 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> : (
        <table className="w-full text-xs min-w-[1400px]">
          <thead className="bg-muted/40 border-b">
            <tr>{cols.map(([k, l, tip]) => <th key={k} className={`px-2 py-2 font-semibold text-muted-foreground ${tip === "metin" ? "text-left" : "text-right"}`}>{l}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id || r.personel_id || i} className="border-b last:border-0">
                {cols.map(([k, , tip]) => (
                  <td key={k} className={`px-2 py-1.5 ${tip === "metin" ? "" : "text-right"}`}>
                    {hucre(r[k], tip)}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={cols.length} className="px-4 py-6 text-center text-muted-foreground">{emptyText}</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}

function xlsxYaz(cols, rows, adi) {
  // Excel'de ham sayı; başlıktaki " ₺" işareti kaldırılır.
  const ws = XLSX.utils.json_to_sheet(rows.map((r) => Object.fromEntries(cols.map(([k, l]) => [l.replace(/ ₺$/, ""), typeof r[k] === "number" ? r[k] : (r[k] || "")]))));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, adi.slice(0, 28));
  XLSX.writeFile(wb, `${adi}.xlsx`);
}

// ── Sekme 1: Maaş Özet (ay bazlı bordro satırları) ──
function MaasOzetTab() {
  // "now" module-scope sabit degil, component ilk render edildiginde hesaplanir.
  const [yil, setYil] = useState(() => new Date().getFullYear());
  const [ay, setAy] = useState(() => new Date().getMonth() + 1);
  const [sube, setSube] = useState("");
  const { data, isFetching } = useQuery({ queryKey: ["ik_bordro_liste", yil, ay, sube], queryFn: () => flowApi.ik.bordroListe({ yil, ay, ...(sube ? { sube_id: sube } : {}) }) });
  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });
  const rows = data?.rows || [];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Seçilen ayın tüm bordro kalemleri tek tabloda (kıdem/ihbar/kasa tazminatı, özel sigorta dahil).</p>
      <div className="flex gap-2 items-center flex-wrap">
        <Input type="number" className="w-20" value={yil} onChange={(e) => setYil(Number(e.target.value))} />
        <Select value={String(ay)} onValueChange={(v) => setAy(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{AYLAR.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={sube || "hepsi"} onValueChange={(v) => setSube(v === "hepsi" ? "" : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Şube" /></SelectTrigger>
          <SelectContent><SelectItem value="hepsi">Tüm Şubeler</SelectItem>{subeler.map((s) => <SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" disabled={!rows.length} onClick={() => xlsxYaz(OZET_COLS, rows, `maas-ozet-${yil}-${ay}`)}><Download className="w-4 h-4 mr-1.5" /> Excel</Button>
      </div>
      <DataTable cols={OZET_COLS} rows={rows} isFetching={isFetching} emptyText="Bu dönem için bordro yok." />
    </div>
  );
}

// ── Sekme 2: Hareket Özeti (tarih aralığı bazlı çok-kaynaklı toplam) ──
function HareketOzetiTab() {
  // toISOString() UTC'ye çevirip ay başı/sonunu bir gün kaydırıyordu — ymd() yerel formatlar.
  const [bas, setBas] = useState(() => { const n = new Date(); return ymd(new Date(n.getFullYear(), n.getMonth(), 1)); });
  const [bit, setBit] = useState(() => { const n = new Date(); return ymd(new Date(n.getFullYear(), n.getMonth() + 1, 0)); });
  const [sube, setSube] = useState("");
  const [personel, setPersonel] = useState("");
  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });
  const { data: personeller = [] } = useQuery({ queryKey: ["ik_personel_min"], queryFn: () => flowApi.entities.Employee.list("full_name", 5000) });
  const params = { bas, bit, ...(sube ? { sube_id: sube } : {}), ...(personel ? { personel_id: personel } : {}) };
  const { data, isFetching } = useQuery({ queryKey: ["ik_hareket_rapor", params], queryFn: () => flowApi.ik.hareketRapor(params) });
  const rows = data?.personeller || [];
  const ozet = data?.ozet || {};
  const kartlar = [
    ["Personel", ozet.personel_sayisi || 0], ["Toplam Avans", nf(ozet.toplam_avans)],
    ["Toplam İcra", nf(ozet.toplam_icra)], ["Toplam BES", nf(ozet.toplam_bes)],
    ["Toplam Masraf", nf(ozet.toplam_masraf)], ["Toplam İzin Gün", ozet.toplam_izin_gun || 0],
    ["Toplam Mesai ₺", nf(ozet.toplam_mesai)], ["Toplam Bordro Net", nf(ozet.toplam_bordro_net)],
  ];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Avans, Yol/Yemek/Ticket, kesinti, masraf, izin, mesai ve bordro tek merkezde. Dönem = ay bazlı bordro/kesinti + tarih bazlı mesai/izin.</p>
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
        <Button variant="outline" disabled={!rows.length} onClick={() => xlsxYaz(HAREKET_COLS, rows, `personel-hareket-${bas}_${bit}`)}><Download className="w-4 h-4 mr-1.5" /> Excel</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kartlar.map(([l, v]) => (
          <div key={l} className="bg-card border rounded-xl p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="text-lg font-bold mt-0.5">{v}</p></div>
        ))}
      </div>
      <DataTable cols={HAREKET_COLS} rows={rows} isFetching={isFetching} emptyText="Kayıt yok." />
    </div>
  );
}

export default function IkMaasOzet() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="w-6 h-6 text-primary" /> Maaş Özet & Hareket Raporu</h1>
        <p className="text-sm text-muted-foreground mt-1">İki görünüm: ay bazlı tam bordro tablosu (Maaş Özet) ve tarih aralığı bazlı çok-kaynaklı personel ödeme/hareket toplamı (Hareket Özeti).</p>
      </div>
      <Tabs defaultValue="ozet">
        <TabsList>
          <TabsTrigger value="ozet">Maaş Özet</TabsTrigger>
          <TabsTrigger value="hareket">Hareket Özeti</TabsTrigger>
        </TabsList>
        <TabsContent value="ozet" className="pt-4"><MaasOzetTab /></TabsContent>
        <TabsContent value="hareket" className="pt-4"><HareketOzetiTab /></TabsContent>
      </Tabs>
    </div>
  );
}
