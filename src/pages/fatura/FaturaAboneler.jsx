import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Users } from "lucide-react";
import { toast } from "sonner";

const empty = {
  abone_adi: "", abone_turu: "", tesisat_kullanim_yeri: "", sozlesme_no: "",
  adres: "", telefon: "", notlar: "", aktif: true,
};

export default function FaturaAboneler() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");

  const { data: aboneler = [], isLoading } = useQuery({
    queryKey: ["fatura-aboneler"],
    queryFn: () => flowApi.entities.FaturaAbone.list("abone_adi", 5000),
  });
  const { data: aboneTurleri = [] } = useQuery({
    queryKey: ["definitions", "abone_turu"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "abone_turu", is_active: true }),
  });
  const { data: kullanimYerleri = [] } = useQuery({
    queryKey: ["definitions", "tesisat_kullanim_yeri"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "tesisat_kullanim_yeri", is_active: true }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fatura-aboneler"] });

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.FaturaAbone.create({ ...data, aktif: data.aktif ? 1 : 0 }),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Abone eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.FaturaAbone.update(id, { ...data, aktif: data.aktif ? 1 : 0 }),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Güncellendi"); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });

  const filtered = aboneler.filter((a) => !q || `${a.abone_adi} ${a.sozlesme_no} ${a.tesisat_kullanim_yeri}`.toLowerCase().includes(q.toLowerCase()));

  const openCreate = () => { setForm(empty); setDialog({ open: true, item: null }); };
  const openEdit = (a) => {
    setForm({
      abone_adi: a.abone_adi || "", abone_turu: a.abone_turu || "", tesisat_kullanim_yeri: a.tesisat_kullanim_yeri || "",
      sozlesme_no: a.sozlesme_no || "", adres: a.adres || "", telefon: a.telefon || "", notlar: a.notlar || "",
      aktif: a.aktif == 1,
    });
    setDialog({ open: true, item: a });
  };
  const handleSubmit = () => {
    if (!form.abone_adi.trim()) { toast.error("Abone adı zorunlu"); return; }
    if (dialog.item) updateMutation.mutate({ id: dialog.item.id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Aboneler</h1>
          <p className="text-sm text-muted-foreground mt-1">Fatura girişlerinde seçilecek abone (tesisat) kayıtları.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni Abone</Button>
      </div>

      <Input className="max-w-xs" placeholder="Abone adı / sözleşme no / tesisat ara" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <Users className="w-8 h-8 opacity-40" /><p>Abone yok.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Abone Adı</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Abone Türü</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tesisat Kullanım Yeri</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Sözleşme/Mukavele No</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Telefon</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">
                    {a.abone_adi}
                    {a.aktif != 1 && <span className="ml-2 text-xs text-muted-foreground">(pasif)</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.abone_turu || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.tesisat_kullanim_yeri || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.sozlesme_no || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.telefon || "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Düzenle" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialog.open} onOpenChange={(v) => !v && setDialog({ open: false, item: null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{dialog.item ? "Aboneyi Düzenle" : "Yeni Abone"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label className="mb-1.5 block">Abone Adı *</Label>
              <Input value={form.abone_adi} onChange={(e) => setForm({ ...form, abone_adi: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Abone Türü</Label>
                <Select value={form.abone_turu || "none"} onValueChange={(v) => setForm({ ...form, abone_turu: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    {aboneTurleri.map((o) => <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Tesisat Kullanım Yeri</Label>
                <Select value={form.tesisat_kullanim_yeri || "none"} onValueChange={(v) => setForm({ ...form, tesisat_kullanim_yeri: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    {kullanimYerleri.map((o) => <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Sözleşme / Mukavele No</Label>
                <Input value={form.sozlesme_no} onChange={(e) => setForm({ ...form, sozlesme_no: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">Telefon</Label>
                <Input value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Adres</Label>
              <Textarea rows={2} value={form.adres} onChange={(e) => setForm({ ...form, adres: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Notlar</Label>
              <Textarea rows={2} value={form.notlar} onChange={(e) => setForm({ ...form, notlar: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.aktif} onCheckedChange={(v) => setForm({ ...form, aktif: v })} />
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
