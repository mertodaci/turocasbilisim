import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calculator, RefreshCw, CheckCircle2, Printer, Pencil, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ucretPusulasiYazdir } from "@/lib/ikBordroPusula";

const nf = (v) => (Number(v) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const now = new Date();
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export default function IkBordro() {
  const qc = useQueryClient();
  const [yil, setYil] = useState(now.getFullYear());
  const [ay, setAy] = useState(now.getMonth() + 1);
  const [sube, setSube] = useState("");
  const [edit, setEdit] = useState(null);
  const [ef, setEf] = useState({});

  const { data, isFetching } = useQuery({
    queryKey: ["ik_bordro_liste", yil, ay, sube],
    queryFn: () => flowApi.ik.bordroListe({ yil, ay, ...(sube ? { sube_id: sube } : {}) }),
  });
  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });

  const rows = data?.rows || [];
  const ozet = data?.ozet || {};
  const donem = data?.donem;
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ik_bordro_liste"] });

  const hesapla = useMutation({
    mutationFn: (force) => flowApi.ik.bordroHesapla({ yil, ay, force }),
    onSuccess: (r) => { invalidate(); toast.success(`Bordro hesaplandı — ${r.satir} satır`); },
    onError: (e) => toast.error(String(e?.message || "Hesaplanamadı")),
  });
  const onayla = useMutation({
    mutationFn: () => flowApi.ik.bordroOnayla({ yil, ay }),
    onSuccess: () => { invalidate(); toast.success("Bordro onaylandı"); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });
  const satirDuzelt = useMutation({
    mutationFn: ({ id, data }) => flowApi.ik.bordroSatirDuzelt(id, data),
    onSuccess: () => { invalidate(); setEdit(null); toast.success("Satır kaydedildi"); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });

  const openEdit = (r) => {
    setEf(Object.fromEntries(["resmi_maas", "bayram", "fazla_mesai", "prim", "yol", "yemek", "ticket", "yol_hak_gun", "yemek_hak_gun", "ticket_hak_gun",
      "fesih_tazminati", "ihbar_tazminati", "kasa_tazminati", "ozel_sigorta", "ozel_sigorta_es_cocuk"].map((k) => [k, r[k] ?? 0]).concat([["hesap_notu", r.hesap_notu || ""]])));
    setEdit(r);
  };

  const excel = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      TC: r.tc, "Ad Soyad": r.personel_adi, İşyeri: r.sube_adi, Görev: r.gorev,
      Maaş: r.resmi_maas, Bayram: r.bayram, "Fazla Mesai": r.fazla_mesai, Prim: r.prim,
      Yol: r.yol, Yemek: r.yemek, Ticket: r.ticket, "Resmî Toplam": r.resmi_toplam, "Resmî Net": r.resmi_net,
      Avans: r.avans, İcra: r.icra, BES: r.bes, "Diğer Kesinti": r.diger_kesinti, "Personel Masrafı": r.personel_masrafi,
      "Fesih Tazminatı": r.fesih_tazminati, "İhbar Tazminatı": r.ihbar_tazminati, "Kasa Tazminatı": r.kasa_tazminati,
      "Özel Sigorta": r.ozel_sigorta, "Şahsi Hesap": r.sahsi_hesap_net, "Genel Net": r.genel_net,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bordro");
    XLSX.writeFile(wb, `bordro-${yil}-${ay}.xlsx`);
  };

  const kapali = donem?.durum === "kapali";
  const onayli = donem?.durum === "onayli" || kapali;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="w-6 h-6 text-primary" /> Bordrolama</h1>
          <p className="text-sm text-muted-foreground mt-1">Maaş + bayram + fazla mesai + yol/yemek/ticket (gün bazlı) − kesintiler − borç = net. SGK/gelir vergisi tevkifatı yok (Resmî Net = Resmî Toplam).</p>
        </div>
        <div className="flex gap-2 items-center">
          <Input type="number" className="w-20" value={yil} onChange={(e) => setYil(Number(e.target.value))} />
          <Select value={String(ay)} onValueChange={(v) => setAy(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{AYLAR.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          {donem && <span className={`text-xs px-2 py-1 rounded font-medium ${kapali ? "bg-slate-200 text-slate-700" : onayli ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{kapali ? "KAPALI" : onayli ? "ONAYLI" : "TASLAK"}</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Button disabled={hesapla.isPending || kapali} onClick={() => hesapla.mutate(false)}><RefreshCw className={`w-4 h-4 mr-1.5 ${hesapla.isPending ? "animate-spin" : ""}`} /> Hesapla / Güncelle</Button>
        <Button variant="outline" disabled={hesapla.isPending || kapali} onClick={() => { if (confirm("Manuel düzeltilmiş satırlar da yeniden hesaplanacak. Devam?")) hesapla.mutate(true); }}>Zorla Yeniden Hesapla</Button>
        {!onayli && <Button variant="outline" disabled={onayla.isPending || !rows.length} onClick={() => onayla.mutate()}><CheckCircle2 className="w-4 h-4 mr-1.5" /> Bordroyu Onayla</Button>}
        <Button variant="outline" disabled={!rows.length} onClick={excel}><Download className="w-4 h-4 mr-1.5" /> Muhasebe Excel</Button>
        <Select value={sube || "hepsi"} onValueChange={(v) => setSube(v === "hepsi" ? "" : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Şube" /></SelectTrigger>
          <SelectContent><SelectItem value="hepsi">Tüm Şubeler</SelectItem>{subeler.map((s) => <SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-xl">
        <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Resmî Net</p><p className="text-lg font-bold">{nf(ozet.resmi_net)} ₺</p></div>
        <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Şahsi Hesap</p><p className="text-lg font-bold">{nf(ozet.sahsi_net)} ₺</p></div>
        <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Genel Ödenecek</p><p className="text-lg font-bold text-emerald-600">{nf(ozet.genel_net)} ₺</p></div>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        {isFetching && !rows.length ? <div className="h-32 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> : rows.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-muted-foreground gap-2"><Calculator className="w-8 h-8 opacity-40" /><p>Bu dönem için bordro yok — "Hesapla" ile üretin.</p></div>
        ) : (
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Personel</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Maaş</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">F.Mesai</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Yol/Yemek/Ticket</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Resmî Net</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Kesinti</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Şahsi</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Genel Net</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{r.personel_adi}{r.manuel_override ? <span className="ml-1 text-xs text-amber-600">(düzeltildi)</span> : null}</td>
                  <td className="px-3 py-2 text-right">{nf(r.resmi_maas)}</td>
                  <td className="px-3 py-2 text-right">{nf(r.fazla_mesai + r.bayram)}</td>
                  <td className="px-3 py-2 text-right">{nf(r.yol + r.yemek + r.ticket)}</td>
                  <td className="px-3 py-2 text-right font-medium">{nf(r.resmi_net)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{nf(r.avans + r.bes + r.diger_kesinti + r.personel_masrafi + r.borc_toplam)}</td>
                  <td className="px-3 py-2 text-right">{nf(r.sahsi_hesap_net)}</td>
                  <td className="px-3 py-2 text-right font-bold">{nf(r.genel_net)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Ücret Pusulası" onClick={() => ucretPusulasiYazdir(r, donem)}><Printer className="w-3.5 h-3.5" /></Button>
                      {!kapali && <Button variant="ghost" size="icon" className="h-7 w-7" title="Düzenle" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{edit?.personel_adi} — Bordro Satırı</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2 max-h-[72vh] overflow-y-auto pr-1">
            <p className="text-xs text-muted-foreground">Elle değişiklik → satır "manuel" işaretlenir, sonraki "Hesapla" ezmez ("Zorla Yeniden Hesapla" ezer).</p>
            <div className="grid grid-cols-3 gap-2">
              {[["resmi_maas", "Maaş"], ["bayram", "Bayram"], ["fazla_mesai", "F.Mesai"], ["prim", "Prim"], ["yol", "Yol ₺"], ["yemek", "Yemek ₺"], ["ticket", "Ticket ₺"], ["yol_hak_gun", "Yol gün"], ["yemek_hak_gun", "Yemek gün"], ["ticket_hak_gun", "Ticket gün"], ["fesih_tazminati", "Kıdem Tazm."], ["ihbar_tazminati", "İhbar Tazm."], ["kasa_tazminati", "Kasa Tazm."], ["ozel_sigorta", "Özel Sigorta"], ["ozel_sigorta_es_cocuk", "Öz.Sig. Eş-Çocuk"]].map(([k, l]) => (
                <div key={k}><Label className="mb-1 block text-[11px]">{l}</Label><Input type="number" value={ef[k]} onChange={(e) => setEf({ ...ef, [k]: e.target.value })} /></div>
              ))}
            </div>
            <div><Label className="mb-1 block text-xs">Hesap Notu</Label><Input value={ef.hesap_notu} onChange={(e) => setEf({ ...ef, hesap_notu: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setEdit(null)}>İptal</Button>
              <Button disabled={satirDuzelt.isPending} onClick={() => satirDuzelt.mutate({ id: edit.id, data: ef })}>Bordro Satırını Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
