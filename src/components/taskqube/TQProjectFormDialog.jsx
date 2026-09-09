import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function TQProjectFormDialog({ project, customers, employees, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    customer_id: project?.customer_id || "",
    customer_name: project?.customer_name || "",
    name: project?.name || "",
    description: project?.description || "",
    status: project?.status || "planlama",
    priority: project?.priority || "orta",
    start_date: project?.start_date || "",
    end_date: project?.end_date || "",
    manager_id: project?.manager_id || "",
    manager_name: project?.manager_name || "",
    is_active: project?.is_active !== undefined ? (project.is_active == 1 || project.is_active === true ? 1 : 0) : 1,
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.TQProject.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tq-projects"] });
      toast.success("Proje olusturuldu");
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.TQProject.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tq-projects"] });
      toast.success("Proje guncellendi");
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (project) {
      updateMutation.mutate({ id: project.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{project ? "Proje Duzenle" : "Yeni Proje Olustur"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Proje Adi</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ERP Entegrasyonu"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Aciklama</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[80px]"
              placeholder="Proje detaylari..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Musteri</Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => {
                  const customer = customers.find((c) => c.id === value);
                  setFormData({ ...formData, customer_id: value, customer_name: customer?.company_name || "" });
                }}
                required
              >
                <SelectTrigger><SelectValue placeholder="Musteri sec" /></SelectTrigger>
                <SelectContent>
                  {customers.filter(c => c.use_taskqube == 1 || c.use_taskqube === true).map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>{customer.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Proje Yoneticisi</Label>
              <Select
                value={formData.manager_id}
                onValueChange={(value) => {
                  const emp = employees.find((e) => e.id === value);
                  setFormData({ ...formData, manager_id: value, manager_name: emp?.full_name || "" });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Kisi sec" /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Durum</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planlama">Planlama</SelectItem>
                  <SelectItem value="devam_ediyor">Devam Ediyor</SelectItem>
                  <SelectItem value="beklemede">Beklemede</SelectItem>
                  <SelectItem value="tamamlandi">Tamamlandi</SelectItem>
                  <SelectItem value="iptal">Iptal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Oncelik</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dusuk">Dusuk</SelectItem>
                  <SelectItem value="orta">Orta</SelectItem>
                  <SelectItem value="yuksek">Yuksek</SelectItem>
                  <SelectItem value="kritik">Kritik</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Baslangic Tarihi</Label>
              <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Bitis Tarihi</Label>
              <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
            </div>
          </div>

          {/* Aktif/Pasif Switch */}
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Proje Durumu</Label>
              <p className="text-xs text-muted-foreground">Proje aktif mi pasif mi?</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{formData.is_active ? "Aktif" : "Pasif"}</span>
              <Switch
                checked={!!formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v ? 1 : 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Iptal</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
