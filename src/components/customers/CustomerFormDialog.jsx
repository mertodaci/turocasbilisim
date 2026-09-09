import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const PARTIES = ["AK PARTİ","CHP","MHP","İYİ PARTİ","DEM PARTİ","YRP","DEVA","SAADET","DP","DSP","TİP","TRP","BAĞIMSIZ"];

const empty = {
  company_name: "", customer_type: "", municipality_type: "", customer_detail: "",
  population: "", project_manager: "", deploy_responsible: "", city: "",
  status: "aktif", notes: "", use_job_tracking: false,
  district: "", party: "", top_manager: "", contact_title: "",
  current_firm: "", assigned_sales: "", address: "", is_potential: 0,
};

export default function CustomerFormDialog({ open, onClose, onSubmit, isLoading, customer }) {
  const [form, setForm] = useState(empty);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-active"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }, "full_name", 200),
    enabled: open,
  });
  const { data: customerTypeOptions = [] } = useQuery({ queryKey: ["definitions", "musteri_tipi"], queryFn: () => flowApi.entities.Definition.filter({ category: "musteri_tipi", is_active: true }) });
  const { data: municipalityTypeOptions = [] } = useQuery({ queryKey: ["definitions", "belediye_tipi"], queryFn: () => flowApi.entities.Definition.filter({ category: "belediye_tipi", is_active: true }) });
  const { data: customerDetailOptions = [] } = useQuery({ queryKey: ["definitions", "musteri_detayi"], queryFn: () => flowApi.entities.Definition.filter({ category: "musteri_detayi", is_active: true }) });
  const { data: populationOptions = [] } = useQuery({ queryKey: ["definitions", "nufus_araligi"], queryFn: () => flowApi.entities.Definition.filter({ category: "nufus_araligi", is_active: true }) });
  const { data: cityOptions = [] } = useQuery({ queryKey: ["definitions", "sehir"], queryFn: () => flowApi.entities.Definition.filter({ category: "sehir", is_active: true }) });

  useEffect(() => {
    if (customer) {
      setForm({ ...empty, ...customer, use_job_tracking: customer.use_job_tracking === 1 || customer.use_job_tracking === true });
    } else {
      setForm(empty);
    }
  }, [customer, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(form); };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? "Müşteriyi Düzenle" : "Yeni Müşteri"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">

          {/* Firma Bilgileri */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Firma Bilgileri</p>
            <div className="space-y-1.5">
              <Label>Firma Adı *</Label>
              <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} required placeholder="Firma adı" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Müşteri Tipi</Label>
                <Select value={form.customer_type} onValueChange={(v) => set("customer_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{customerTypeOptions.map((o) => <SelectItem key={o.id || o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Belediye Tipi</Label>
                <Select value={form.municipality_type} onValueChange={(v) => set("municipality_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{municipalityTypeOptions.map((o) => <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Müşteri Detayı</Label>
                <Select value={form.customer_detail} onValueChange={(v) => set("customer_detail", v)}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{customerDetailOptions.map((o) => <SelectItem key={o.id || o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Durum</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="pasif">Pasif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Konum */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Konum</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Şehir</Label>
                <Select value={form.city} onValueChange={(v) => set("city", v)}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{cityOptions.map((o) => <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>İlçe</Label>
                <Input value={form.district} onChange={(e) => set("district", e.target.value)} placeholder="İlçe adı" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Adres</Label>
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Mahalle, sokak, bina no..." />
            </div>
          </div>

          {/* Detaylar */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detaylar</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nüfus</Label>
                <Select value={form.population} onValueChange={(v) => set("population", v)}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{populationOptions.map((o) => <SelectItem key={o.id || o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Proje Yöneticisi</Label>
                <Select value={form.project_manager} onValueChange={(v) => set("project_manager", v)}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Deploy Sorumlusu</Label>
              <Select value={form.deploy_responsible} onValueChange={(v) => set("deploy_responsible", v)}>
                <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Satis Bilgileri */}
          <div className="pt-2 border-t border-border/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Satış Bilgileri</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Müşteri Tipi</Label>
                <Select value={String(form.is_potential ?? 0)} onValueChange={(v) => set("is_potential", parseInt(v, 10))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Müşteri</SelectItem>
                    <SelectItem value="1">Aday Müşteri</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Satış Sorumlusu</Label>
                <Select value={form.assigned_sales} onValueChange={(v) => set("assigned_sales", v)}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Parti</Label>
                <Input value={form.party} onChange={(e) => set("party", e.target.value)} placeholder="Parti" />
              </div>
              <div className="space-y-1.5">
                <Label>Mevcut Firma</Label>
                <Input value={form.current_firm} onChange={(e) => set("current_firm", e.target.value)} placeholder="Mevcut firma" />
              </div>
            </div>
          </div>
          {/* Notlar */}
          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Genel notlar..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Kaydediliyor..." : "Kaydet"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
