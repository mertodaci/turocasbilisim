import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { toast } from "sonner";

const empty = { ad: "", ust_grup_id: "", sira: 0, aktif: 1 };

export default function StokGruplar() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);

  const { data: gruplar = [], isLoading } = useQuery({
    queryKey: ["stok_gruplar"],
    queryFn: () => flowApi.entities.StokUrunGrup.list("ad", 1000),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["stok_gruplar"] });

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.StokUrunGrup.create(data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Grup eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.StokUrunGrup.update(id, data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Güncellendi"); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.StokUrunGrup.delete(id),
    onSuccess: () => { invalidate(); toast.success("Silindi"); },
    onError: (e) => toast.error("Silinemedi: " + (e?.message || "hata")),
  });

  const openCreate = () => { setForm(empty); setDialog({ open: true, item: null }); };
  const openEdit = (item) => {
    setForm({ ad: item.ad || "", ust_grup_id: item.ust_grup_id || "", sira: item.sira || 0, aktif: item.aktif ?? 1 });
    setDialog({ open: true, item });
  };

  const handleSubmit = () => {
    if (!form.ad.trim()) { toast.error("Grup adı zorunlu"); return; }
    const ust = gruplar.find((g) => g.id === form.ust_grup_id);
    const data = { ...form, ust_grup_adi: ust ? ust.ad : "" };
    if (dialog.item) updateMutation.mutate({ id: dialog.item.id, data });
    else createMutation.mutate(data);
  };

  const grupSayisi = (id) => gruplar.filter((g) => g.ust_grup_id === id).length;
  const ustOptions = gruplar
    .filter((g) => !dialog.item || g.id !== dialog.item.id)
    .map((g) => ({ value: g.id, label: g.ad }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-primary" /> Ürün Grupları
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Ana grup ve alt grup yapısını yönetin.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni Grup</Button>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : gruplar.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <FolderTree className="w-8 h-8 opacity-40" /><p>Henüz grup eklenmemiş.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Grup</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Üst Grup</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Sıra</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Alt Grup</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {gruplar.map((g, i) => (
                <tr key={g.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{g.ad}</td>
                  <td className="px-4 py-3 text-muted-foreground">{g.ust_grup_adi || "— (Ana Grup)"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{g.sira || 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">{grupSayisi(g.id)}</td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={g.aktif === 1 || g.aktif === true}
                      onCheckedChange={(v) => updateMutation.mutate({ id: g.id, data: { aktif: v ? 1 : 0 } })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(g)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Grup silinsin mi?")) deleteMutation.mutate(g.id); }}>
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
          <DialogHeader><DialogTitle>{dialog.item ? "Grup Düzenle" : "Yeni Grup"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-1.5 block">Grup Adı *</Label>
              <Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} placeholder="Örn. ELEKTRİK MALZEMELERİ" />
            </div>
            <div>
              <Label className="mb-1.5 block">Üst Grup</Label>
              <SearchableSelect
                value={form.ust_grup_id}
                onChange={(v) => setForm({ ...form, ust_grup_id: v })}
                options={[{ value: "", label: "— (Ana Grup)" }, ...ustOptions]}
                placeholder="Ana grup"
                fixDialogWheelScroll
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Sıra</Label>
              <Input type="number" value={form.sira} onChange={(e) => setForm({ ...form, sira: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.aktif === 1} onCheckedChange={(v) => setForm({ ...form, aktif: v ? 1 : 0 })} />
              <Label>Aktif</Label>
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
