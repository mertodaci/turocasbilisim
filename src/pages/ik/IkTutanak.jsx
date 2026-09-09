import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileWarning, Paperclip } from "lucide-react";
import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");
const TURLER = [
  ["tutanak", "Tutanak"],
  ["ihtar", "İhtar"],
  ["savunma_talebi", "Savunma Talebi"],
];
const turLabel = (t) => (TURLER.find(([k]) => k === t) || [, t])[1];
const empty = { personel_id: "", personel_adi: "", tur: "tutanak", tarih: new Date().toISOString().slice(0, 10), konu: "", aciklama: "", dosya_url: "" };

export default function IkTutanak() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const [fTur, setFTur] = useState("");
  const [q, setQ] = useState("");

  const { data: kayitlar = [], isLoading } = useQuery({
    queryKey: ["ik_tutanaklar"],
    queryFn: () => flowApi.entities.IkTutanak.list("-tarih", 4000),
  });
  const { data: personeller = [] } = useQuery({
    queryKey: ["ik_personel_min"],
    queryFn: () => flowApi.entities.Employee.list("full_name", 5000),
  });
  const persById = useMemo(() => Object.fromEntries(personeller.map((p) => [p.id, p])), [personeller]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ik_tutanaklar"] });
  const createM = useMutation({
    mutationFn: (d) => flowApi.entities.IkTutanak.create(d),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Kayıt eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateM = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.IkTutanak.update(id, data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Güncellendi"); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });
  const deleteM = useMutation({
    mutationFn: (id) => flowApi.entities.IkTutanak.delete(id),
    onSuccess: () => { invalidate(); toast.success("Silindi"); },
    onError: (e) => toast.error("Silinemedi: " + (e?.message || "hata")),
  });

  const openCreate = () => { setForm(empty); setDialog({ open: true, item: null }); };
  const openEdit = (r) => {
    setForm({ personel_id: r.personel_id || "", personel_adi: r.personel_adi || "", tur: r.tur || "tutanak", tarih: (r.tarih || "").slice(0, 10), konu: r.konu || "", aciklama: r.aciklama || "", dosya_url: r.dosya_url || "" });
    setDialog({ open: true, item: r });
  };
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      setForm((f) => ({ ...f, dosya_url: data.url }));
    } catch { toast.error("Dosya yüklenemedi"); }
    finally { setUploading(false); }
  };
  const submit = () => {
    if (!form.personel_id) { toast.error("Personel seçin"); return; }
    if (!form.konu.trim()) { toast.error("Konu zorunlu"); return; }
    const p = persById[form.personel_id];
    const data = { ...form, personel_adi: p?.full_name || form.personel_adi };
    if (dialog.item) updateM.mutate({ id: dialog.item.id, data });
    else createM.mutate(data);
  };

  const filtered = kayitlar.filter((r) =>
    (!fTur || r.tur === fTur) &&
    (!q || `${r.personel_adi} ${r.konu} ${r.aciklama}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileWarning className="w-6 h-6 text-primary" /> Tutanak & İhtarlar</h1>
          <p className="text-sm text-muted-foreground mt-1">Personel disiplin kayıtları: tutanak, ihtar, savunma talebi. Belge eklenebilir.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni Kayıt</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input className="max-w-xs" placeholder="Personel / konu ara" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={fTur || "hepsi"} onValueChange={(v) => setFTur(v === "hepsi" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tür" /></SelectTrigger>
          <SelectContent><SelectItem value="hepsi">Tüm türler</SelectItem>{TURLER.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? <div className="h-40 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> :
          filtered.length === 0 ? <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2"><FileWarning className="w-8 h-8 opacity-40" /><p>Kayıt yok.</p></div> : (
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Personel</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tür</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tarih</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Konu</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Belge</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{r.personel_adi || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${r.tur === "ihtar" ? "bg-red-100 text-red-700" : r.tur === "savunma_talebi" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{turLabel(r.tur)}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{(r.tarih || "").slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <p>{r.konu}</p>
                    {r.aciklama && <p className="text-xs text-muted-foreground truncate max-w-sm">{r.aciklama}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {r.dosya_url ? <a href={r.dosya_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 text-xs"><Paperclip className="w-3.5 h-3.5" /> Aç</a> : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("Kayıt silinsin mi?")) deleteM.mutate(r.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
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
          <DialogHeader><DialogTitle>{dialog.item ? "Kayıt Düzenle" : "Yeni Tutanak / İhtar"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label className="mb-1.5 block">Personel *</Label>
              <Select value={form.personel_id} onValueChange={(v) => setForm({ ...form, personel_id: v })}>
                <SelectTrigger><SelectValue placeholder="Personel seç" /></SelectTrigger>
                <SelectContent>{personeller.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Tür</Label>
                <Select value={form.tur} onValueChange={(v) => setForm({ ...form, tur: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TURLER.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Tarih</Label>
                <Input type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Konu *</Label>
              <Input value={form.konu} onChange={(e) => setForm({ ...form, konu: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Açıklama</Label>
              <Textarea rows={3} value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Belge</Label>
              <Input type="file" onChange={handleFile} disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Yükleniyor...</p>}
              {form.dosya_url && <a href={form.dosya_url} target="_blank" rel="noreferrer" className="text-xs text-primary mt-1 inline-block">Yüklenen belgeyi aç</a>}
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
