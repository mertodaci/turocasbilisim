import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, MapPinned } from "lucide-react";
import { toast } from "sonner";

const empty = { ad: "", aciklama: "", aktif: 1 };

export default function StokZimmetYerleri() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");

  const { data: yerler = [], isLoading } = useQuery({
    queryKey: ["stok_zimmet_yerleri"],
    queryFn: () => flowApi.entities.StokZimmetYeri.list("ad", 2000),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["stok_zimmet_yerleri"] });
  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.StokZimmetYeri.create(data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Zimmet yeri eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.StokZimmetYeri.update(id, data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Güncellendi"); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.StokZimmetYeri.delete(id),
    onSuccess: () => { invalidate(); toast.success("Silindi"); },
    onError: (e) => toast.error("Silinemedi: " + (e?.message || "hata")),
  });

  const openCreate = () => { setForm(empty); setDialog({ open: true, item: null }); };
  const openEdit = (y) => { setForm({ ad: y.ad || "", aciklama: y.aciklama || "", aktif: y.aktif ?? 1 }); setDialog({ open: true, item: y }); };
  const handleSubmit = () => {
    if (!form.ad.trim()) { toast.error("Ad zorunlu"); return; }
    if (dialog.item) updateMutation.mutate({ id: dialog.item.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = yerler.filter((y) => y.is_deleted !== 1 && (!q || `${y.ad} ${y.aciklama || ""}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPinned className="w-6 h-6 text-primary" /> Zimmet Yeri Tanımları
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bir kişiye değil doğrudan bir yere/mekana (oda, ortak alan vb.) zimmetlenecek malzemeler için konum listesi.
            Müşteri şantiyeleri için <b>Sahalar / Projeler</b> ekranını kullanın.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni Zimmet Yeri</Button>
      </div>

      <Input className="max-w-xs" placeholder="Yer adı ara" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <MapPinned className="w-8 h-8 opacity-40" /><p>Kayıt yok.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Yer</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Açıklama</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((y, i) => (
                <tr key={y.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{y.ad}</td>
                  <td className="px-4 py-3 text-muted-foreground">{y.aciklama || "—"}</td>
                  <td className="px-4 py-3">
                    <Switch checked={y.aktif === 1 || y.aktif === true}
                      onCheckedChange={(v) => updateMutation.mutate({ id: y.id, data: { aktif: v ? 1 : 0 } })} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(y)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Silinsin mi?")) deleteMutation.mutate(y.id); }}>
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
          <DialogHeader><DialogTitle>{dialog.item ? "Zimmet Yeri Düzenle" : "Yeni Zimmet Yeri"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-1.5 block">Ad *</Label>
              <Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} placeholder="Örn. Toplantı Odası 2" />
            </div>
            <div>
              <Label className="mb-1.5 block">Açıklama</Label>
              <Textarea rows={2} value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
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
