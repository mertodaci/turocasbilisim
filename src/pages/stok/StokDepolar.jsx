import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Warehouse, Truck, Wrench } from "lucide-react";
import { toast } from "sonner";

const TURLER = [
  { value: "fiziksel", label: "Fiziksel Depo", icon: Warehouse },
  { value: "arac", label: "Araç (Mobil Depo)", icon: Truck },
  { value: "el_aleti", label: "El Aletleri / Demirbaş", icon: Wrench },
];
const MODLAR = [
  { value: "normal", label: "Normal Stok" },
  { value: "el_aleti", label: "El Aletleri / Demirbaş" },
];

const empty = {
  kod: "", ad: "", turu: "fiziksel", adres: "", plaka: "", isletim_modu: "normal",
  aktif: 1, kural_giris: 1, kural_cikis: 1, kural_transfer: 1, sira: 0, notlar: "",
};

export default function StokDepolar() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);
  const [filtre, setFiltre] = useState({ q: "", durum: "hepsi", turu: "hepsi" });

  const { data: depolar = [], isLoading } = useQuery({
    queryKey: ["stok_depolar"],
    queryFn: () => flowApi.entities.StokDepo.list("sira", 2000),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["stok_depolar"] });
  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.StokDepo.create(data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Depo eklendi — GENEL RAF otomatik oluşturuldu"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.StokDepo.update(id, data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Güncellendi"); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.StokDepo.delete(id),
    onSuccess: () => { invalidate(); toast.success("Depo pasife alındı"); },
    onError: (e) => toast.error("Silinemedi: " + (e?.message || "hata")),
  });

  const openCreate = () => { setForm(empty); setDialog({ open: true, item: null }); };
  const openEdit = (d) => {
    setForm({
      kod: d.kod || "", ad: d.ad || "", turu: d.turu || "fiziksel", adres: d.adres || "",
      plaka: d.plaka || "", isletim_modu: d.isletim_modu || "normal", aktif: d.aktif ?? 1,
      kural_giris: d.kural_giris ?? 1, kural_cikis: d.kural_cikis ?? 1, kural_transfer: d.kural_transfer ?? 1,
      sira: d.sira || 0, notlar: d.notlar || "",
    });
    setDialog({ open: true, item: d });
  };

  const handleSubmit = () => {
    if (!form.ad.trim()) { toast.error("Depo adı zorunlu"); return; }
    if (dialog.item) updateMutation.mutate({ id: dialog.item.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = depolar.filter((d) => {
    if (filtre.q && !`${d.ad} ${d.kod} ${d.plaka}`.toLowerCase().includes(filtre.q.toLowerCase())) return false;
    if (filtre.durum === "aktif" && !(d.aktif === 1 || d.aktif === true)) return false;
    if (filtre.durum === "pasif" && (d.aktif === 1 || d.aktif === true)) return false;
    if (filtre.turu !== "hepsi" && d.turu !== filtre.turu) return false;
    return true;
  });
  const aktifSayi = depolar.filter((d) => d.aktif === 1 || d.aktif === true).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-primary" /> Depolar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stok tutan yerler (fiziksel depo / araç / el aletleri deposu). Şantiye ve müşteri
            teslim noktaları için <b>Sahalar / Projeler</b> ekranını kullanın.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni Depo</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">Toplam Depo</p><p className="text-2xl font-bold">{depolar.length}</p></div>
        <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">Aktif</p><p className="text-2xl font-bold text-emerald-600">{aktifSayi}</p></div>
        <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">Pasif</p><p className="text-2xl font-bold text-muted-foreground">{depolar.length - aktifSayi}</p></div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Depo adı / kod / plaka ara" value={filtre.q} onChange={(e) => setFiltre({ ...filtre, q: e.target.value })} />
        <Select value={filtre.durum} onValueChange={(v) => setFiltre({ ...filtre, durum: v })}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hepsi">Tüm Durumlar</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="pasif">Pasif</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtre.turu} onValueChange={(v) => setFiltre({ ...filtre, turu: v })}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hepsi">Tüm Türler</SelectItem>
            {TURLER.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <Warehouse className="w-8 h-8 opacity-40" /><p>Kayıt yok.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Depo</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tür</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">İşletim Modu</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">İşlem Kuralları</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const tcfg = TURLER.find((t) => t.value === d.turu) || TURLER[0];
                const TIcon = tcfg.icon;
                return (
                  <tr key={d.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium flex items-center gap-2"><TIcon className="w-4 h-4 text-muted-foreground" />{d.ad}</p>
                      <p className="text-xs text-muted-foreground">{[d.kod, d.plaka].filter(Boolean).join(" · ") || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{tcfg.label}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.isletim_modu === "el_aleti" ? "El Aletleri / Demirbaş" : "Normal Stok"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 text-[11px]">
                        <span className={d.kural_giris ? "text-emerald-600" : "text-muted-foreground line-through"}>Giriş</span>
                        <span className={d.kural_cikis ? "text-emerald-600" : "text-muted-foreground line-through"}>Çıkış</span>
                        <span className={d.kural_transfer ? "text-emerald-600" : "text-muted-foreground line-through"}>Transfer</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Switch checked={d.aktif === 1 || d.aktif === true}
                        onCheckedChange={(v) => updateMutation.mutate({ id: d.id, data: { aktif: v ? 1 : 0 } })} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm("Depo pasife alınsın mı? (geçmiş hareketi olan depo fiziksel silinmez)")) deleteMutation.mutate(d.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialog.open} onOpenChange={(v) => !v && setDialog({ open: false, item: null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{dialog.item ? "Depo Düzenle" : "Yeni Depo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="mb-1.5 block">Depo Adı *</Label>
                <Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} placeholder="Örn. ANA DEPO" />
              </div>
              <div>
                <Label className="mb-1.5 block">Kod</Label>
                <Input value={form.kod} onChange={(e) => setForm({ ...form, kod: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Tür</Label>
                <Select value={form.turu} onValueChange={(v) => setForm({ ...form, turu: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TURLER.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">İşletim Modu</Label>
                <Select value={form.isletim_modu} onValueChange={(v) => setForm({ ...form, isletim_modu: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODLAR.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {form.turu === "arac" && (
              <div>
                <Label className="mb-1.5 block">Plaka</Label>
                <Input value={form.plaka} onChange={(e) => setForm({ ...form, plaka: e.target.value })} placeholder="34 ABC 123" />
              </div>
            )}
            <div>
              <Label className="mb-1.5 block">Adres</Label>
              <Input value={form.adres} onChange={(e) => setForm({ ...form, adres: e.target.value })} />
            </div>
            <div className="border rounded-xl p-3 space-y-2 bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground">Depo İşlem Kuralları</p>
              <p className="text-[11px] text-muted-foreground">
                Pasif depo tüm işlemleri engeller. El Aletleri modunda normal çıkış ve transfer kapalı tutulur;
                teslim yalnızca zimmet modülünden yapılır.
              </p>
              <div className="flex flex-wrap gap-4 pt-1">
                {[
                  ["kural_giris", "Stok Giriş"],
                  ["kural_cikis", "Normal Çıkış"],
                  ["kural_transfer", "Transfer"],
                ].map(([k, lbl]) => (
                  <div key={k} className="flex items-center gap-2">
                    <Switch checked={form[k] === 1} onCheckedChange={(v) => setForm({ ...form, [k]: v ? 1 : 0 })} />
                    <Label className="text-sm">{lbl}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Sıra</Label>
                <Input type="number" value={form.sira} onChange={(e) => setForm({ ...form, sira: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <Switch checked={form.aktif === 1} onCheckedChange={(v) => setForm({ ...form, aktif: v ? 1 : 0 })} />
                <Label>Aktif</Label>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Notlar</Label>
              <Textarea rows={2} value={form.notlar} onChange={(e) => setForm({ ...form, notlar: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialog({ open: false, item: null })}>İptal</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
