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
import { Plus, Pencil, Building2, Link2 } from "lucide-react";
import { toast } from "sonner";

const empty = {
  company_name: "", contact_person: "", phone: "", gsm: "", email: "", website: "",
  working_region: "", payment_method: "CARİ", payment_term_days: 0,
  tax_office: "", tax_number: "", city: "", district: "", address: "", notes: "",
  status: "aktif", also_customer: false,
};

// Tedarikçiler = customers tablosu (is_supplier=1). Ayrı firma tablosu yok.
export default function StokTedarikciler() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkId, setLinkId] = useState("");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers-all"],
    queryFn: () => flowApi.entities.Customer.list("company_name", 5000),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["customers-all"] });

  const createMutation = useMutation({
    mutationFn: ({ also_customer, ...data }) =>
      flowApi.entities.Customer.create({ ...data, is_supplier: 1, is_customer: also_customer ? 1 : 0 }),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Tedarikçi eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.Customer.update(id, data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); setLinkOpen(false); toast.success("Güncellendi"); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });

  const tedarikciler = customers.filter((c) => c.is_supplier === 1 || c.is_supplier === true);
  const linklenebilir = customers.filter((c) => !(c.is_supplier === 1 || c.is_supplier === true));
  const filtered = tedarikciler.filter((c) => !q || `${c.company_name} ${c.contact_person} ${c.phone} ${c.tax_number} ${c.working_region}`.toLowerCase().includes(q.toLowerCase()));

  const openCreate = () => { setForm(empty); setDialog({ open: true, item: null }); };
  const openEdit = (c) => {
    setForm({
      company_name: c.company_name || "", contact_person: c.contact_person || "", phone: c.phone || "",
      gsm: c.gsm || "", email: c.email || "", website: c.website || "", working_region: c.working_region || "",
      payment_method: c.payment_method || "CARİ", payment_term_days: c.payment_term_days || 0,
      tax_office: c.tax_office || "", tax_number: c.tax_number || "", city: c.city || "", district: c.district || "",
      address: c.address || "", notes: c.notes || "", status: c.status || "aktif",
      also_customer: c.is_customer !== 0,
    });
    setDialog({ open: true, item: c });
  };
  const handleSubmit = () => {
    if (!form.company_name.trim()) { toast.error("Firma ünvanı zorunlu"); return; }
    const { also_customer, ...rest } = form;
    if (dialog.item) updateMutation.mutate({ id: dialog.item.id, data: { ...rest, is_customer: also_customer ? 1 : 0 } });
    else createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> Tedarikçiler
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Cari kartlar müşterilerle ortak tutulur; buradaki liste "tedarikçi" işaretli firmalardır. Bir firma hem müşteri hem tedarikçi olabilir.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setLinkId(""); setLinkOpen(true); }}>
            <Link2 className="w-4 h-4 mr-2" /> Mevcut Cariyi İşaretle
          </Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni Tedarikçi</Button>
        </div>
      </div>

      <Input className="max-w-xs" placeholder="Ünvan / yetkili / vergi no / bölge ara" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <Building2 className="w-8 h-8 opacity-40" /><p>Tedarikçi yok.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ünvan</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Yetkili</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Telefon</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ödeme / Vade</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Vergi No</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Bölge</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">
                    {c.company_name}
                    {c.status !== "aktif" && <span className="ml-2 text-xs text-muted-foreground">(pasif)</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.contact_person || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone || c.gsm || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{[c.payment_method, c.payment_term_days ? `${c.payment_term_days} gün` : null].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.tax_number || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.working_region || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Yeni / düzenle tedarikçi */}
      <Dialog open={dialog.open} onOpenChange={(v) => !v && setDialog({ open: false, item: null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{dialog.item ? "Tedarikçi Düzenle" : "Yeni Tedarikçi"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="mb-1.5 block">Firma Ünvanı *</Label>
                <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">Yetkili Kişi</Label>
                <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">Çalışılan Bölge</Label>
                <Input value={form.working_region} onChange={(e) => setForm({ ...form, working_region: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">Telefon</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">GSM / 2. Telefon</Label>
                <Input value={form.gsm} onChange={(e) => setForm({ ...form, gsm: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">E-posta</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">Web Sitesi</Label>
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
              </div>
              <div>
                <Label className="mb-1.5 block">Ödeme Şekli</Label>
                <Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">Vade (Gün)</Label>
                <Input type="number" value={form.payment_term_days} onChange={(e) => setForm({ ...form, payment_term_days: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="mb-1.5 block">Vergi Dairesi</Label>
                <Input value={form.tax_office} onChange={(e) => setForm({ ...form, tax_office: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">Vergi No / T.C.</Label>
                <Input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">İl</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">İlçe</Label>
                <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Adres</Label>
              <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Notlar</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.status === "aktif"} onCheckedChange={(v) => setForm({ ...form, status: v ? "aktif" : "pasif" })} />
              <Label>Aktif</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.also_customer} onCheckedChange={(v) => setForm({ ...form, also_customer: v })} />
              <div>
                <Label>Cari (müşteri) olarak da çalış</Label>
                <p className="text-xs text-muted-foreground">Kapalıysa firma yalnızca Tedarikçiler listesinde görünür, satış "Müşteriler" ekranına çıkmaz.</p>
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

      {/* Mevcut cariyi tedarikçi işaretle */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Mevcut Cariyi Tedarikçi İşaretle</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Kayıtlı bir müşteri firmasını tedarikçi olarak da işaretleyin.</p>
            <SearchableSelect
              value={linkId}
              onChange={setLinkId}
              options={linklenebilir.map((c) => ({ value: c.id, label: c.company_name || c.name || c.id }))}
              placeholder="Firma seçin"
            />
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setLinkOpen(false)}>İptal</Button>
              <Button disabled={!linkId || updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: linkId, data: { is_supplier: 1 } })}>
                İşaretle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
