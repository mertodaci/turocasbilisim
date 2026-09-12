import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

const empty = { ad: "", baslangic: "08:00", bitis: "18:00" };

export default function DevriyeVardiyaTanim() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);

  const { data: vardiyalar = [], isLoading } = useQuery({
    queryKey: ["devriye_vardiyalar"],
    queryFn: () => flowApi.entities.DevriyeVardiya.list("ad", 500),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["devriye_vardiyalar"] });
  const createM = useMutation({
    mutationFn: (d) => flowApi.entities.DevriyeVardiya.create(d),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Vardiya eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateM = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.DevriyeVardiya.update(id, data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Güncellendi"); },
  });
  const deleteM = useMutation({
    mutationFn: (id) => flowApi.entities.DevriyeVardiya.delete(id),
    onSuccess: () => { invalidate(); toast.success("Silindi"); },
  });

  const openEdit = (v) => { setForm(v ? { ad: v.ad, baslangic: v.baslangic, bitis: v.bitis } : empty); setDialog({ open: true, item: v }); };
  const submit = () => {
    if (!form.ad.trim()) { toast.error("Ad zorunlu"); return; }
    if (dialog.item) updateM.mutate({ id: dialog.item.id, data: form });
    else createM.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="w-6 h-6 text-primary" /> Vardiya Tanımları</h1>
          <p className="text-sm text-muted-foreground mt-1">Güvenlik personeli vardiyaları.</p>
        </div>
        <Button onClick={() => openEdit(null)}><Plus className="w-4 h-4 mr-2" /> Yeni Vardiya</Button>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? <div className="h-40 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> :
          vardiyalar.length === 0 ? <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2"><Clock className="w-8 h-8 opacity-40" /><p>Vardiya yok.</p></div> : (
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ad</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Başlangıç</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Bitiş</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {vardiyalar.map((v, i) => (
                <tr key={v.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{v.ad}</td>
                  <td className="px-4 py-3">{v.baslangic}</td>
                  <td className="px-4 py-3">{v.bitis}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Vardiya silinsin mi?")) deleteM.mutate(v.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialog.open} onOpenChange={(v) => !v && setDialog({ open: false, item: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{dialog.item ? "Vardiya Düzenle" : "Yeni Vardiya"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label className="mb-1.5 block">Ad *</Label><Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">Başlangıç</Label><Input type="time" value={form.baslangic} onChange={(e) => setForm({ ...form, baslangic: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Bitiş</Label><Input type="time" value={form.bitis} onChange={(e) => setForm({ ...form, bitis: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialog({ open: false, item: null })}>İptal</Button>
              <Button onClick={submit}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
