import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const empty = {
  ad: "", kisa_kod: "G", renk: "#2563eb", baslama_saati: "08:30", bitis_saati: "18:00",
  gec_tolerans_dk: 0, erken_tolerans_dk: 0, fazla_mesai_katsayisi: 1.5,
  gece_mi: 0, ertesi_gune_tasar: 0, rt_mesaisi_hesapla: 1, planlamada_kullan: 1,
  haftalik_izin_sayacina_ekle: 1, varsayilan: 0, aktif: 1,
};

export default function IkVardiyalar() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);

  const { data: vardiyalar = [], isLoading } = useQuery({
    queryKey: ["ik_vardiyalar"],
    queryFn: () => flowApi.entities.IkVardiya.list("ad", 500),
  });
  const { data: personeller = [] } = useQuery({ queryKey: ["ik_personel_full"], queryFn: () => flowApi.entities.Employee.list("full_name", 8000) });
  const sayimByVardiya = personeller.reduce((m, p) => { if (p.vardiya_id) m[p.vardiya_id] = (m[p.vardiya_id] || 0) + 1; return m; }, {});

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ik_vardiyalar"] });
  const createMutation = useMutation({ mutationFn: (d) => flowApi.entities.IkVardiya.create(d), onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Vardiya eklendi"); }, onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")) });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => flowApi.entities.IkVardiya.update(id, data), onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Güncellendi"); }, onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")) });
  const deleteMutation = useMutation({ mutationFn: (id) => flowApi.entities.IkVardiya.delete(id), onSuccess: () => { invalidate(); toast.success("Silindi"); }, onError: (e) => toast.error("Silinemedi: " + (e?.message || "hata")) });

  const openCreate = () => { setForm(empty); setDialog({ open: true, item: null }); };
  const openEdit = (v) => {
    setForm({ ...empty, ...v, fazla_mesai_katsayisi: v.fazla_mesai_katsayisi ?? 1.5 });
    setDialog({ open: true, item: v });
  };
  const handleSubmit = () => {
    if (!form.ad.trim()) { toast.error("Vardiya adı zorunlu"); return; }
    const data = {
      ...form,
      gec_tolerans_dk: Number(form.gec_tolerans_dk) || 0, erken_tolerans_dk: Number(form.erken_tolerans_dk) || 0,
      fazla_mesai_katsayisi: Number(form.fazla_mesai_katsayisi) || 1.5,
      gece_mi: form.gece_mi ? 1 : 0, ertesi_gune_tasar: form.ertesi_gune_tasar ? 1 : 0,
      rt_mesaisi_hesapla: form.rt_mesaisi_hesapla ? 1 : 0, planlamada_kullan: form.planlamada_kullan ? 1 : 0,
      haftalik_izin_sayacina_ekle: form.haftalik_izin_sayacina_ekle ? 1 : 0,
      varsayilan: form.varsayilan ? 1 : 0, aktif: form.aktif ? 1 : 0,
    };
    if (dialog.item) updateMutation.mutate({ id: dialog.item.id, data });
    else createMutation.mutate(data);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="w-6 h-6 text-primary" /> Vardiya Tanımları</h1>
          <p className="text-sm text-muted-foreground mt-1">Saat aralığı, gece geçişi, geç/erken tolerans ve fazla mesai katsayısı. Personel bir vardiyaya bağlanır; puantaj bu vardiyaya göre geç/erken/eksik hesaplar.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni Vardiya</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading ? <p className="text-muted-foreground">Yükleniyor...</p> : vardiyalar.map((v) => (
          <div key={v.id} className="bg-card border rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: v.renk || "#2563eb" }} />
                <p className="font-semibold">{v.ad}</p>
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{v.kisa_kod}</span>
                {v.varsayilan ? <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">varsayılan</span> : null}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Vardiya silinsin mi?")) deleteMutation.mutate(v.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
            <p className="text-sm">{v.baslama_saati} → {v.bitis_saati} {v.ertesi_gune_tasar ? <span className="text-xs text-muted-foreground">(ertesi güne taşar)</span> : null}</p>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Fazla mesai: {v.fazla_mesai_katsayisi}x · Geç tol: {v.gec_tolerans_dk} dk · Erken: {v.erken_tolerans_dk} dk</p>
              <p>{sayimByVardiya[v.id] || 0} aktif personel {v.rt_mesaisi_hesapla ? "· RT mesaisi hesaplanır" : ""}</p>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialog.open} onOpenChange={(v) => !v && setDialog({ open: false, item: null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{dialog.item ? "Vardiya Düzenle" : "Yeni Vardiya"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[72vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Label className="mb-1 block text-xs">Vardiya Adı *</Label><Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Kısa Kod</Label>
                <Select value={form.kisa_kod} onValueChange={(v) => setForm({ ...form, kisa_kod: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="G">G (Gündüz)</SelectItem><SelectItem value="N">N (Gece)</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="mb-1 block text-xs">Başlama</Label><Input type="time" value={form.baslama_saati} onChange={(e) => setForm({ ...form, baslama_saati: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Bitiş</Label><Input type="time" value={form.bitis_saati} onChange={(e) => setForm({ ...form, bitis_saati: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Renk</Label><Input type="color" value={form.renk} onChange={(e) => setForm({ ...form, renk: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Geç Tolerans (dk)</Label><Input type="number" value={form.gec_tolerans_dk} onChange={(e) => setForm({ ...form, gec_tolerans_dk: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Erken Çıkış Tol. (dk)</Label><Input type="number" value={form.erken_tolerans_dk} onChange={(e) => setForm({ ...form, erken_tolerans_dk: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Fazla Mesai Katsayısı</Label>
                <Select value={String(form.fazla_mesai_katsayisi)} onValueChange={(v) => setForm({ ...form, fazla_mesai_katsayisi: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["0.5", "1", "1.5", "2", "3"].map((k) => <SelectItem key={k} value={k}>{k}x</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {[
              ["gece_mi", "Gece vardiyası"],
              ["ertesi_gune_tasar", "Ertesi güne taşar (gece geçişi)"],
              ["rt_mesaisi_hesapla", "Resmî tatilde çalışma → tatil mesaisi hesapla"],
              ["planlamada_kullan", "Döngüsel planlamada kullanılabilir"],
              ["haftalik_izin_sayacina_ekle", "Haftalık izin hak-ediş sayacına ekle"],
              ["varsayilan", "Varsayılan vardiya"],
              ["aktif", "Aktif"],
            ].map(([k, l]) => (
              <div key={k} className="flex items-center gap-3">
                <Switch checked={!!form[k]} onCheckedChange={(v) => setForm({ ...form, [k]: v ? 1 : 0 })} />
                <Label className="text-xs">{l}</Label>
              </div>
            ))}
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
