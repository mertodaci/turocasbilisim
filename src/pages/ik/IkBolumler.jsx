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
import { Plus, Pencil, Trash2, Building2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const empty = { ad: "", sube_id: "", hedef_personel_sayisi: 0, aciklama: "", aktif: 1 };

export default function IkBolumler() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");

  const { data: bolumler = [], isLoading } = useQuery({
    queryKey: ["ik_bolumler"],
    queryFn: () => flowApi.entities.IkBolum.list("ad", 3000),
  });
  const { data: subeler = [] } = useQuery({
    queryKey: ["ik_subeler_min"],
    queryFn: () => flowApi.entities.IkSube.list("ad", 2000),
  });
  const { data: personeller = [] } = useQuery({
    queryKey: ["ik_personel_min"],
    queryFn: () => flowApi.entities.Employee.list("full_name", 5000),
  });

  const sayimByBolum = personeller.reduce((m, p) => {
    if (p.bolum_id) m[p.bolum_id] = (m[p.bolum_id] || 0) + 1;
    return m;
  }, {});
  const subeAdi = (id) => subeler.find((s) => s.id === id)?.ad || "";

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ik_bolumler"] });
  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.IkBolum.create(data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Bölüm eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.IkBolum.update(id, data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Güncellendi"); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.IkBolum.delete(id),
    onSuccess: () => { invalidate(); toast.success("Silindi"); },
    onError: (e) => toast.error("Silinemedi: " + (e?.message || "hata")),
  });

  const openCreate = () => { setForm(empty); setDialog({ open: true, item: null }); };
  const openEdit = (b) => {
    setForm({
      ad: b.ad || "", sube_id: b.sube_id || "", hedef_personel_sayisi: b.hedef_personel_sayisi ?? 0,
      aciklama: b.aciklama || "", aktif: b.aktif ?? 1,
    });
    setDialog({ open: true, item: b });
  };
  const handleSubmit = () => {
    if (!form.ad.trim()) { toast.error("Bölüm adı zorunlu"); return; }
    const data = {
      ...form,
      sube_adi: subeAdi(form.sube_id) || null,
      hedef_personel_sayisi: Number(form.hedef_personel_sayisi) || 0,
    };
    if (dialog.item) updateMutation.mutate({ id: dialog.item.id, data });
    else createMutation.mutate(data);
  };

  const filtered = bolumler.filter((b) => !q || `${b.ad} ${subeAdi(b.sube_id)}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> Bölümler
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Lokasyon bazlı bölüm/görev grupları. Hedef personel sayısı altına düşülünce "eleman ihtiyacı" uyarısı gösterilir.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni Bölüm</Button>
      </div>

      <Input className="max-w-xs" placeholder="Bölüm / şube ara" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <Building2 className="w-8 h-8 opacity-40" /><p>Bölüm yok.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Bölüm</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Şube</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Mevcut / Hedef</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => {
                const mevcut = sayimByBolum[b.id] || 0;
                const eksik = b.hedef_personel_sayisi > 0 && mevcut < b.hedef_personel_sayisi;
                return (
                  <tr key={b.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{b.ad}</p>
                      {b.aciklama && <p className="text-xs text-muted-foreground truncate max-w-xs">{b.aciklama}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{subeAdi(b.sube_id) || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={eksik ? "text-amber-600 font-semibold" : ""}>{mevcut}</span>
                      <span className="text-muted-foreground"> / {b.hedef_personel_sayisi || 0}</span>
                      {eksik && <AlertTriangle className="inline w-3.5 h-3.5 text-amber-500 ml-1" />}
                    </td>
                    <td className="px-4 py-3">
                      <Switch checked={b.aktif === 1 || b.aktif === true}
                        onCheckedChange={(v) => updateMutation.mutate({ id: b.id, data: { aktif: v ? 1 : 0 } })} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm("Bölüm silinsin mi?")) deleteMutation.mutate(b.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialog.open} onOpenChange={(v) => !v && setDialog({ open: false, item: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{dialog.item ? "Bölüm Düzenle" : "Yeni Bölüm"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-1.5 block">Bölüm Adı *</Label>
              <Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Şube / Lokasyon</Label>
              <SearchableSelect
                value={form.sube_id}
                onChange={(v) => setForm({ ...form, sube_id: v })}
                options={[{ value: "", label: "— Genel" }, ...subeler.map((s) => ({ value: s.id, label: s.ad }))]}
                placeholder="Şube seçin"
                fixDialogWheelScroll
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Hedef Personel Sayısı</Label>
              <Input type="number" value={form.hedef_personel_sayisi} onChange={(e) => setForm({ ...form, hedef_personel_sayisi: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Açıklama</Label>
              <Textarea rows={2} value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} />
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
