import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Plus, Pencil, Trash2, Rows3 } from "lucide-react";
import { toast } from "sonner";

const TIPLER = ["STANDART", "GÖZ", "ALAN", "ZİMMET RAFI"];
const empty = { depo_id: "", kod: "", ad: "", tip: "STANDART", kapasite: 0, aktif: 1 };

export default function StokRaflar() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);
  const [depoFiltre, setDepoFiltre] = useState("hepsi");
  const [q, setQ] = useState("");

  const { data: depolar = [] } = useQuery({
    queryKey: ["stok_depolar"],
    queryFn: () => flowApi.entities.StokDepo.list("ad", 2000),
  });
  const { data: raflar = [], isLoading } = useQuery({
    queryKey: ["stok_raflar"],
    queryFn: () => flowApi.entities.StokRaf.list("depo_adi", 5000),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["stok_raflar"] });
  const depoAdi = (id) => depolar.find((d) => d.id === id)?.ad || "";

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.StokRaf.create(data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Raf eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.StokRaf.update(id, data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Güncellendi"); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.StokRaf.delete(id),
    onSuccess: () => { invalidate(); toast.success("Silindi"); },
    onError: (e) => toast.error("Silinemedi: " + (e?.message || "hata")),
  });

  const openCreate = () => { setForm({ ...empty, depo_id: depoFiltre !== "hepsi" ? depoFiltre : "" }); setDialog({ open: true, item: null }); };
  const openEdit = (r) => {
    setForm({ depo_id: r.depo_id || "", kod: r.kod || "", ad: r.ad || "", tip: r.tip || "STANDART", kapasite: r.kapasite || 0, aktif: r.aktif ?? 1 });
    setDialog({ open: true, item: r });
  };

  const handleSubmit = () => {
    if (!form.depo_id) { toast.error("Depo seçin"); return; }
    if (!form.kod.trim() && !form.ad.trim()) { toast.error("Raf kodu veya adı girin"); return; }
    const data = { ...form, depo_adi: depoAdi(form.depo_id) };
    if (dialog.item) updateMutation.mutate({ id: dialog.item.id, data });
    else createMutation.mutate(data);
  };

  const filtered = raflar.filter((r) => {
    if (depoFiltre !== "hepsi" && r.depo_id !== depoFiltre) return false;
    if (q && !`${r.kod} ${r.ad} ${r.depo_adi}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Rows3 className="w-6 h-6 text-primary" /> Raf Tanımları
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Her depo için raf, göz, alan veya zimmet rafı tanımlayın. Her yeni depoya otomatik "GENEL RAF" açılır.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni Raf</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={depoFiltre} onValueChange={setDepoFiltre}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hepsi">Tüm Depolar</SelectItem>
            {depolar.map((d) => <SelectItem key={d.id} value={d.id}>{d.ad}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="max-w-xs" placeholder="Raf kodu / adı ara" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <Rows3 className="w-8 h-8 opacity-40" /><p>Raf yok.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Depo</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Raf Kodu</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Raf Adı</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tip</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Kapasite</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 text-muted-foreground">{r.depo_adi || depoAdi(r.depo_id)}</td>
                  <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">{r.kod || "—"}</span></td>
                  <td className="px-4 py-3 font-medium">{r.ad || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.tip}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.kapasite || 0}</td>
                  <td className="px-4 py-3">
                    <Switch checked={r.aktif === 1 || r.aktif === true}
                      onCheckedChange={(v) => updateMutation.mutate({ id: r.id, data: { aktif: v ? 1 : 0 } })} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Raf silinsin mi?")) deleteMutation.mutate(r.id); }}>
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
          <DialogHeader><DialogTitle>{dialog.item ? "Raf Düzenle" : "Yeni Raf"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-1.5 block">Depo *</Label>
              <SearchableSelect
                value={form.depo_id}
                onChange={(v) => setForm({ ...form, depo_id: v })}
                options={depolar.map((d) => ({ value: d.id, label: d.ad }))}
                placeholder="Depo seçin"
                fixDialogWheelScroll
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Raf Kodu</Label>
                <Input value={form.kod} onChange={(e) => setForm({ ...form, kod: e.target.value })} placeholder="A-01" />
              </div>
              <div>
                <Label className="mb-1.5 block">Tip</Label>
                <Select value={form.tip} onValueChange={(v) => setForm({ ...form, tip: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPLER.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Raf Adı</Label>
              <Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} placeholder="A Koridoru 1. Raf" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Kapasite</Label>
                <Input type="number" value={form.kapasite} onChange={(e) => setForm({ ...form, kapasite: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <Switch checked={form.aktif === 1} onCheckedChange={(v) => setForm({ ...form, aktif: v ? 1 : 0 })} />
                <Label>Aktif</Label>
              </div>
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
