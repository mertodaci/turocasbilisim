import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarClock, Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const empty = {
  ad: "", baslangic_tarihi: "", bitis_tarihi: "", ana_vardiya_id: "",
  adimlar_json: [], haftalik_izin_kac_gun_calis: 6, haftalik_izin_kac_gun: 1, haftalik_izin_devret: 0,
  dongu_baslangic: "esit", aktif: 1,
};

export default function IkVardiyaPlanlari() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);

  const { data: planlar = [], isLoading } = useQuery({ queryKey: ["ik_vardiya_planlari"], queryFn: () => flowApi.entities.IkVardiyaPlan.list("-created_date", 300) });
  const { data: vardiyalar = [] } = useQuery({ queryKey: ["ik_vardiyalar"], queryFn: () => flowApi.entities.IkVardiya.list("ad", 500) });
  const vardiyaAdi = (id) => vardiyalar.find((v) => v.id === id)?.ad || "—";

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ik_vardiya_planlari"] });
  const createMutation = useMutation({ mutationFn: (d) => flowApi.entities.IkVardiyaPlan.create(d), onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Plan eklendi"); }, onError: (e) => toast.error(String(e?.message || "hata")) });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => flowApi.entities.IkVardiyaPlan.update(id, data), onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Güncellendi"); }, onError: (e) => toast.error(String(e?.message || "hata")) });
  const deleteMutation = useMutation({ mutationFn: (id) => flowApi.entities.IkVardiyaPlan.delete(id), onSuccess: () => { invalidate(); toast.success("Silindi"); }, onError: (e) => toast.error(String(e?.message || "hata")) });

  const openCreate = () => { setForm({ ...empty, adimlar_json: [] }); setDialog({ open: true, item: null }); };
  const openEdit = (p) => {
    let adimlar = [];
    try { adimlar = Array.isArray(p.adimlar_json) ? p.adimlar_json : JSON.parse(p.adimlar_json || "[]"); } catch { adimlar = []; }
    setForm({ ...empty, ...p, adimlar_json: adimlar });
    setDialog({ open: true, item: p });
  };
  const addAdim = () => setForm((f) => ({ ...f, adimlar_json: [...f.adimlar_json, { tip: "vardiya", vardiya_id: "" }] }));
  const setAdim = (i, patch) => setForm((f) => ({ ...f, adimlar_json: f.adimlar_json.map((a, idx) => idx === i ? { ...a, ...patch } : a) }));
  const delAdim = (i) => setForm((f) => ({ ...f, adimlar_json: f.adimlar_json.filter((_, idx) => idx !== i) }));

  const handleSubmit = () => {
    if (!form.ad.trim()) { toast.error("Plan adı zorunlu"); return; }
    const data = {
      ...form,
      haftalik_izin_kac_gun_calis: Number(form.haftalik_izin_kac_gun_calis) || 0,
      haftalik_izin_kac_gun: Number(form.haftalik_izin_kac_gun) || 0,
      haftalik_izin_devret: form.haftalik_izin_devret ? 1 : 0,
      aktif: form.aktif ? 1 : 0,
    };
    if (dialog.item) updateMutation.mutate({ id: dialog.item.id, data });
    else createMutation.mutate(data);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarClock className="w-6 h-6 text-primary" /> Döngüsel Vardiya Planları</h1>
          <p className="text-sm text-muted-foreground mt-1">Adım listesi = Vardiya / Off (O) / Haftalık İzin (H). Off ve haftalık izin farklıdır. Haftalık izin hak-ediş sayacı: kaç çalışma gününde kaç gün izin.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni Plan</Button>
      </div>

      <div className="space-y-3">
        {isLoading ? <p className="text-muted-foreground">Yükleniyor...</p> : planlar.map((p) => {
          let adimlar = []; try { adimlar = Array.isArray(p.adimlar_json) ? p.adimlar_json : JSON.parse(p.adimlar_json || "[]"); } catch { adimlar = []; }
          return (
            <div key={p.id} className="bg-card border rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{p.ad}</p>
                  <p className="text-xs text-muted-foreground">{p.baslangic_tarihi || "—"} → {p.bitis_tarihi || "—"} · {adimlar.length} adım · haftalık izin {p.haftalik_izin_kac_gun_calis}/{p.haftalik_izin_kac_gun}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Plan silinsin mi?")) deleteMutation.mutate(p.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {adimlar.map((a, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded bg-muted">
                    {a.tip === "off" ? "O" : a.tip === "haftalik_izin" ? "H" : vardiyaAdi(a.vardiya_id)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {!isLoading && !planlar.length && <p className="text-sm text-muted-foreground">Plan yok.</p>}
      </div>

      <Dialog open={dialog.open} onOpenChange={(v) => !v && setDialog({ open: false, item: null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{dialog.item ? "Plan Düzenle" : "Yeni Döngüsel Plan"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[72vh] overflow-y-auto pr-1">
            <div><Label className="mb-1 block text-xs">Plan Adı *</Label><Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs">Başlangıç</Label><Input type="date" value={form.baslangic_tarihi} onChange={(e) => setForm({ ...form, baslangic_tarihi: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Bitiş</Label><Input type="date" value={form.bitis_tarihi} onChange={(e) => setForm({ ...form, bitis_tarihi: e.target.value })} /></div>
            </div>
            <div><Label className="mb-1 block text-xs">Ana Vardiya (transfer hedefi)</Label>
              <Select value={form.ana_vardiya_id || "yok"} onValueChange={(v) => setForm({ ...form, ana_vardiya_id: v === "yok" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent><SelectItem value="yok">— Yok</SelectItem>{vardiyalar.map((v) => <SelectItem key={v.id} value={v.id}>{v.ad}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Plan Adımları</Label>
              <Button size="sm" variant="outline" onClick={addAdim}><Plus className="w-3.5 h-3.5 mr-1" /> Adım</Button>
            </div>
            {form.adimlar_json.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                <Select value={a.tip} onValueChange={(v) => setAdim(i, { tip: v })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="vardiya">Vardiya</SelectItem><SelectItem value="off">Off (O)</SelectItem><SelectItem value="haftalik_izin">Haftalık İzin (H)</SelectItem></SelectContent>
                </Select>
                {a.tip === "vardiya" && (
                  <Select value={a.vardiya_id || "sec"} onValueChange={(v) => setAdim(i, { vardiya_id: v === "sec" ? "" : v })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Vardiya" /></SelectTrigger>
                    <SelectContent><SelectItem value="sec">Seçin</SelectItem>{vardiyalar.map((v) => <SelectItem key={v.id} value={v.id}>{v.ad}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => delAdim(i)}><X className="w-4 h-4" /></Button>
              </div>
            ))}

            <div className="grid grid-cols-3 gap-3">
              <div><Label className="mb-1 block text-xs">Kaç gün çalış</Label><Input type="number" value={form.haftalik_izin_kac_gun_calis} onChange={(e) => setForm({ ...form, haftalik_izin_kac_gun_calis: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Kaç gün izin</Label><Input type="number" value={form.haftalik_izin_kac_gun} onChange={(e) => setForm({ ...form, haftalik_izin_kac_gun: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Döngü başlangıç</Label>
                <Select value={form.dongu_baslangic} onValueChange={(v) => setForm({ ...form, dongu_baslangic: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="esit">Eşit dağıt</SelectItem><SelectItem value="birinci">Herkes 1. adımdan</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialog({ open: false, item: null })}>İptal</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
