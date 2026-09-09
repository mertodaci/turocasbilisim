import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { toast } from "sonner";

const DURUMLAR = [["taslak", "Taslak"], ["yayinda", "Yayında"], ["kapali", "Kapalı"]];
const durumLabel = (d) => (DURUMLAR.find(([k]) => k === d) || [, d])[1];
const empty = { baslik: "", bolum_id: "", bolum_adi: "", sube_id: "", sube_adi: "", durum: "taslak", baslangic: "", bitis: "", detay: "", yetkili_notu: "" };

export default function IkIlan() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);
  const [fDurum, setFDurum] = useState("");

  const { data: ilanlar = [], isLoading } = useQuery({ queryKey: ["ik_ilanlar"], queryFn: () => flowApi.entities.IkIlan.list("-created_date", 2000) });
  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });
  const { data: bolumler = [] } = useQuery({ queryKey: ["ik_bolumler_min"], queryFn: () => flowApi.entities.IkBolum.list("ad", 2000) });
  const subeById = useMemo(() => Object.fromEntries(subeler.map((s) => [s.id, s])), [subeler]);
  const bolumById = useMemo(() => Object.fromEntries(bolumler.map((b) => [b.id, b])), [bolumler]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ik_ilanlar"] });
  const createM = useMutation({ mutationFn: (d) => flowApi.entities.IkIlan.create(d), onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("İlan eklendi"); }, onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")) });
  const updateM = useMutation({ mutationFn: ({ id, data }) => flowApi.entities.IkIlan.update(id, data), onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Güncellendi"); }, onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")) });
  const deleteM = useMutation({ mutationFn: (id) => flowApi.entities.IkIlan.delete(id), onSuccess: () => { invalidate(); toast.success("Silindi"); }, onError: (e) => toast.error("Silinemedi: " + (e?.message || "hata")) });

  const openCreate = () => { setForm(empty); setDialog({ open: true, item: null }); };
  const openEdit = (r) => { setForm({ baslik: r.baslik || "", bolum_id: r.bolum_id || "", bolum_adi: r.bolum_adi || "", sube_id: r.sube_id || "", sube_adi: r.sube_adi || "", durum: r.durum || "taslak", baslangic: (r.baslangic || "").slice(0, 10), bitis: (r.bitis || "").slice(0, 10), detay: r.detay || "", yetkili_notu: r.yetkili_notu || "" }); setDialog({ open: true, item: r }); };
  const submit = () => {
    if (!form.baslik.trim()) { toast.error("Başlık zorunlu"); return; }
    const data = { ...form, sube_adi: subeById[form.sube_id]?.ad || "", bolum_adi: bolumById[form.bolum_id]?.ad || "" };
    if (dialog.item) updateM.mutate({ id: dialog.item.id, data });
    else createM.mutate(data);
  };

  const filtered = ilanlar.filter((r) => !fDurum || r.durum === fDurum);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="w-6 h-6 text-primary" /> İlanlar</h1>
          <p className="text-sm text-muted-foreground mt-1">İç/dış personel ilanları. Bölüm + şube bazlı, taslak / yayında / kapalı durumu.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni İlan</Button>
      </div>

      <Select value={fDurum || "hepsi"} onValueChange={(v) => setFDurum(v === "hepsi" ? "" : v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Durum" /></SelectTrigger>
        <SelectContent><SelectItem value="hepsi">Tüm durumlar</SelectItem>{DURUMLAR.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
      </Select>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? <div className="h-40 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> :
          filtered.length === 0 ? <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2"><Megaphone className="w-8 h-8 opacity-40" /><p>İlan yok.</p></div> : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Başlık</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Bölüm / Şube</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tarih Aralığı</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.baslik}</p>
                    {r.detay && <p className="text-xs text-muted-foreground truncate max-w-sm">{r.detay}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{[r.bolum_adi, r.sube_adi].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{[(r.baslangic || "").slice(0, 10), (r.bitis || "").slice(0, 10)].filter(Boolean).join(" → ") || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${r.durum === "yayinda" ? "bg-emerald-100 text-emerald-700" : r.durum === "kapali" ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-700"}`}>{durumLabel(r.durum)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("İlan silinsin mi?")) deleteM.mutate(r.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialog.open} onOpenChange={(v) => !v && setDialog({ open: false, item: null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{dialog.item ? "İlan Düzenle" : "Yeni İlan"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label className="mb-1.5 block">Başlık *</Label>
              <Input value={form.baslik} onChange={(e) => setForm({ ...form, baslik: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Bölüm</Label>
                <Select value={form.bolum_id || "yok"} onValueChange={(v) => setForm({ ...form, bolum_id: v === "yok" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent><SelectItem value="yok">—</SelectItem>{bolumler.map((b) => <SelectItem key={b.id} value={b.id}>{b.ad}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Şube</Label>
                <Select value={form.sube_id || "yok"} onValueChange={(v) => setForm({ ...form, sube_id: v === "yok" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent><SelectItem value="yok">—</SelectItem>{subeler.map((s) => <SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="mb-1.5 block">Durum</Label>
                <Select value={form.durum} onValueChange={(v) => setForm({ ...form, durum: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DURUMLAR.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Başlangıç</Label>
                <Input type="date" value={form.baslangic} onChange={(e) => setForm({ ...form, baslangic: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">Bitiş</Label>
                <Input type="date" value={form.bitis} onChange={(e) => setForm({ ...form, bitis: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">İlan Detayı</Label>
              <Textarea rows={4} value={form.detay} onChange={(e) => setForm({ ...form, detay: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Yetkili Notu</Label>
              <Textarea rows={2} value={form.yetkili_notu} onChange={(e) => setForm({ ...form, yetkili_notu: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialog({ open: false, item: null })}>İptal</Button>
              <Button onClick={submit} disabled={createM.isPending || updateM.isPending}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
