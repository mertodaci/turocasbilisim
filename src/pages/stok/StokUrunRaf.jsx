import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Plus, Pencil, Trash2, PackageSearch } from "lucide-react";
import { toast } from "sonner";

const empty = { urun_id: "", depo_id: "", min_seviye: 0, max_seviye: 0, notlar: "" };

export default function StokUrunRaf() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");

  const { data: atamalar = [], isLoading } = useQuery({
    queryKey: ["stok_urun_raf"],
    queryFn: () => flowApi.entities.StokUrunRaf.list("urun_adi", 5000),
  });
  const { data: urunler = [] } = useQuery({
    queryKey: ["stok_urunler-min"],
    queryFn: () => flowApi.entities.StokUrun.list("ad", 5000),
  });
  const { data: depolar = [] } = useQuery({
    queryKey: ["stok_depolar"],
    queryFn: () => flowApi.entities.StokDepo.list("ad", 2000),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["stok_urun_raf"] });
  const urunAdi = (id) => urunler.find((u) => u.id === id)?.ad || "";
  const depoAdi = (id) => depolar.find((d) => d.id === id)?.ad || "";

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.StokUrunRaf.create(data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Atama eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.StokUrunRaf.update(id, data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Güncellendi"); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.StokUrunRaf.delete(id),
    onSuccess: () => { invalidate(); toast.success("Silindi"); },
    onError: (e) => toast.error("Silinemedi: " + (e?.message || "hata")),
  });

  const openCreate = () => { setForm(empty); setDialog({ open: true, item: null }); };
  const openEdit = (a) => {
    setForm({ urun_id: a.urun_id || "", depo_id: a.depo_id || "", min_seviye: a.min_seviye || 0, max_seviye: a.max_seviye || 0, notlar: a.notlar || "" });
    setDialog({ open: true, item: a });
  };
  const handleSubmit = () => {
    if (!form.urun_id || !form.depo_id) { toast.error("Ürün ve depo zorunlu"); return; }
    const data = { ...form, urun_adi: urunAdi(form.urun_id), depo_adi: depoAdi(form.depo_id) };
    if (dialog.item) updateMutation.mutate({ id: dialog.item.id, data });
    else createMutation.mutate(data);
  };

  const filtered = atamalar.filter((a) => !q || `${a.urun_adi} ${a.depo_adi}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <PackageSearch className="w-6 h-6 text-primary" /> Ürün - Raf Atama
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Ürünün depo bazında minimum / maksimum stok seviyesi. Kritik stok uyarıları minimum seviyeye göre üretilir.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni Atama</Button>
      </div>

      <Input className="max-w-xs" placeholder="Ürün / depo / raf ara" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <PackageSearch className="w-8 h-8 opacity-40" /><p>Atama yok.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ürün</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Depo</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Min</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Max</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{a.urun_adi || urunAdi(a.urun_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.depo_adi || depoAdi(a.depo_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.min_seviye || 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.max_seviye || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Atama silinsin mi?")) deleteMutation.mutate(a.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialog.open} onOpenChange={(v) => !v && setDialog({ open: false, item: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{dialog.item ? "Atama Düzenle" : "Yeni Ürün - Raf Atama"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-1.5 block">Ürün *</Label>
              <SearchableSelect value={form.urun_id} onChange={(v) => setForm({ ...form, urun_id: v })}
                options={urunler.map((u) => ({ value: u.id, label: `${u.kod ? u.kod + " · " : ""}${u.ad}` }))}
                placeholder="Ürün seçin" fixDialogWheelScroll />
            </div>
            <div>
              <Label className="mb-1.5 block">Depo *</Label>
              <SearchableSelect value={form.depo_id} onChange={(v) => setForm({ ...form, depo_id: v })}
                options={depolar.map((d) => ({ value: d.id, label: d.ad }))}
                placeholder="Depo seçin" fixDialogWheelScroll />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Minimum Seviye</Label>
                <Input type="number" value={form.min_seviye} onChange={(e) => setForm({ ...form, min_seviye: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="mb-1.5 block">Maksimum Seviye</Label>
                <Input type="number" value={form.max_seviye} onChange={(e) => setForm({ ...form, max_seviye: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Not</Label>
              <Input value={form.notlar} onChange={(e) => setForm({ ...form, notlar: e.target.value })} />
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
