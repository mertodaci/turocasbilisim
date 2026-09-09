import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookmarkCheck, Plus, X } from "lucide-react";
import { toast } from "sonner";

const DURUM = { acik: "bg-emerald-100 text-emerald-700", kullanildi: "bg-slate-100 text-slate-500", iptal: "bg-red-100 text-red-600 line-through" };
const DURUM_LBL = { acik: "Açık", kullanildi: "Kullanıldı", iptal: "İptal" };
const empty = { urun_id: "", depo_id: "", saha_id: "", miktar: 1, ihtiyac_tarihi: "", aciklama: "" };

export default function StokRezervasyon() {
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState("acik");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(empty);

  const { data, isLoading } = useQuery({ queryKey: ["stok_rez", filtre], queryFn: () => flowApi.stok.rezervasyonlar({ durum: filtre }) });
  const { data: urunler = [] } = useQuery({ queryKey: ["stok_urunler-min"], queryFn: () => flowApi.entities.StokUrun.list("ad", 5000) });
  const { data: depolar = [] } = useQuery({ queryKey: ["stok_depolar"], queryFn: () => flowApi.entities.StokDepo.list("ad", 2000) });
  const { data: sahalar = [] } = useQuery({ queryKey: ["stok_sahalar"], queryFn: () => flowApi.entities.StokSaha.list("ad", 5000) });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["stok_rez"] });
  const olustur = useMutation({
    mutationFn: () => flowApi.stok.rezervasyonOlustur({ ...form, miktar: Number(form.miktar) }),
    onSuccess: () => { invalidate(); setDialog(false); setForm(empty); toast.success("Rezervasyon oluşturuldu"); },
    onError: (e) => toast.error(String(e?.message || "Oluşturulamadı")),
  });
  const iptal = useMutation({
    mutationFn: (id) => flowApi.stok.rezervasyonIptal(id),
    onSuccess: () => { invalidate(); toast.success("Rezervasyon iptal edildi"); },
    onError: (e) => toast.error(String(e?.message || "İptal edilemedi")),
  });

  const rows = data?.rows || [];
  const o = data?.ozet || {};

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookmarkCheck className="w-6 h-6 text-primary" /> Proje / Saha Rezervasyonu</h1>
          <p className="text-sm text-muted-foreground mt-1">Stok bir proje/sahaya ayrılır; hareket üretmez. Kullanılabilir stok = mevcut − açık rezervasyon. Çıkış onayında hesaba katılır.</p>
        </div>
        <Button onClick={() => setDialog(true)}><Plus className="w-4 h-4 mr-1.5" /> Yeni Rezervasyon</Button>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-md">
        <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Toplam</p><p className="text-xl font-bold">{o.toplam ?? 0}</p></div>
        <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Açık</p><p className="text-xl font-bold">{o.acik ?? 0}</p></div>
        <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Açık Miktar</p><p className="text-xl font-bold">{o.acik_miktar ?? 0}</p></div>
      </div>

      <Select value={filtre} onValueChange={setFiltre}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="acik">Açık</SelectItem>
          <SelectItem value="kullanildi">Kullanıldı</SelectItem>
          <SelectItem value="iptal">İptal</SelectItem>
          <SelectItem value="hepsi">Tümü</SelectItem>
        </SelectContent>
      </Select>

      <div className="bg-card rounded-2xl border shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2"><BookmarkCheck className="w-8 h-8 opacity-40" /><p>Rezervasyon yok.</p></div>
        ) : (
          <table className="w-full text-sm min-w-[860px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Rez No</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ürün</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Depo</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Saha / Proje</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Miktar</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Karşılanan</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">İhtiyaç T.</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{r.rez_no}</td>
                  <td className="px-4 py-3">{r.urun_adi}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.depo_adi}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.saha_adi || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{r.miktar}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{r.karsilanan || 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.ihtiyac_tarihi || "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${DURUM[r.durum] || ""}`}>{DURUM_LBL[r.durum] || r.durum}</span></td>
                  <td className="px-4 py-3 text-right">
                    {r.durum === "acik" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="İptal"
                        disabled={iptal.isPending} onClick={() => { if (confirm("Rezervasyon iptal edilsin mi?")) iptal.mutate(r.id); }}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Yeni Rezervasyon</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="mb-1.5 block">Ürün *</Label>
              <SearchableSelect value={form.urun_id} onChange={(v) => setForm({ ...form, urun_id: v })}
                options={urunler.map((u) => ({ value: u.id, label: `${u.kod ? u.kod + " · " : ""}${u.ad}` }))} placeholder="Ürün" />
            </div>
            <div>
              <Label className="mb-1.5 block">Depo *</Label>
              <SearchableSelect value={form.depo_id} onChange={(v) => setForm({ ...form, depo_id: v })}
                options={depolar.map((d) => ({ value: d.id, label: d.ad }))} placeholder="Depo" />
            </div>
            <div>
              <Label className="mb-1.5 block">Saha / Proje</Label>
              <SearchableSelect value={form.saha_id} onChange={(v) => setForm({ ...form, saha_id: v })}
                options={[{ value: "", label: "— Seçilmedi" }, ...sahalar.map((s) => ({ value: s.id, label: s.ad }))]} placeholder="Saha" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">Miktar *</Label><Input type="number" value={form.miktar} onChange={(e) => setForm({ ...form, miktar: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">İhtiyaç Tarihi</Label><Input type="date" value={form.ihtiyac_tarihi} onChange={(e) => setForm({ ...form, ihtiyac_tarihi: e.target.value })} /></div>
            </div>
            <div><Label className="mb-1.5 block">Açıklama</Label><Textarea rows={2} value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialog(false)}>İptal</Button>
              <Button disabled={olustur.isPending || !form.urun_id || !form.depo_id || !(Number(form.miktar) > 0)} onClick={() => olustur.mutate()}>
                {olustur.isPending ? "Kaydediliyor..." : "Rezerve Et"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
