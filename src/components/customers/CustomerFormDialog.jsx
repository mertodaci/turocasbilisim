import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import isEqual from "lodash/isEqual";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { sortTr } from "@/lib/sortTr";

const empty = {
  company_name: "", customer_type: "", city: "",
  status: "aktif", notes: "", use_job_tracking: false,
  district: "", top_manager: "", address: "",
};

export default function CustomerFormDialog({ open, onClose, onSubmit, isLoading, customer, embedded = false }) {
  const [form, setForm] = useState(empty);
  const [formBaseline, setFormBaseline] = useState(empty);

  const { data: customerTypeOptions = [] } = useQuery({ queryKey: ["definitions", "musteri_tipi"], queryFn: () => flowApi.entities.Definition.filter({ category: "musteri_tipi", is_active: true }), select: (d) => sortTr(d, "label") });
  const { data: cityOptions = [] } = useQuery({ queryKey: ["definitions", "sehir"], queryFn: () => flowApi.entities.Definition.filter({ category: "sehir", is_active: true }), select: (d) => sortTr(d, "label") });

  useEffect(() => {
    if (customer) {
      const next = { ...empty, ...customer, use_job_tracking: customer.use_job_tracking === 1 || customer.use_job_tracking === true };
      setForm(next);
      setFormBaseline(next);
    } else {
      setForm(empty);
      setFormBaseline(empty);
    }
  }, [customer, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(form); };
  const isDirty = !isEqual(form, formBaseline);

  const formBody = (
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

          {/* Notlar */}
          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Genel notlar..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            {!embedded && <Button type="button" variant="outline" onClick={onClose}>İptal</Button>}
            <Button type="submit" disabled={isLoading || !isDirty}>{isLoading ? "Kaydediliyor..." : "Kaydet"}</Button>
          </div>
        </form>
  );

  if (embedded) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold">Müşteriyi Düzenle</h2>
          <p className="text-sm text-muted-foreground mt-1">Bilgileri güncelleyin.</p>
        </div>
        {formBody}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? "Müşteriyi Düzenle" : "Yeni Müşteri"}</DialogTitle>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}
