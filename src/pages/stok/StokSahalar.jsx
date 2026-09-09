import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

const empty = { kod: "", ad: "", adres: "", yetkili: "", telefon: "", customer_id: "", aktif: 1, notlar: "" };

export default function StokSahalar() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");

  const { data: sahalar = [], isLoading } = useQuery({
    queryKey: ["stok_sahalar"],
    queryFn: () => flowApi.entities.StokSaha.list("ad", 3000),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-min"],
    queryFn: () => flowApi.entities.Customer.list("company_name", 3000),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["stok_sahalar"] });
  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.StokSaha.create(data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Saha eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.StokSaha.update(id, data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Güncellendi"); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.StokSaha.delete(id),
    onSuccess: () => { invalidate(); toast.success("Silindi"); },
    onError: (e) => toast.error("Silinemedi: " + (e?.message || "hata")),
  });

  const openCreate = () => { setForm(empty); setDialog({ open: true, item: null }); };
  const openEdit = (s) => {
    setForm({ kod: s.kod || "", ad: s.ad || "", adres: s.adres || "", yetkili: s.yetkili || "", telefon: s.telefon || "", customer_id: s.customer_id || "", aktif: s.aktif ?? 1, notlar: s.notlar || "" });
    setDialog({ open: true, item: s });
  };
  const handleSubmit = () => {
    if (!form.ad.trim()) { toast.error("Saha adı zorunlu"); return; }
    if (dialog.item) updateMutation.mutate({ id: dialog.item.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = sahalar.filter((s) => !q || `${s.kod} ${s.ad} ${s.yetkili} ${s.telefon}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" /> Sahalar / Projeler
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Şantiye, proje ve müşteri teslim noktaları. Stok tutmaz; stok çıkışının hedefi olur (malzeme burada tüketilmiş sayılır) ve zimmet görev yeri olarak kullanılır.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni Saha</Button>
      </div>

      <Input className="max-w-xs" placeholder="Kod / ad / yetkili ara" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <MapPin className="w-8 h-8 opacity-40" /><p>Kayıt yok.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Kod</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Saha / Proje</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Yetkili</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Telefon</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 text-muted-foreground">{s.kod || "—"}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.ad}</p>
                    {s.adres && <p className="text-xs text-muted-foreground truncate max-w-xs">{s.adres}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.yetkili || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.telefon || "—"}</td>
                  <td className="px-4 py-3">
                    <Switch checked={s.aktif === 1 || s.aktif === true}
                      onCheckedChange={(v) => updateMutation.mutate({ id: s.id, data: { aktif: v ? 1 : 0 } })} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Saha silinsin mi?")) deleteMutation.mutate(s.id); }}>
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
          <DialogHeader><DialogTitle>{dialog.item ? "Saha Düzenle" : "Yeni Saha / Proje"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="mb-1.5 block">Kod</Label>
                <Input value={form.kod} onChange={(e) => setForm({ ...form, kod: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="mb-1.5 block">Saha / Proje Adı *</Label>
                <Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Adres</Label>
              <Textarea rows={2} value={form.adres} onChange={(e) => setForm({ ...form, adres: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Yetkili</Label>
                <Input value={form.yetkili} onChange={(e) => setForm({ ...form, yetkili: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">Telefon</Label>
                <Input value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Bağlı Müşteri (opsiyonel)</Label>
              <SearchableSelect
                value={form.customer_id}
                onChange={(v) => setForm({ ...form, customer_id: v })}
                options={[{ value: "", label: "— Yok" }, ...customers.map((c) => ({ value: c.id, label: c.company_name || c.name || c.id }))]}
                placeholder="Müşteri seçin"
                fixDialogWheelScroll
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Notlar</Label>
              <Textarea rows={2} value={form.notlar} onChange={(e) => setForm({ ...form, notlar: e.target.value })} />
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
