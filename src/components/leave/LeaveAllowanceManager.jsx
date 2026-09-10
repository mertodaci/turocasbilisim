import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { AlertTriangle, Check, X, Pencil, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { calculateRemainingDays, LEAVE_MILESTONE_YEAR } from "@/lib/leaveCalc";
const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
};
export default function LeaveAllowanceManager() {
  const queryClient = useQueryClient();
  // editingId: hangi calisan, editField: 'carryover' | 'used_before'
  const [editingId, setEditingId] = useState(null);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees-active"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });
  // Onaylı izin talepleri (kullanılan günleri hesaplamak için)
  const { data: approvedLeaves = [] } = useQuery({
    queryKey: ["leaves-approved"],
    queryFn: () => flowApi.entities.LeaveRequest.filter({ status: "onaylandi" }),
  });
  // Izin turleri (hangi tur yillik haktan duser)
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => flowApi.entities.LeaveType.filter({ is_active: true }),
  });
  // Slug esitleyici (LeaveApprovalDialog ile ayni mantik)
  const slug = (x) => (x || "").toString().toLowerCase()
    .replace(/\u00e7/g, "c").replace(/\u011f/g, "g").replace(/\u0131/g, "i")
    .replace(/\u00f6/g, "o").replace(/\u015f/g, "s").replace(/\u00fc/g, "u")
    .replace(/\s+/g, "_");
  // Sadece entitlement_type==="yillik" olan izinler yillik haktan duser
  const deductsForType = (typeName) => {
    const mt = leaveTypes.find((t) => slug(t.name) === slug(typeName) || t.name === typeName);
    return mt?.entitlement_type === "yillik";
  };
  // Devir (carryover) + Önceden Kullanılan (used_before) güncelleme
  const fieldMutation = useMutation({
    mutationFn: ({ id, field, value }) =>
      flowApi.entities.Employee.update(id, { [field]: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees-active"] });
      setEditingId(null);
      setEditField(null);
      toast.success("Bakiye güncellendi");
    },
    onError: (err) => toast.error(err?.message || "Güncellenemedi"),
  });
  // Bir çalışanın kullandığı toplam onaylı izin günü (Turkonix içi)
  const usedDaysFor = (empId, empEmail) => {
    return approvedLeaves
      .filter((l) => l.employee_id === empId || (empEmail && l.employee_email === empEmail))
      .filter((l) => deductsForType(l.leave_type))
      .reduce((sum, l) => sum + (Number(l.day_count) || 0), 0);
  };
  const startEdit = (emp, field) => {
    setEditingId(emp.id);
    setEditField(field);
    const cur = field === "used_before" ? emp.leave_used_before : emp.leave_carryover;
    setEditValue(String(cur || 0));
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditField(null);
  };
  const saveEdit = (emp) => {
    const val = Number(editValue);
    if (isNaN(val) || val < 0) {
      toast.error("Geçerli bir gün sayısı girin");
      return;
    }
    const column = editField === "used_before" ? "leave_used_before" : "leave_carryover";
    fieldMutation.mutate({ id: emp.id, field: column, value: val });
  };
  // İsme göre sırala
  const sorted = [...employees].sort((a, b) =>
    (a.full_name || "").localeCompare(b.full_name || "", "tr")
  );
  // Düzenlenebilir sayı hücresi render fonksiyonu (Devir ve Önceden Kullanılan ortak)
  const renderEditableCell = (emp, field, value) => {
    const isEditing = editingId === emp.id && editField === field;
    if (isEditing) {
      return (
        <div className="flex items-center justify-center gap-1">
          <Input
            type="number"
            step="0.5"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-7 w-20 text-center"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600"
            onClick={() => saveEdit(emp)}>
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7"
            onClick={cancelEdit}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      );
    }
    return (
      <button
        onClick={() => startEdit(emp, field)}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted transition-colors"
        title="Düzenle"
      >
        <span className="font-medium">{value || 0}</span>
        <Pencil className="w-3 h-3 text-muted-foreground" />
      </button>
    );
  };
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          İzin hakları <strong>işe başlama tarihinden</strong> otomatik hesaplanır. Çalışma yıldönümünde hak doğar;
          kıdeme göre 1–5 yıl <strong>14</strong>, 5–15 yıl <strong>20</strong>, 15+ yıl <strong>26</strong> gün.
          {" "}{LEAVE_MILESTONE_YEAR} öncesi dönem <strong>Devir</strong> sütununa,
          eski sistemde kullanılmış izinler <strong>Önceden Kullanılan</strong> sütununa elle girilir.
        </p>
      </div>
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Çalışan</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">İşe Başlama</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Devir ({LEAVE_MILESTONE_YEAR} öncesi)</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Hak Edilen</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Önceden Kullanılan</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Kullanılan</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Kalan</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Yükleniyor...</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Aktif çalışan yok.</td></tr>
              ) : (
                sorted.map((emp) => {
                  const used = usedDaysFor(emp.id, emp.email);
                  const usedBefore = Number(emp.leave_used_before) || 0;
                  const calc = calculateRemainingDays(emp.hire_date, emp.leave_carryover || 0, used + usedBefore);
                  const noHire = !calc.hasHireDate;
                  return (
                    <tr key={emp.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{emp.full_name || emp.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {noHire ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5" /> Tarih girilmeli
                          </span>
                        ) : (
                          fmtDate(emp.hire_date)
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {renderEditableCell(emp, "leave_carryover", emp.leave_carryover)}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">
                        {noHire ? "—" : calc.entitled}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {renderEditableCell(emp, "used_before", emp.leave_used_before)}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{used}</td>
                      <td className="px-4 py-3 text-center">
                        {noHire ? (
                          "—"
                        ) : (
                          <span className={`font-bold ${calc.remaining < 0 ? "text-red-600" : "text-green-600"}`}>
                            {calc.remaining}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
