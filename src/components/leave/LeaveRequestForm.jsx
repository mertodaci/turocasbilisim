import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { countBusinessDays, nextBusinessDay, previousBusinessDay, toISODate, isAnnualLeaveType } from "@/lib/leaveCalc";
import { useLeaveBalance } from "@/hooks/useLeaveBalance";



export default function LeaveRequestForm({ onClose, onSuccess, leave }) {
  const { user } = useAuth();
  const isEditing = !!leave;
  const isHR = user?.role === "ik" || user?.role === "admin";
  const [targetEmployeeId, setTargetEmployeeId] = useState(leave?.employee_id || "");
  const [form, setForm] = useState({
    leave_type: leave?.leave_type || "",
    start_date: leave?.start_date || "",
    end_date: leave?.end_date || "",
    reason: leave?.reason || "",
    half_day_period: leave?.half_day_period || "",
  });
  const [returnDate, setReturnDate] = useState(() =>
    leave?.end_date ? toISODate(nextBusinessDay(leave.end_date)) : ""
  );

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => flowApi.entities.LeaveType.filter({ is_active: true }),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["definitions", "departman"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "departman" }),
    enabled: isHR,
  });
  const deptLabel = (v) => departments.find((d) => d.value === v)?.label || (v || "");
  const { data: allEmployees = [] } = useQuery({
    queryKey: ["employees-active-for-leave"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
    enabled: isHR,
    select: (d) => [...d].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "tr")),
  });

  const { data: employeeRecord } = useQuery({
    queryKey: ["employee-by-email", user?.email],
    queryFn: () => flowApi.entities.Employee.filter({ email: user.email }),
    enabled: !!user?.email,
    select: (data) => data[0],
  });

  const selectedEmp = isHR && targetEmployeeId ? allEmployees.find((e) => e.id === targetEmployeeId) : null;
  const targetEmployee = selectedEmp || employeeRecord;

  const { remaining: leaveBalance, hasHireDate } = useLeaveBalance(targetEmployee);

  const isSingleDay = !!form.start_date && form.start_date === form.end_date;
  const isHalfDay = isSingleDay && !!form.half_day_period;
  // Dogum ve Babalik izinleri takvim gunu uzerinden hesaplanir
  // (min/max degerleri takvim gunu olarak tanimli: 56 ve 10).
  const CALENDAR_DAY_TYPES = ["Doğum İzni", "Babalık İzni"];
  const isCalendarDayType = CALENDAR_DAY_TYPES.includes(form.leave_type);
  const rawDayCount = form.start_date && form.end_date
    ? isCalendarDayType
      ? Math.max(
          0,
          Math.round(
            (new Date(form.end_date) - new Date(form.start_date)) / 86400000
          ) + 1
        )
      : countBusinessDays(form.start_date, form.end_date)
    : 0;
  const dayCount = isHalfDay && rawDayCount > 0 ? 0.5 : rawDayCount;
  // Takvim gunu (her iki uc dahil) - is gunu farkini kullaniciya aciklamak icin
  const calendarDayCount =
    form.start_date && form.end_date
      ? Math.max(
          0,
          Math.round(
            (new Date(form.end_date) - new Date(form.start_date)) / 86400000
          ) + 1
        )
      : 0;

  const selectedLeaveType = leaveTypes.find((t) => t.name === form.leave_type);
  // Bakiye kontrolu sadece yillik izin turunde uygulanir -- hastalik/ucretsiz vb.
  // turler yillik bakiyeyi zaten etkilemiyor.
  const wouldBeNegative = hasHireDate && isAnnualLeaveType(form.leave_type, leaveTypes) && (leaveBalance - dayCount) < -5;
  
  // Leave type rule validations
  const violatesMinDays = !isHalfDay && selectedLeaveType?.min_days && dayCount < selectedLeaveType.min_days;
  const violatesMaxDays = selectedLeaveType?.max_days && dayCount > selectedLeaveType.max_days;
  const violatesAnnualLimit = selectedLeaveType?.annual_limit && dayCount > selectedLeaveType.annual_limit;
  const hasRuleViolation = violatesMinDays || violatesMaxDays || violatesAnnualLimit;

  const mutation = useMutation({
    mutationFn: (data) =>
      isEditing
        ? flowApi.entities.LeaveRequest.update(leave.id, data)
        : flowApi.entities.LeaveRequest.create(data),
    onSuccess,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isHR && !isEditing && !targetEmployeeId) {
      alert("Lütfen izin girilecek çalışanı seçin.");
      return;
    }
    if (wouldBeNegative) {
      alert("İzin bakiyeniz yetersiz. Talep ettiğiniz izin sonrası bakiye -5 günün altına düşemez.");
      return;
    }
    if (hasRuleViolation) {
      const errors = [];
      if (violatesMinDays) errors.push(`Minimum ${selectedLeaveType.min_days} gün talep edilmelidir.`);
      if (violatesMaxDays) errors.push(`Maksimum ${selectedLeaveType.max_days} gün talep edilebilir.`);
      if (violatesAnnualLimit) errors.push(`Yıllık limit ${selectedLeaveType.annual_limit} gün.`);
      alert("İzin kurallarına uygun değil:\n" + errors.join("\n"));
      return;
    }
    mutation.mutate({
      ...form,
      employee_id: targetEmployee?.id || user?.id,
      employee_email: targetEmployee?.email || user?.email,
      employee_full_name: targetEmployee?.full_name || user?.full_name,
      employee_department: targetEmployee?.department || "",
      day_count: dayCount,
      status: "yonetici_onayi_bekliyor",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{isEditing ? "İzin Talebini Düzenle" : "Yeni İzin Talebi"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isHR && !isEditing && (
            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-xl p-3">
              <Label>Çalışan (kimin adına)</Label>
              <select
                required
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Seçiniz</option>
                {allEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}{emp.department ? " · " + deptLabel(emp.department) : ""}</option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">İK olarak başka bir çalışan adına izin girebilirsiniz.</p>
            </div>
          )}
          <div>
            <Label>İzin Tipi</Label>
            <select
              required
              value={form.leave_type}
              onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
              className="mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Seçiniz</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Başlangıç Tarihi</Label>
              <Input
                type="date"
                required
                lang="tr"
                value={form.start_date}
                onChange={(e) => {
                  const newStart = e.target.value;
                  const newMin = newStart ? toISODate(nextBusinessDay(newStart)) : "";
                  const stillValid = returnDate && newMin && returnDate >= newMin;
                  if (!stillValid) setReturnDate("");
                  setForm({
                    ...form,
                    start_date: newStart,
                    end_date: stillValid ? form.end_date : "",
                    half_day_period: stillValid ? form.half_day_period : "",
                  });
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label>İşe Dönüş Tarihi</Label>
              <Input
                type="date"
                required
                lang="tr"
                min={form.start_date ? toISODate(nextBusinessDay(form.start_date)) : undefined}
                value={returnDate}
                onChange={(e) => {
                  const rd = e.target.value;
                  const newEnd = rd ? toISODate(previousBusinessDay(rd)) : "";
                  setReturnDate(rd);
                  setForm({
                    ...form,
                    end_date: newEnd,
                    half_day_period: newEnd === form.start_date ? form.half_day_period : "",
                  });
                }}
                className="mt-1"
              />
            </div>
          </div>

          {isSingleDay && (
            <div className="rounded-xl border border-border/60 p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.half_day_period}
                  onChange={(e) =>
                    setForm({ ...form, half_day_period: e.target.checked ? "ogleden_once" : "" })
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm font-medium">Yarım gün izin</span>
              </label>
              {!!form.half_day_period && (
                <div className="flex gap-2 pl-6">
                  {[
                    { v: "ogleden_once", l: "Öğleden önce" },
                    { v: "ogleden_sonra", l: "Öğleden sonra" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setForm({ ...form, half_day_period: o.v })}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        form.half_day_period === o.v
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/60 hover:bg-muted"
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {dayCount > 0 && (
            <div className="space-y-1">
              <p className={`text-sm font-medium ${hasRuleViolation ? "text-red-600" : "text-primary"}`}>
                Toplam: {String(dayCount).replace(".", ",")} gün
                {isHalfDay && (form.half_day_period === "ogleden_once" ? " (öğleden önce)" : " (öğleden sonra)")}
              </p>
              {!isCalendarDayType && !isHalfDay && calendarDayCount > dayCount && (
                <p className="text-xs text-muted-foreground">
                  {calendarDayCount} takvim günü · {dayCount} iş günü
                  {" "}(hafta sonu ve resmi tatiller hariç)
                </p>
              )}
              {isCalendarDayType && (
                <p className="text-xs text-muted-foreground">
                  Bu izin türü takvim günü üzerinden hesaplanır (hafta sonları dahil).
                </p>
              )}
              {targetEmployee && !hasHireDate && (
                <p className="text-xs text-red-600 font-semibold">⚠️ İşe giriş tarihi tanımlı değil. Lütfen IK ile iletişime geçin.</p>
              )}
              {hasHireDate && (
                <p className={`text-xs ${wouldBeNegative ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                  Mevcut bakiye: {leaveBalance} gün
                  {wouldBeNegative && ` • Bu talep bakiyeyi -5'in altına düşürecek!`}
                </p>
              )}
              {selectedLeaveType && (
                <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                  {selectedLeaveType.min_days && <p>Minimum: {selectedLeaveType.min_days} gün</p>}
                  {selectedLeaveType.max_days && <p>Maksimum: {selectedLeaveType.max_days} gün</p>}
                  {selectedLeaveType.annual_limit && <p>Yıllık limit: {selectedLeaveType.annual_limit} gün</p>}
                </div>
              )}
              {hasRuleViolation && (
                <p className="text-xs text-red-600 font-semibold mt-1">⚠️ İzin kurallarına uygun değil!</p>
              )}
            </div>
          )}

          <div>
            <Label>Açıklama / Neden</Label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3}
              placeholder="İzin nedeninizi kısaca açıklayın..."
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>İptal</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending || dayCount <= 0 || wouldBeNegative || hasRuleViolation || (!!targetEmployee && !hasHireDate)}>
              {mutation.isPending ? "Kaydediliyor..." : isEditing ? "Güncelle" : "Talebi Gönder"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}