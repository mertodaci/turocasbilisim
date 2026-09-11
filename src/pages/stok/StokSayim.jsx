import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { ClipboardCheck, Plus, Eye, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const DURUM_BADGE = {
  taslak: "bg-slate-100 text-slate-600", sayiliyor: "bg-amber-100 text-amber-700",
  tamamlandi: "bg-emerald-100 text-emerald-700",
  iptal: "bg-red-100 text-red-600 line-through",
};
const DURUM_LBL = { taslak: "Taslak", sayiliyor: "Sayılıyor", tamamlandi: "Tamamlandı", iptal: "İptal" };

export default function StokSayim() {
  const queryClient = useQueryClient();
  const [yeni, setYeni] = useState(false);
  const [form, setForm] = useState({ depo_id: "", tarih: new Date().toISOString().slice(0, 10), tip: "tam", aciklama: "" });
  const [detay, setDetay] = useState(null);

  const { data: sayimlar = [], isLoading } = useQuery({ queryKey: ["stok_sayimlar"], queryFn: () => flowApi.entities.StokSayim.list("-created_date", 2000) });
  const { data: ozet } = useQuery({ queryKey: ["stok_sayim_ozet"], queryFn: () => flowApi.stok.sayimOzet() });
  const { data: depolar = [] } = useQuery({ queryKey: ["stok_depolar"], queryFn: () => flowApi.entities.StokDepo.list("ad", 2000) });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["stok_sayimlar"] });
    queryClient.invalidateQueries({ queryKey: ["stok_sayim_ozet"] });
  };

  const olustur = useMutation({
    mutationFn: () => flowApi.stok.sayimOlustur({ ...form, doldur: 1 }),
    onSuccess: (s) => { invalidate(); setYeni(false); setDetay(s); toast.success(`${s.sayim_no} oluşturuldu — ${s.satirlar?.length || 0} ürün dolduruldu`); },
    onError: (e) => toast.error(String(e?.message || "Oluşturulamadı")),
  });

  const openDetay = async (s) => { try { setDetay(await flowApi.stok.sayimGetir(s.id)); } catch (e) { toast.error(String(e?.message)); } };

  const setSayilan = (i, v) => setDetay((d) => ({ ...d, satirlar: d.satirlar.map((r, idx) => idx === i ? { ...r, sayilan_miktar: v, fark: v === "" || v == null ? 0 : Number(v) - (Number(r.sistem_miktar) || 0) } : r) }));

  const kaydet = useMutation({
    mutationFn: () => flowApi.stok.sayimKaydet(detay.id, { satirlar: detay.satirlar, durum: "sayiliyor" }),
    onSuccess: (s) => { setDetay(s); invalidate(); toast.success("Sayılan miktarlar kaydedildi"); },
    onError: (e) => toast.error(String(e?.message)),
  });
  const tamamla = useMutation({
    mutationFn: () => flowApi.stok.sayimTamamla(detay.id),
    onSuccess: (r) => { invalidate(); flowApi.stok.sayimGetir(detay.id).then(setDetay); toast.success(`Sayım tamamlandı — ${r.fazla} fazla, ${r.eksik} eksik düzeltildi`); },
    onError: (e) => toast.error(String(e?.message)),
  });

  const k = ozet || {};
  const readOnly = detay && ["tamamlandi", "iptal"].includes(detay.durum);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-primary" /> Fiziksel Sayım / Envanter</h1>
          <p className="text-sm text-muted-foreground mt-1">Sayım listesi oluştur → fiili miktarları gir → farklar için otomatik düzeltme fişi (fazla: giriş, eksik: çıkış) onaylanır.</p>
        </div>
        <Button onClick={() => { setForm({ depo_id: "", tarih: new Date().toISOString().slice(0, 10), tip: "tam", aciklama: "" }); setYeni(true); }}><Plus className="w-4 h-4 mr-2" /> Yeni Sayım</Button>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-md">
        <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Toplam</p><p className="text-xl font-bold">{k.toplam ?? 0}</p></div>
        <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Devam Eden</p><p className="text-xl font-bold text-amber-600">{k.taslak ?? 0}</p></div>
        <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Tamamlanan</p><p className="text-xl font-bold text-emerald-600">{k.tamamlandi ?? 0}</p></div>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-x-auto">
        {isLoading ? <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        : sayimlar.length === 0 ? <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2"><ClipboardCheck className="w-8 h-8 opacity-40" /><p>Sayım yok.</p></div>
        : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-muted/40 border-b"><tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Sayım No</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Depo</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tarih</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Satır / Farklı</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {sayimlar.filter((s) => s.is_deleted !== 1).map((s, i) => (
                <tr key={s.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{s.sayim_no}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.depo_adi}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.tarih}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.satir_sayisi || 0} / {s.farkli_satir || 0}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${DURUM_BADGE[s.durum] || ""}`}>{DURUM_LBL[s.durum] || s.durum}</span></td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetay(s)}><Eye className="w-3.5 h-3.5" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Yeni sayım */}
      <Dialog open={yeni} onOpenChange={setYeni}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Yeni Sayım</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label className="mb-1.5 block">Depo *</Label>
              <SearchableSelect value={form.depo_id} onChange={(v) => setForm({ ...form, depo_id: v })} options={depolar.map((d) => ({ value: d.id, label: d.ad }))} placeholder="Depo seçin" fixDialogWheelScroll /></div>
            <div><Label className="mb-1.5 block">Tarih</Label><Input type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Açıklama</Label><Textarea rows={2} value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">Seçilen deponun mevcut stoğu (sistem miktarı) otomatik doldurulur. Fiili miktarları detay ekranında girersiniz.</p>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setYeni(false)}>İptal</Button>
              <Button disabled={!form.depo_id || olustur.isPending} onClick={() => olustur.mutate()}>{olustur.isPending ? "Oluşturuluyor..." : "Oluştur"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detay / sayım girişi */}
      <Dialog open={!!detay} onOpenChange={(v) => !v && setDetay(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>{detay?.sayim_no} — {detay?.depo_adi} <span className={`ml-2 text-xs px-2 py-0.5 rounded ${DURUM_BADGE[detay?.durum] || ""}`}>{DURUM_LBL[detay?.durum]}</span></DialogTitle></DialogHeader>
          {detay && (
            <div className="space-y-3 max-h-[68vh] overflow-y-auto">
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-muted/40"><tr>
                  <th className="text-left px-3 py-2">Ürün</th>
                  <th className="text-right px-3 py-2">Sistem</th>
                  <th className="text-right px-3 py-2 w-28">Sayılan</th>
                  <th className="text-right px-3 py-2">Fark</th>
                </tr></thead>
                <tbody>
                  {(detay.satirlar || []).map((r, i) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-1.5">{r.urun_adi}</td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground">{r.sistem_miktar}</td>
                      <td className="px-3 py-1.5 text-right">
                        <Input type="number" className="h-8 text-right" disabled={readOnly}
                          value={r.sayilan_miktar ?? ""} onChange={(e) => setSayilan(i, e.target.value)} />
                      </td>
                      <td className={`px-3 py-1.5 text-right font-medium ${Number(r.fark) > 0 ? "text-emerald-600" : Number(r.fark) < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                        {r.sayilan_miktar === "" || r.sayilan_miktar == null ? "—" : (Number(r.fark) > 0 ? "+" : "") + r.fark}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!readOnly && (
                <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => setDetay(null)}>Kapat</Button>
                  <Button variant="secondary" disabled={kaydet.isPending} onClick={() => kaydet.mutate()}>Sayılanı Kaydet</Button>
                  <Button disabled={tamamla.isPending} onClick={() => { if (confirm("Farklar için otomatik düzeltme fişi oluşturulup onaylanacak. Devam?")) tamamla.mutate(); }}>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Tamamla ve Düzelt
                  </Button>
                </div>
              )}
              {detay.durum === "tamamlandi" && (
                <p className="text-xs text-emerald-700 bg-emerald-50 rounded p-2">
                  Sayım tamamlandı. Düzeltme fişleri: {[detay.duzeltme_giris_fis_id && "giriş", detay.duzeltme_cikis_fis_id && "çıkış"].filter(Boolean).join(" + ") || "gerek yok (fark yok)"}.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
