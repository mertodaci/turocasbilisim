import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const empty = { tarih: "", ad: "", tip: "tam", kaynak: "yerel", aktif: 1 };

export default function IkTatilSihirbazi() {
  const qc = useQueryClient();
  const [yil, setYil] = useState(String(new Date().getFullYear()));
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);

  const { data: tatiller = [], isLoading } = useQuery({
    queryKey: ["ik_resmi_tatiller"],
    queryFn: () => flowApi.entities.IkResmiTatil.list("tarih", 2000),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ik_resmi_tatiller"] });
  const createMutation = useMutation({ mutationFn: (d) => flowApi.entities.IkResmiTatil.create(d), onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Tatil eklendi"); }, onError: (e) => toast.error(String(e?.message || "hata")) });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => flowApi.entities.IkResmiTatil.update(id, data), onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Güncellendi"); }, onError: (e) => toast.error(String(e?.message || "hata")) });
  const deleteMutation = useMutation({ mutationFn: (id) => flowApi.entities.IkResmiTatil.delete(id), onSuccess: () => { invalidate(); toast.success("Silindi"); }, onError: (e) => toast.error(String(e?.message || "hata")) });

  const filtered = tatiller.filter((t) => (t.tarih || "").startsWith(yil));

  const openCreate = () => { setForm({ ...empty, tarih: `${yil}-01-01` }); setDialog({ open: true, item: null }); };
  const openEdit = (t) => { setForm({ tarih: t.tarih || "", ad: t.ad || "", tip: t.tip || "tam", kaynak: t.kaynak || "yerel", aktif: t.aktif ?? 1 }); setDialog({ open: true, item: t }); };
  const handleSubmit = () => {
    if (!form.tarih || !form.ad.trim()) { toast.error("Tarih ve ad zorunlu"); return; }
    const data = { ...form, aktif: form.aktif ? 1 : 0 };
    if (dialog.item) updateMutation.mutate({ id: dialog.item.id, data });
    else createMutation.mutate(data);
  };

  const yillar = [...new Set(tatiller.map((t) => (t.tarih || "").slice(0, 4)).filter(Boolean))].sort();
  if (!yillar.includes(yil)) yillar.push(yil);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="w-6 h-6 text-primary" /> Tatil Sihirbazı</h1>
          <p className="text-sm text-muted-foreground mt-1">Türkiye resmî tatil takvimi + özel kapalı günler. Puantaj motoru bu tarihleri RT (tam) / yarım gün olarak işler; çalışılırsa tatil mesaisi hesaplanır.</p>
        </div>
        <div className="flex gap-2">
          <Select value={yil} onValueChange={setYil}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{yillar.sort().map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Özel Gün</Button>
        </div>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        {isLoading ? <div className="h-32 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Tarih</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Ad</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Tip</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Kaynak</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="px-4 py-2 text-muted-foreground">{t.tarih}</td>
                  <td className="px-4 py-2 font-medium">{t.ad}</td>
                  <td className="px-4 py-2">{t.tip === "yarim" ? <span className="text-amber-600">Yarım Gün</span> : "Tam Gün"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{t.kaynak}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Silinsin mi?")) deleteMutation.mutate(t.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">{yil} için tatil kaydı yok.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialog.open} onOpenChange={(v) => !v && setDialog({ open: false, item: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{dialog.item ? "Tatil Düzenle" : "Özel Gün / Tatil"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label className="mb-1.5 block">Tarih *</Label><Input type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Ad *</Label><Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Tip</Label>
              <Select value={form.tip} onValueChange={(v) => setForm({ ...form, tip: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="tam">Tam Gün</SelectItem><SelectItem value="yarim">Yarım Gün</SelectItem></SelectContent>
              </Select>
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
