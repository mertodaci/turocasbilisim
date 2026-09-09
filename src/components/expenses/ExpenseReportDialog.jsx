import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";

const empty = {
  employee_name: "",
  employee_email: "",
  project_name: "",
  trip_start_date: "",
  trip_end_date: "",
  advance_amount: "",
  department_manager: "",
  status: "yonetici_onayi_bekliyor",
};

export default function ExpenseReportDialog({ open, onOpenChange, report, onSuccess }) {
  const { user } = useAuth();
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => flowApi.entities.Customer.list("-created_date", 200),
  });
  const { data: employeeRecord } = useQuery({
    queryKey: ["my-employee-expense", user?.email],
    queryFn: () => flowApi.entities.Employee.filter({ email: user.email }),
    enabled: !!user?.email,
    select: (d) => d[0],
  });
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (report) {
      setForm({
        employee_name: report.employee_name || "",
        employee_email: report.employee_email || "",
        project_name: report.project_name || "",
        trip_start_date: report.trip_start_date || "",
        trip_end_date: report.trip_end_date || "",
        advance_amount: report.advance_amount ?? "",
        department_manager: report.department_manager || "",
        status: report.status || "taslak",
      });
    } else {
      setForm({ ...empty, employee_name: user?.full_name || "", employee_email: user?.email || "", department_manager: employeeRecord?.manager_name || "" });
    }
  }, [report, open, user]);

  const saveMutation = useMutation({
    mutationFn: (data) =>
      report
        ? flowApi.entities.ExpenseReport.update(report.id, data)
        : flowApi.entities.ExpenseReport.create(data),
    onSuccess: () => {
      onSuccess?.();
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      ...form,
      advance_amount: parseFloat(form.advance_amount) || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{report ? "Raporu Düzenle" : "Yeni Masraf Raporu"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label className="mb-1.5 block">Ad Soyad *</Label>
            <Input value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} required />
          </div>
          <div>
            <Label className="mb-1.5 block">Proje / Müşteri (Yapılacak İş)</Label>
            <Select value={form.project_name} onValueChange={(v) => setForm({ ...form, project_name: v })}>
              <SelectTrigger><SelectValue placeholder="Müşteri seçin" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.company_name}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Gidiş (Ay/Yıl)</Label>
              <Input type="month" value={form.trip_start_date} onChange={(e) => setForm({ ...form, trip_start_date: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Dönüş (Ay/Yıl)</Label>
              <Input type="month" value={form.trip_end_date} onChange={(e) => setForm({ ...form, trip_end_date: e.target.value })} />
            </div>
          </div>
          <div>
              <Label className="mb-1.5 block">Alınan Avans (₺)</Label>
              <Input type="number" step="0.01" value={form.advance_amount} onChange={(e) => setForm({ ...form, advance_amount: e.target.value })} placeholder="0,00" />
          </div>
          <div>
            <Label className="mb-1.5 block">Yönetici</Label>
            <Input value={form.department_manager} readOnly className="bg-muted text-muted-foreground" placeholder="Otomatik dolar" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Kaydediliyor..." : report ? "Güncelle" : "Oluştur"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}