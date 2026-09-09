import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { ClipboardList, Plus, Trash2, Eye, Check, X, Truck } from "lucide-react";
import { toast } from "sonner";

const DURUM_BADGE = {
  taslak: "bg-slate-100 text-slate-600", onay_bekliyor: "bg-amber-100 text-amber-700",
  onayli: "bg-blue-100 text-blue-700", kismen_sevk: "bg-purple-100 text-purple-700",
  sevk_edildi: "bg-emerald-100 text-emerald-700", iptal: "bg-red-100 text-red-600 line-through",
};
const DURUM_LBL = { taslak: "Taslak", onay_bekliyor: "Onay Bekliyor", onayli: "Onaylı", kismen_sevk: "Kısmen Sevk", sevk_edildi: "Sevk Edildi", iptal: "İptal" };
const ONCELIK = [{ v: "dusuk", l: "Düşük" }, { v: "orta", l: "Orta" }, { v: "yuksek", l: "Yüksek" }, { v: "acil", l: "Acil" }];
const bosSatir = () => ({ urun_id: "", urun_adi: "", birim: "", miktar: 1, not_: "" });

export default function StokTalep() {
  const queryClient = useQueryClient();
  const [yeni, setYeni] = useState(false);
  const [detay, setDetay] = useState(null);
  const [head, setHead] = useState({ departman: "", kaynak_depo_id: "", hedef_saha_id: "", is_emri_no: "", ihtiyac_tarihi: "", oncelik: "orta", aciklama: "" });
  const [lines, setLines] = useState([bosSatir()]);

  const { data: talepler = [], isLoading } = useQuery({ queryKey: ["stok_talepler"], queryFn: () => flowApi.entities.StokTalep.list("-created_date", 2000) });
  const { data: ozet } = useQuery({ queryKey: ["stok_talep_ozet"], queryFn: () => flowApi.stok.talepOzet() });
  const { data: urunler = [] } = useQuery({ queryKey: ["stok_urunler-min"], queryFn: () => flowApi.entities.StokUrun.list("ad", 5000) });
  const { data: depolar = [] } = useQuery({ queryKey: ["stok_depolar"], queryFn: () => flowApi.entities.StokDepo.list("ad", 2000) });
  const { data: sahalar = [] } = useQuery({ queryKey: ["stok_sahalar"], queryFn: () => flowApi.entities.StokSaha.list("ad", 5000) });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["stok_talepler"] });
    queryClient.invalidateQueries({ queryKey: ["stok_talep_ozet"] });
  };

  const olustur = useMutation({
    mutationFn: (gonder) => {
      const satirlar = lines.filter((l) => l.urun_id && Number(l.miktar) > 0).map((l) => ({ ...l, urun_adi: urunler.find((u) => u.id === l.urun_id)?.ad }));
      const talep = { ...head, kaynak_depo_adi: depolar.find((d) => d.id === head.kaynak_depo_id)?.ad, hedef_saha_adi: sahalar.find((s) => s.id === head.hedef_saha_id)?.ad, durum: gonder ? "onay_bekliyor" : "taslak" };
      return flowApi.stok.talepOlustur(talep, satirlar);
    },
    onSuccess: (t) => { invalidate(); setYeni(false); setLines([bosSatir()]); toast.success(`${t.talep_no} oluşturuldu`); },
    onError: (e) => toast.error(String(e?.message || "Oluşturulamadı")),
  });

  const openDetay = async (t) => { try { setDetay(await flowApi.stok.talepGetir(t.id)); } catch (e) { toast.error(String(e?.message)); } };
  const refreshDetay = () => flowApi.stok.talepGetir(detay.id).then(setDetay);

  const onaylaM = useMutation({ mutationFn: (id) => flowApi.stok.talepOnayla(id), onSuccess: () => { invalidate(); refreshDetay(); toast.success("Talep onaylandı"); }, onError: (e) => toast.error(String(e?.message)) });
  const iptalM = useMutation({ mutationFn: (id) => flowApi.stok.talepIptal(id), onSuccess: () => { invalidate(); refreshDetay(); toast.success("Talep iptal edildi"); }, onError: (e) => toast.error(String(e?.message)) });
  const sevkM = useMutation({
    mutationFn: (satirlar) => flowApi.stok.talepSevk(detay.id, satirlar),
    onSuccess: (r) => { invalidate(); refreshDetay(); toast.success(`Sevk fişi ${r.fis?.fis_no} oluşturuldu ve onaylandı`); },
    onError: (e) => toast.error(String(e?.message || "Sevk edilemedi")),
  });

  const k = ozet || {};

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="w-6 h-6 text-primary" /> Malzeme Talep / İş Emri</h1>
          <p className="text-sm text-muted-foreground mt-1">Şantiye/departman talebi → onay → onaylı talepten çıkış fişi (kısmi sevk destekli).</p>
        </div>
        <Button onClick={() => { setHead({ departman: "", kaynak_depo_id: "", hedef_saha_id: "", is_emri_no: "", ihtiyac_tarihi: "", oncelik: "orta", aciklama: "" }); setLines([bosSatir()]); setYeni(true); }}><Plus className="w-4 h-4 mr-2" /> Yeni Talep</Button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-w-2xl">
        {[["Toplam", k.toplam], ["Bekleyen", k.bekleyen], ["Onaylı", k.onayli], ["Kısmen", k.kismen], ["Sevk", k.sevk]].map(([l, v]) => (
          <div key={l} className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">{l}</p><p className="text-xl font-bold">{v ?? 0}</p></div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-x-auto">
        {isLoading ? <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        : talepler.length === 0 ? <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2"><ClipboardList className="w-8 h-8 opacity-40" /><p>Talep yok.</p></div>
        : (
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-muted/40 border-b"><tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Talep No</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Saha / İş Emri</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Kaynak Depo</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Öncelik</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Satır</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {talepler.filter((t) => t.is_deleted !== 1).map((t, i) => (
                <tr key={t.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{t.talep_no}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.hedef_saha_adi || "—"}{t.is_emri_no ? ` · ${t.is_emri_no}` : ""}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.kaynak_depo_adi || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{ONCELIK.find((o) => o.v === t.oncelik)?.l || t.oncelik}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.satir_sayisi || 0}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${DURUM_BADGE[t.durum] || ""}`}>{DURUM_LBL[t.durum] || t.durum}</span></td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetay(t)}><Eye className="w-3.5 h-3.5" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Yeni talep */}
      <Dialog open={yeni} onOpenChange={setYeni}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Yeni Malzeme Talebi</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[72vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">Departman</Label><Input value={head.departman} onChange={(e) => setHead({ ...head, departman: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">İş Emri No</Label><Input value={head.is_emri_no} onChange={(e) => setHead({ ...head, is_emri_no: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Kaynak Depo</Label>
                <SearchableSelect value={head.kaynak_depo_id} onChange={(v) => setHead({ ...head, kaynak_depo_id: v })} options={depolar.map((d) => ({ value: d.id, label: d.ad }))} placeholder="Karşılayacak depo" fixDialogWheelScroll /></div>
              <div><Label className="mb-1.5 block">Hedef Saha / Proje</Label>
                <SearchableSelect value={head.hedef_saha_id} onChange={(v) => setHead({ ...head, hedef_saha_id: v })} options={sahalar.map((s) => ({ value: s.id, label: s.ad }))} placeholder="Şantiye" fixDialogWheelScroll /></div>
              <div><Label className="mb-1.5 block">İhtiyaç Tarihi</Label><Input type="date" value={head.ihtiyac_tarihi} onChange={(e) => setHead({ ...head, ihtiyac_tarihi: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Öncelik</Label>
                <Select value={head.oncelik} onValueChange={(v) => setHead({ ...head, oncelik: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ONCELIK.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="mb-1.5 block">Açıklama</Label><Textarea rows={2} value={head.aciklama} onChange={(e) => setHead({ ...head, aciklama: e.target.value })} /></div>
            <div className="border rounded-xl p-3 space-y-2 bg-muted/10">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">Talep Satırları</p>
                <Button size="sm" onClick={() => setLines([...lines, bosSatir()])}><Plus className="w-3.5 h-3.5 mr-1" />Satır</Button></div>
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6"><SearchableSelect value={l.urun_id} onChange={(v) => setLines(lines.map((x, idx) => idx === i ? { ...x, urun_id: v, birim: urunler.find((u) => u.id === v)?.ana_birim || "" } : x))}
                    options={urunler.map((u) => ({ value: u.id, label: `${u.kod ? u.kod + " · " : ""}${u.ad}` }))} placeholder="Ürün" fixDialogWheelScroll /></div>
                  <div className="col-span-2"><Input placeholder="Birim" value={l.birim} onChange={(e) => setLines(lines.map((x, idx) => idx === i ? { ...x, birim: e.target.value } : x))} /></div>
                  <div className="col-span-2"><Input type="number" placeholder="Miktar" value={l.miktar} onChange={(e) => setLines(lines.map((x, idx) => idx === i ? { ...x, miktar: parseFloat(e.target.value) || 0 } : x))} /></div>
                  <div className="col-span-2 flex justify-end"><Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => setLines(lines.length > 1 ? lines.filter((_, idx) => idx !== i) : lines)}><Trash2 className="w-4 h-4" /></Button></div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setYeni(false)}>İptal</Button>
              <Button variant="secondary" disabled={olustur.isPending} onClick={() => olustur.mutate(false)}>Taslak Kaydet</Button>
              <Button disabled={olustur.isPending} onClick={() => olustur.mutate(true)}>Onaya Gönder</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detay */}
      <Dialog open={!!detay} onOpenChange={(v) => !v && setDetay(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{detay?.talep_no} <span className={`ml-2 text-xs px-2 py-0.5 rounded ${DURUM_BADGE[detay?.durum] || ""}`}>{DURUM_LBL[detay?.durum]}</span></DialogTitle></DialogHeader>
          {detay && (
            <div className="space-y-3 text-sm max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>Saha: <b className="text-foreground">{detay.hedef_saha_adi || "—"}</b></div>
                <div>Kaynak Depo: <b className="text-foreground">{detay.kaynak_depo_adi || "—"}</b></div>
                <div>İş Emri: <b className="text-foreground">{detay.is_emri_no || "—"}</b></div>
                <div>İhtiyaç: <b className="text-foreground">{detay.ihtiyac_tarihi || "—"}</b></div>
                <div>Talep Eden: <b className="text-foreground">{detay.talep_eden}</b></div>
                <div>Öncelik: <b className="text-foreground">{ONCELIK.find((o) => o.v === detay.oncelik)?.l}</b></div>
              </div>
              {detay.aciklama && <p className="text-muted-foreground">Açıklama: {detay.aciklama}</p>}
              <table className="w-full text-xs border rounded-lg overflow-hidden">
                <thead className="bg-muted/40"><tr><th className="text-left px-2 py-1.5">Ürün</th><th className="text-right px-2 py-1.5">İstenen</th><th className="text-right px-2 py-1.5">Karşılanan</th><th className="text-right px-2 py-1.5">Kalan</th></tr></thead>
                <tbody>
                  {(detay.satirlar || []).map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-2 py-1.5">{s.urun_adi} <span className="text-muted-foreground">{s.birim}</span></td>
                      <td className="px-2 py-1.5 text-right">{s.miktar}</td>
                      <td className="px-2 py-1.5 text-right text-emerald-600">{s.karsilanan_miktar || 0}</td>
                      <td className="px-2 py-1.5 text-right font-medium">{+(s.miktar - (s.karsilanan_miktar || 0)).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(detay.sevk_fisleri || []).length > 0 && (
                <div className="text-xs text-muted-foreground">Sevk fişleri: {detay.sevk_fisleri.map((f) => `${f.fis_no} (${f.durum})`).join(", ")}</div>
              )}
              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
                {["taslak", "onay_bekliyor"].includes(detay.durum) && (
                  <Button variant="secondary" disabled={onaylaM.isPending} onClick={() => onaylaM.mutate(detay.id)}><Check className="w-4 h-4 mr-1.5" /> Onayla</Button>
                )}
                {["onayli", "kismen_sevk"].includes(detay.durum) && (
                  <Button disabled={sevkM.isPending} onClick={() => { if (confirm("Kalan miktarlar için çıkış fişi oluşturulup onaylanacak. Devam?")) sevkM.mutate(null); }}>
                    <Truck className="w-4 h-4 mr-1.5" /> Kalanı Sevk Et
                  </Button>
                )}
                {detay.durum !== "iptal" && detay.durum !== "sevk_edildi" && (
                  <Button variant="ghost" className="text-destructive" disabled={iptalM.isPending} onClick={() => { if (confirm("Talep iptal edilsin mi?")) iptalM.mutate(detay.id); }}><X className="w-4 h-4 mr-1.5" /> İptal</Button>
                )}
                <Button variant="outline" onClick={() => setDetay(null)}>Kapat</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
