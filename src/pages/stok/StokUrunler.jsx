import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Plus, Pencil, Trash2, Package, X } from "lucide-react";
import { toast } from "sonner";

const emptyForm = {
  kod: "", ad: "", barkod: "", grup_id: "", uretici_kodu: "", uretici: "", urun_tipi: "tuketim",
  marka: "", model: "", ana_birim: "ADET", kdv: 20, alis_fiyati: 0, satis_fiyati: 0,
  varsayilan_raf_omru_ay: 0, skt_uyari_gun: 30,
  gorsel_url: "", aktif: 1, notlar: "",
};

export default function StokUrunler() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState("genel");
  const [q, setQ] = useState("");
  const [barkodInput, setBarkodInput] = useState("");

  const { data: urunler = [], isLoading } = useQuery({
    queryKey: ["stok_urunler"],
    queryFn: () => flowApi.entities.StokUrun.list("-created_date", 5000),
  });
  const { data: gruplar = [] } = useQuery({
    queryKey: ["stok_gruplar"],
    queryFn: () => flowApi.entities.StokUrunGrup.list("ad", 1000),
  });

  const editingId = dialog.item?.id;
  const { data: barkodlar = [] } = useQuery({
    queryKey: ["stok_urun_barkodlari", editingId],
    queryFn: () => flowApi.entities.StokUrunBarkod.filter({ urun_id: editingId }),
    enabled: !!editingId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["stok_urunler"] });
  const invalidateSub = () => {
    queryClient.invalidateQueries({ queryKey: ["stok_urun_barkodlari", editingId] });
  };
  const grupAdi = (id) => gruplar.find((g) => g.id === id)?.ad || "";

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.StokUrun.create(data),
    onSuccess: (row) => { invalidate(); setDialog({ open: true, item: row }); toast.success("Ürün kaydedildi — çoklu birim / barkod ekleyebilirsiniz"); },
    onError: (e) => toast.error("Kaydedilemedi: " + (e?.message || "hata")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.StokUrun.update(id, data),
    onSuccess: () => { invalidate(); toast.success("Güncellendi"); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.StokUrun.delete(id),
    onSuccess: () => { invalidate(); toast.success("Ürün silindi"); },
    onError: (e) => toast.error("Silinemedi: " + (e?.message || "hata")),
  });

  const addBarkod = useMutation({
    mutationFn: (barkod) => flowApi.entities.StokUrunBarkod.create({ urun_id: editingId, barkod }),
    onSuccess: () => { invalidateSub(); setBarkodInput(""); },
    onError: (e) => toast.error("Barkod eklenemedi: " + (e?.message || "hata")),
  });
  const delBarkod = useMutation({
    mutationFn: (id) => flowApi.entities.StokUrunBarkod.delete(id),
    onSuccess: invalidateSub,
  });

  useEffect(() => {
    if (!dialog.open) { setForm(emptyForm); setTab("genel"); return; }
    if (dialog.item) {
      const it = dialog.item;
      setForm({
        kod: it.kod || "", ad: it.ad || "", barkod: it.barkod || "", grup_id: it.grup_id || "",
        uretici_kodu: it.uretici_kodu || "", uretici: it.uretici || "", urun_tipi: it.urun_tipi === "demirbas" ? "demirbas" : "tuketim",
        marka: it.marka || "", model: it.model || "", ana_birim: it.ana_birim || "ADET",
        kdv: it.kdv ?? 20, alis_fiyati: it.alis_fiyati ?? 0, satis_fiyati: it.satis_fiyati ?? 0,
        varsayilan_raf_omru_ay: it.varsayilan_raf_omru_ay ?? 0, skt_uyari_gun: it.skt_uyari_gun ?? 30,
        gorsel_url: it.gorsel_url || "", aktif: it.aktif ?? 1, notlar: it.notlar || "",
      });
    }
  }, [dialog.open, dialog.item]);

  const openCreate = () => setDialog({ open: true, item: null });
  const openEdit = (u) => setDialog({ open: true, item: u });
  const closeDialog = () => setDialog({ open: false, item: null });

  const handleSave = () => {
    if (!form.ad.trim()) { toast.error("Ürün adı zorunlu"); return; }
    // Demirbaş seçilince sicil no takibi (mevcut seri_no_takip mekanizması) otomatik açılır —
    // ayrı bir "Seri No Takibi" seçeneği kullanıcıya gösterilmiyor.
    const data = { ...form, grup_adi: grupAdi(form.grup_id), seri_no_takip: form.urun_tipi === "demirbas" ? 1 : 0 };
    if (dialog.item) updateMutation.mutate({ id: dialog.item.id, data });
    else createMutation.mutate(data);
  };

  const filtered = urunler.filter((u) => {
    if (u.is_deleted === 1) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return `${u.kod} ${u.ad} ${u.barkod} ${u.marka} ${u.grup_adi}`.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Malzeme Tanımı
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Ürün, barkod, birim, fiyat ve raf ömrü bilgileri.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni Ürün</Button>
      </div>

      <Input className="max-w-md" placeholder="Ürün adı / kod / barkod / marka ara" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <Package className="w-8 h-8 opacity-40" /><p>Ürün yok.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ürün Kodu</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ürün Adı</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Barkod</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Grup</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Birim</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((u, i) => (
                <tr key={u.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 text-muted-foreground">{u.kod || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{u.ad}</p>
                      {u.urun_tipi === "demirbas" && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">Demirbaş</span>}
                    </div>
                    {(u.marka || u.model) && <p className="text-xs text-muted-foreground">{[u.marka, u.model].filter(Boolean).join(" ")}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.barkod || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.grup_adi || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.ana_birim || "ADET"}</td>
                  <td className="px-4 py-3">
                    <Switch checked={u.aktif === 1 || u.aktif === true}
                      onCheckedChange={(v) => updateMutation.mutate({ id: u.id, data: { aktif: v ? 1 : 0 } })} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Ürün silinsin mi?")) deleteMutation.mutate(u.id); }}>
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

      <Dialog open={dialog.open} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{dialog.item ? "Ürün Kartı" : "Yeni Ürün"}</DialogTitle></DialogHeader>
          <Tabs value={tab} onValueChange={setTab} className="pt-1">
            <TabsList>
              <TabsTrigger value="genel">Genel Bilgiler</TabsTrigger>
              <TabsTrigger value="barkod" disabled={!editingId}>Barkodlar</TabsTrigger>
            </TabsList>

            <TabsContent value="genel" className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="mb-1.5 block">Ürün Kodu</Label>
                  <Input value={form.kod} onChange={(e) => setForm({ ...form, kod: e.target.value })} placeholder="Boşsa otomatik" />
                </div>
                <div className="col-span-2">
                  <Label className="mb-1.5 block">Ürün Adı *</Label>
                  <Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Barkod</Label>
                  <Input value={form.barkod} onChange={(e) => setForm({ ...form, barkod: e.target.value })} placeholder="Ana barkod" />
                </div>
                <div className="col-span-2">
                  <Label className="mb-1.5 block">Ürün Grubu</Label>
                  <SearchableSelect value={form.grup_id} onChange={(v) => setForm({ ...form, grup_id: v })}
                    options={[{ value: "", label: "— Yok" }, ...gruplar.map((g) => ({ value: g.id, label: g.ad }))]}
                    placeholder="Grup seçin" fixDialogWheelScroll />
                </div>
                <div>
                  <Label className="mb-1.5 block">Üretici Kodu</Label>
                  <Input value={form.uretici_kodu} onChange={(e) => setForm({ ...form, uretici_kodu: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Üretici</Label>
                  <Input value={form.uretici} onChange={(e) => setForm({ ...form, uretici: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Malzeme Tipi *</Label>
                  <Select value={form.urun_tipi} onValueChange={(v) => setForm({ ...form, urun_tipi: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tuketim">Tüketim Malzemesi</SelectItem>
                      <SelectItem value="demirbas">Demirbaş</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Marka</Label>
                  <Input value={form.marka} onChange={(e) => setForm({ ...form, marka: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Model</Label>
                  <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Ana Birim</Label>
                  <Input value={form.ana_birim} onChange={(e) => setForm({ ...form, ana_birim: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1.5 block">KDV %</Label>
                  <Input type="number" value={form.kdv} onChange={(e) => setForm({ ...form, kdv: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Alış Fiyatı</Label>
                  <Input type="number" value={form.alis_fiyati} onChange={(e) => setForm({ ...form, alis_fiyati: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Satış Fiyatı</Label>
                  <Input type="number" value={form.satis_fiyati} onChange={(e) => setForm({ ...form, satis_fiyati: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-3 -mt-2">
                  <p className="text-xs text-muted-foreground">Bu alanlar sadece varsayılan/referans fiyattır — her fişte gerçek işlem fiyatı ayrıca girilir ve değiştirilebilir, tedarikçi bazlı fiyat geçmişi ayrıca tutulur.</p>
                </div>
                <div>
                  <Label className="mb-1.5 block">Varsayılan Raf Ömrü (Ay)</Label>
                  <Input type="number" value={form.varsayilan_raf_omru_ay} onChange={(e) => setForm({ ...form, varsayilan_raf_omru_ay: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label className="mb-1.5 block">SKT Uyarı Süresi (Gün)</Label>
                  <Input type="number" value={form.skt_uyari_gun} onChange={(e) => setForm({ ...form, skt_uyari_gun: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              {form.urun_tipi === "demirbas" && (
                <p className="text-xs text-muted-foreground -mt-2">Demirbaş malzemeler tekil olarak sicil no ile takip edilir — her fiş satırı 1 adet olur, sicil no elle girilebilir, barkod okutulabilir ya da otomatik üretilebilir. Sadece Zimmet ekranından kişi/yere zimmetlenebilir, Çıkış fişine eklenemez.</p>
              )}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.aktif === 1} onCheckedChange={(v) => setForm({ ...form, aktif: v ? 1 : 0 })} />
                  <Label>Aktif</Label>
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">Notlar</Label>
                <Textarea rows={2} value={form.notlar} onChange={(e) => setForm({ ...form, notlar: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={closeDialog}>Kapat</Button>
                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="barkod" className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Barkod okut / yaz" value={barkodInput} onChange={(e) => setBarkodInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && barkodInput.trim()) addBarkod.mutate(barkodInput.trim()); }} />
                <Button onClick={() => { if (barkodInput.trim()) addBarkod.mutate(barkodInput.trim()); }}>Ekle</Button>
              </div>
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-muted/40"><tr><th className="text-left px-3 py-2">Barkod</th><th className="px-3 py-2"></th></tr></thead>
                <tbody>
                  {barkodlar.length === 0 ? (
                    <tr><td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">Ek barkod yok.</td></tr>
                  ) : barkodlar.map((b) => (
                    <tr key={b.id} className="border-t">
                      <td className="px-3 py-2 font-mono">{b.barkod}</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => delBarkod.mutate(b.id)}><X className="w-3.5 h-3.5" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
