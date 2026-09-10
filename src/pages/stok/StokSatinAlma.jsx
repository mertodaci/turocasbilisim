import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { ShoppingCart, Plus, Pencil, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { id: "merkez", label: "Merkez" }, { id: "eslesme", label: "Ürün - Tedarikçi" },
  { id: "karsilastirma", label: "Fiyat Karşılaştırma" }, { id: "rapor", label: "Raporlar" }, { id: "gecmis", label: "Fiyat Geçmişi" },
];
const RAPOR_TIPLERI = [
  { v: "volume", l: "Tedarikçi Satın Alma Hacmi" }, { v: "best", l: "En Uygun Fiyat Verenler" },
  { v: "changes", l: "Son Fiyat Değişiklikleri" }, { v: "history", l: "Ürün Fiyat Geçmişi" },
  { v: "stale", l: "Eski Fiyatlar (90+ gün)" }, { v: "single", l: "Tek Tedarikçili Ürünler" }, { v: "multi", l: "Çok Tedarikçili Ürünler" },
];
const xlsx = (rows, name) => { if (!rows?.length) return; const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Rapor"); XLSX.writeFile(wb, `${name}-${new Date().toISOString().slice(0, 10)}.xlsx`); };
const empty = { urun_id: "", cari_id: "", tedarikci_urun_kodu: "", marka: "", model: "", birim: "ADET", birim_fiyat: 0, para_birimi: "TRY", fiyat_tarihi: new Date().toISOString().slice(0, 10), teslim_suresi_gun: 0, min_siparis: 1, stok_durumu: "Bilinmiyor", tercih_edilen: 0, aktif: 1, not_: "" };

export default function StokSatinAlma() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("merkez");
  const [dlg, setDlg] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);
  const [kf, setKf] = useState({ urun_id: "", cari_id: "", marka: "", minf: "", maxf: "", maxteslim: "", q: "" });
  const [rtip, setRtip] = useState("volume");
  const [gf, setGf] = useState({ urun_id: "", cari_id: "", q: "" });

  const { data: urunler = [] } = useQuery({ queryKey: ["stok_urunler-min"], queryFn: () => flowApi.entities.StokUrun.list("ad", 5000) });
  const { data: cariler = [] } = useQuery({ queryKey: ["customers-all"], queryFn: () => flowApi.entities.Customer.list("company_name", 5000) });
  const tedarikciler = cariler.filter((c) => c.is_supplier === 1 || c.is_supplier === true);

  const merkez = useQuery({ queryKey: ["sa_merkez"], queryFn: () => flowApi.stok.satinalma("merkez"), enabled: tab === "merkez" });
  const { data: eslesmeler = [], isLoading: elLoad } = useQuery({ queryKey: ["stok_urun_tedarikci"], queryFn: () => flowApi.entities.StokUrunTedarikci.list("urun_adi", 5000), enabled: tab === "eslesme" });
  const karsilastirma = useQuery({ queryKey: ["sa_kars", kf], queryFn: () => flowApi.stok.satinalma("karsilastirma", kf), enabled: tab === "karsilastirma" });
  const rapor = useQuery({ queryKey: ["sa_rapor", rtip], queryFn: () => flowApi.stok.satinalmaRapor(rtip), enabled: tab === "rapor" });
  const gecmis = useQuery({ queryKey: ["sa_gecmis", gf], queryFn: () => flowApi.stok.fiyatGecmisi(gf), enabled: tab === "gecmis" });

  const inv = () => queryClient.invalidateQueries({ queryKey: ["stok_urun_tedarikci"] });
  const saveM = useMutation({
    mutationFn: () => {
      const data = { ...form, urun_adi: urunler.find((u) => u.id === form.urun_id)?.ad, cari_adi: tedarikciler.find((c) => c.id === form.cari_id)?.company_name };
      return dlg.item ? flowApi.entities.StokUrunTedarikci.update(dlg.item.id, data) : flowApi.entities.StokUrunTedarikci.create(data);
    },
    onSuccess: () => { inv(); setDlg({ open: false, item: null }); toast.success("Kaydedildi"); },
    onError: (e) => toast.error(String(e?.message || "Kaydedilemedi")),
  });
  const delM = useMutation({ mutationFn: (id) => flowApi.entities.StokUrunTedarikci.delete(id), onSuccess: () => { inv(); toast.success("Silindi"); } });

  const openEdit = (it) => { setForm({ ...empty, ...it }); setDlg({ open: true, item: it }); };
  const Th = ({ children, r }) => <th className={`px-3 py-2 font-semibold text-muted-foreground ${r ? "text-right" : "text-left"}`}>{children}</th>;
  const Td = ({ children, r, b }) => <td className={`px-3 py-1.5 ${r ? "text-right" : ""} ${b ? "font-semibold" : "text-muted-foreground"}`}>{children}</td>;
  const m = merkez.data || {};

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-primary" /> Fiyat Analiz</h1>
        <p className="text-sm text-muted-foreground mt-1">Tedarikçi fiyatları, karşılaştırma, alış fiyat geçmişi. Cari seçili onaylı giriş fişleri fiyat geçmişini otomatik günceller.</p></div>

      <div className="flex flex-wrap gap-1.5 border-b">
        {TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t.label}</button>)}
      </div>

      {tab === "merkez" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[["Aktif Tedarikçi", m.aktif_tedarikci], ["Ürün Eşleştirme", m.eslesme], ["Eski Fiyat (90+g)", m.eski_fiyat], ["Tek Tedarikçili", m.tek_tedarikci]].map(([l, v]) => (
              <div key={l} className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-bold mt-1">{v ?? 0}</p></div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border rounded-xl p-4">
              <p className="text-sm font-semibold mb-2">Ürün Bazlı En Uygun</p>
              <table className="w-full text-xs"><tbody>
                {(m.en_uygun || []).map((r) => <tr key={r.urun_id} className="border-b last:border-0"><td className="py-1">{r.urun_adi}</td><td className="py-1 text-muted-foreground">{r.en_ucuz_cari}</td><td className="py-1 text-right">{r.en_dusuk} – {r.en_yuksek}</td></tr>)}
                {!(m.en_uygun || []).length && <tr><td className="py-3 text-muted-foreground text-center">Kayıt yok</td></tr>}
              </tbody></table>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <p className="text-sm font-semibold mb-2">Son Fiyat Hareketleri</p>
              <table className="w-full text-xs"><tbody>
                {(m.son_fiyat || []).map((r, i) => <tr key={i} className="border-b last:border-0"><td className="py-1">{r.urun_adi}</td><td className="py-1 text-muted-foreground">{r.cari_adi}</td><td className="py-1 text-right">{r.alis_fiyati} ({r.kaynak})</td></tr>)}
                {!(m.son_fiyat || []).length && <tr><td className="py-3 text-muted-foreground text-center">Kayıt yok</td></tr>}
              </tbody></table>
            </div>
          </div>
        </div>
      )}

      {tab === "eslesme" && (
        <div className="space-y-3">
          <div className="flex justify-end"><Button onClick={() => { setForm(empty); setDlg({ open: true, item: null }); }}><Plus className="w-4 h-4 mr-2" /> Yeni Eşleştirme</Button></div>
          <div className="bg-card border rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="bg-muted/40 border-b"><tr><Th>Ürün</Th><Th>Tedarikçi</Th><Th>Marka/Model</Th><Th r>Fiyat</Th><Th r>Teslim (g)</Th><Th r>Min Sip.</Th><Th>Güncelleme</Th><Th></Th></tr></thead>
              <tbody>
                {elLoad && <tr><td colSpan={8} className="text-center py-6 text-muted-foreground">Yükleniyor...</td></tr>}
                {eslesmeler.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <Td b>{r.urun_adi}{r.tercih_edilen ? " ⭐" : ""}</Td><Td>{r.cari_adi}</Td><Td>{[r.marka, r.model].filter(Boolean).join(" ")}</Td>
                    <Td r>{r.birim_fiyat} {r.para_birimi}</Td><Td r>{r.teslim_suresi_gun}</Td><Td r>{r.min_siparis}</Td><Td>{r.fiyat_tarihi || "—"}</Td>
                    <td className="px-3 py-1.5 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Silinsin mi?")) delM.mutate(r.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                ))}
                {!elLoad && !eslesmeler.length && <tr><td colSpan={8} className="text-center py-6 text-muted-foreground">Eşleştirme yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "karsilastirma" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="w-56"><SearchableSelect value={kf.urun_id} onChange={(v) => setKf({ ...kf, urun_id: v })} options={[{ value: "", label: "Tüm Ürünler" }, ...urunler.map((u) => ({ value: u.id, label: u.ad }))]} placeholder="Ürün" /></div>
            <div className="w-52"><SearchableSelect value={kf.cari_id} onChange={(v) => setKf({ ...kf, cari_id: v })} options={[{ value: "", label: "Tüm Tedarikçiler" }, ...tedarikciler.map((c) => ({ value: c.id, label: c.company_name }))]} placeholder="Tedarikçi" /></div>
            <Input className="w-28" placeholder="Min ₺" value={kf.minf} onChange={(e) => setKf({ ...kf, minf: e.target.value })} />
            <Input className="w-28" placeholder="Max ₺" value={kf.maxf} onChange={(e) => setKf({ ...kf, maxf: e.target.value })} />
            <Input className="w-32" placeholder="Azami teslim g" value={kf.maxteslim} onChange={(e) => setKf({ ...kf, maxteslim: e.target.value })} />
          </div>
          <div className="bg-card border rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-muted/40 border-b"><tr><Th>Ürün</Th><Th>Tedarikçi</Th><Th>Marka/Model</Th><Th r>Fiyat</Th><Th r>Teslim</Th><Th r>Min Sip.</Th><Th>Güncellik</Th></tr></thead>
              <tbody>
                {(karsilastirma.data?.rows || []).map((r) => (
                  <tr key={r.id} className="border-b last:border-0"><Td b>{r.urun_adi}</Td><Td>{r.cari_adi}</Td><Td>{[r.marka, r.model].filter(Boolean).join(" ")}</Td><Td r>{r.birim_fiyat} {r.para_birimi}</Td><Td r>{r.teslim_suresi_gun}g</Td><Td r>{r.min_siparis}</Td><Td>{r.fiyat_tarihi || "—"}</Td></tr>
                ))}
                {!(karsilastirma.data?.rows || []).length && <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">Teklif yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "rapor" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={rtip} onValueChange={setRtip}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>{RAPOR_TIPLERI.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={() => xlsx(rapor.data?.rows, `satinalma-${rtip}`)}><Download className="w-4 h-4 mr-1.5" /> Excel</Button>
          </div>
          <div className="bg-card border rounded-2xl overflow-x-auto">
            {rapor.isLoading ? <div className="py-6 text-center text-muted-foreground">Yükleniyor...</div>
            : !(rapor.data?.rows || []).length ? <div className="py-6 text-center text-muted-foreground">Kayıt yok.</div>
            : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b"><tr>{Object.keys(rapor.data.rows[0]).map((k) => <Th key={k} r={typeof rapor.data.rows[0][k] === "number"}>{k}</Th>)}</tr></thead>
                <tbody>
                  {rapor.data.rows.map((row, i) => <tr key={i} className="border-b last:border-0">{Object.values(row).map((v, j) => <Td key={j} r={typeof v === "number"}>{v}</Td>)}</tr>)}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "gecmis" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="w-56"><SearchableSelect value={gf.urun_id} onChange={(v) => setGf({ ...gf, urun_id: v })} options={[{ value: "", label: "Tüm Ürünler" }, ...urunler.map((u) => ({ value: u.id, label: u.ad }))]} placeholder="Ürün" /></div>
            <div className="w-52"><SearchableSelect value={gf.cari_id} onChange={(v) => setGf({ ...gf, cari_id: v })} options={[{ value: "", label: "Tüm Tedarikçiler" }, ...tedarikciler.map((c) => ({ value: c.id, label: c.company_name }))]} placeholder="Tedarikçi" /></div>
            <Button variant="outline" onClick={() => xlsx(gecmis.data?.rows, "fiyat-gecmisi")}><Download className="w-4 h-4 mr-1.5" /> Excel</Button>
          </div>
          <div className="grid grid-cols-4 gap-3 max-w-lg">
            {[["Kayıt", gecmis.data?.ozet?.kayit], ["Son Fiyat", gecmis.data?.ozet?.son], ["En Düşük", gecmis.data?.ozet?.en_dusuk], ["En Yüksek", gecmis.data?.ozet?.en_yuksek]].map(([l, v]) => (
              <div key={l} className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">{l}</p><p className="text-lg font-bold">{v ?? 0}</p></div>
            ))}
          </div>
          <div className="bg-card border rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/40 border-b"><tr><Th>Tarih</Th><Th>Ürün</Th><Th>Tedarikçi</Th><Th r>Alış Fiyatı</Th><Th>Kaynak</Th><Th>Fiş</Th></tr></thead>
              <tbody>
                {(gecmis.data?.rows || []).map((r) => <tr key={r.id} className="border-b last:border-0"><Td>{r.tarih}</Td><Td b>{r.urun_adi}</Td><Td>{r.cari_adi || "—"}</Td><Td r>{r.alis_fiyati} {r.para_birimi}</Td><Td>{r.kaynak}</Td><Td>{r.fis_no || "—"}</Td></tr>)}
                {!(gecmis.data?.rows || []).length && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Kayıt yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dlg.open} onOpenChange={(v) => !v && setDlg({ open: false, item: null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{dlg.item ? "Eşleştirme Düzenle" : "Yeni Ürün - Tedarikçi Eşleştirme"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label className="mb-1.5 block">Ürün *</Label><SearchableSelect value={form.urun_id} onChange={(v) => setForm({ ...form, urun_id: v })} options={urunler.map((u) => ({ value: u.id, label: u.ad }))} placeholder="Ürün" fixDialogWheelScroll /></div>
            <div><Label className="mb-1.5 block">Tedarikçi *</Label><SearchableSelect value={form.cari_id} onChange={(v) => setForm({ ...form, cari_id: v })} options={tedarikciler.map((c) => ({ value: c.id, label: c.company_name }))} placeholder="Tedarikçi" fixDialogWheelScroll /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">Tedarikçi Ürün Kodu</Label><Input value={form.tedarikci_urun_kodu} onChange={(e) => setForm({ ...form, tedarikci_urun_kodu: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Birim</Label><Input value={form.birim} onChange={(e) => setForm({ ...form, birim: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Marka</Label><Input value={form.marka} onChange={(e) => setForm({ ...form, marka: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Birim Fiyat *</Label><Input type="number" value={form.birim_fiyat} onChange={(e) => setForm({ ...form, birim_fiyat: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label className="mb-1.5 block">Para Birimi</Label><Input value={form.para_birimi} onChange={(e) => setForm({ ...form, para_birimi: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Fiyat Tarihi</Label><Input type="date" value={form.fiyat_tarihi} onChange={(e) => setForm({ ...form, fiyat_tarihi: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Teslim Süresi (Gün)</Label><Input type="number" value={form.teslim_suresi_gun} onChange={(e) => setForm({ ...form, teslim_suresi_gun: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label className="mb-1.5 block">Min. Sipariş</Label><Input type="number" value={form.min_siparis} onChange={(e) => setForm({ ...form, min_siparis: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label className="mb-1.5 block">Stok Durumu</Label><Input value={form.stok_durumu} onChange={(e) => setForm({ ...form, stok_durumu: e.target.value })} /></div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.tercih_edilen === 1} onCheckedChange={(v) => setForm({ ...form, tercih_edilen: v ? 1 : 0 })} /><Label>Tercih Edilen</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.aktif === 1} onCheckedChange={(v) => setForm({ ...form, aktif: v ? 1 : 0 })} /><Label>Aktif</Label></div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDlg({ open: false, item: null })}>İptal</Button>
              <Button disabled={!form.urun_id || !form.cari_id || saveM.isPending} onClick={() => saveM.mutate()}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
