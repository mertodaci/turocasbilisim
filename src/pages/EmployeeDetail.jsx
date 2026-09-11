import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Navigate } from "react-router-dom";
import { Phone, Briefcase, Pencil, Mail, Building2, GraduationCap, CalendarDays, Paperclip, User2, FileText, Users, Umbrella, UserMinus, CheckCircle, CheckCircle2, Circle, MoreVertical, FileSignature } from "lucide-react";
import { format, differenceInYears, addYears } from "date-fns";
import { tr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLeaveBalance } from "@/hooks/useLeaveBalance";
import EmployeeFormDialog from "@/components/employees/EmployeeFormDialog";
import TerminateEmployeeDialog from "@/components/employees/TerminateEmployeeDialog";
import LeaveFormPrint from "@/components/leave/LeaveFormPrint";
import LeaveReconciliationForm from "@/components/leave/LeaveReconciliationForm";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/lib/RolePermissionsContext";

const LEAVE_TYPE_LABELS = {
  yillik_izin: "Yıllık İzin", hastalik_izni: "Hastalık İzni", mazeret_izni: "Mazeret İzni",
  ucretsiz_izin: "Ücretsiz İzin", dogum_izni: "Doğum İzni", babalik_izni: "Babalık İzni",
  egitim_izni: "Eğitim İzni", dugun_izni: "Düğün İzni", olum_izni: "Ölüm İzni",
};

export default function EmployeeDetail() {
  const [editOpen, setEditOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [formPrintLeave, setFormPrintLeave] = useState(null);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const { user } = useAuth();
  const { can } = useRolePermissions();
  const isPrivileged = user?.role === "admin" || user?.role === "yonetici" || can(user?.role, "employees", "edit");
  const urlParams = new URLSearchParams(window.location.search);
  const employeeId = window.location.pathname.split("/").pop();

  const queryClient = useQueryClient();

  const { data: departmentDefs = [] } = useQuery({
    queryKey: ["definitions", "departman"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "departman" }),
  });
  const { data: positionDefs = [] } = useQuery({
    queryKey: ["definitions", "pozisyon"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "pozisyon" }),
  });
  const getDeptLabel = (val) => departmentDefs.find(d => d.value === val)?.label || val;
  const getPosLabel = (val) => positionDefs.find(p => p.value === val)?.label || val;
  const { data: exitReasonDefs = [] } = useQuery({
    queryKey: ["definitions", "ayrilis_nedeni"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "ayrilis_nedeni" }),
  });
  const getExitReasonLabel = (val) => exitReasonDefs.find(r => r.value === val)?.label || val;

  const { data: employee, isLoading: loadingEmployee } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      const list = await flowApi.entities.Employee.filter({ id: employeeId });
      const emp = list[0];
      
      // Calisan: sadece kendi profilini görebilir
      if (!isPrivileged && emp?.email !== user?.email) {
        return null;
      }
      return emp;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => flowApi.entities.Employee.update(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
      setEditOpen(false);
    },
  });

  const toggleSignedMutation = useMutation({
    mutationFn: ({ id, next }) => flowApi.entities.LeaveRequest.update(id, { is_signed: next }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employee-leave-movements", employeeId] }),
  });

  const { entitled: entitledTotal, used: totalUsedDays, remaining: leaveBalance, hasHireDate: hasLeaveBalanceData, breakdown } = useLeaveBalance(employee);

  // Calculate next eligibility date based on hire_date anniversary
  const nextEligibilityDate = employee?.hire_date
    ? (() => {
        const hire = new Date(employee.hire_date);
        const now = new Date();
        let next = new Date(now.getFullYear(), hire.getMonth(), hire.getDate());
        if (next <= now) next = addYears(next, 1);
        return next;
      })()
    : null;

  // Kidem (yil) ve o yil kazanilan gun (bilgi amacli) + birikmeli toplam hak
  const seniority = employee?.hire_date ? differenceInYears(new Date(), new Date(employee.hire_date)) : null;
  const entitledDays = entitledTotal;

  const { data: leaveMovements = [], isLoading: loadingLeaveMovements } = useQuery({
    queryKey: ["employee-leave-movements", employeeId],
    queryFn: () => flowApi.entities.LeaveRequest.filter({ employee_id: employeeId, status: "onaylandi" }, "-start_date"),
    enabled: !!employee && isPrivileged,
  });

  if (loadingEmployee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return <Navigate to="/calisanlar" replace />;
  }

  // Calisan: kendi profiline erişebilir
  if (!isPrivileged && employee?.email !== user?.email) {
    return <Navigate to="/calisanlar" replace />;
  }

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
          {employee.avatar_url ? (
            <img src={employee.avatar_url} alt={employee.full_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-primary">
              {employee.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{employee.full_name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {employee.position && <span className="text-sm text-muted-foreground">{getPosLabel(employee.position)}</span>}
            <Badge variant="secondary">{getDeptLabel(employee.department)}</Badge>
            {isPrivileged ? (
              <button
                onClick={() => updateMutation.mutate({ status: employee.status === "pasif" ? "aktif" : "pasif" })}
                disabled={updateMutation.isPending}
                className={cn(
                  "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all cursor-pointer",
                  employee.status === "pasif"
                    ? "bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-slate-100 hover:text-slate-500 hover:border-slate-200"
                )}
              >
                {employee.status === "pasif" ? "Pasif" : "Aktif"}
              </button>
            ) : (
              <Badge className={employee.status === "pasif" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}>
                {employee.status === "pasif" ? "Pasif" : "Aktif"}
              </Badge>
            )}
          </div>
        </div>
        {isPrivileged && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="w-3.5 h-3.5" /> Düzenle
            </Button>
            {employee.status !== "pasif" && (
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setTerminateOpen(true)}>
                <UserMinus className="w-3.5 h-3.5" /> İşten Çıkart
              </Button>
            )}
          </div>
        )}
      </div>

      {isPrivileged && (
        <EmployeeFormDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          employee={employee}
          onSubmit={(data) => updateMutation.mutate(data)}
          isLoading={updateMutation.isPending}
        />
      )}
      {isPrivileged && (
        <TerminateEmployeeDialog
          open={terminateOpen}
          onOpenChange={setTerminateOpen}
          employee={employee}
        />
      )}
      {formPrintLeave && (
        <LeaveFormPrint leave={formPrintLeave} onClose={() => setFormPrintLeave(null)} />
      )}
      {showReconciliation && (
        <LeaveReconciliationForm
          employee={employee}
          leaveMovements={leaveMovements}
          deptLabel={getDeptLabel(employee.department)}
          posLabel={getPosLabel(employee.position)}
          onClose={() => setShowReconciliation(false)}
        />
      )}

      {/* İşten Çıkış Bilgileri - sadece pasif calisanlar */}
      {employee.status === "pasif" && (employee.exit_date || employee.exit_reason || employee.exit_notes || employee.exit_document) && (
        <div className="bg-red-50/50 dark:bg-red-950/20 rounded-2xl p-6 border border-red-200/60 dark:border-red-900/40 shadow-sm">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
            <UserMinus className="w-4 h-4" /> İşten Çıkış Bilgileri
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {employee.exit_date && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Çıkış Tarihi</p>
                  <p className="text-sm font-medium text-foreground">{format(new Date(employee.exit_date), "d MMMM yyyy", { locale: tr })}</p>
                </div>
              </div>
            )}
            {employee.exit_reason && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                  <UserMinus className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Ayrılış Nedeni</p>
                  <p className="text-sm font-medium text-foreground">{getExitReasonLabel(employee.exit_reason)}</p>
                </div>
              </div>
            )}
            {employee.exit_document && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Belge</p>
                  <a href={employee.exit_document} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline">
                    Belgeyi Görüntüle
                  </a>
                </div>
              </div>
            )}
          </div>
          {employee.exit_notes && (
            <div className="mt-4 pt-4 border-t border-red-200/60 dark:border-red-900/40">
              <p className="text-xs text-muted-foreground mb-1">Notlar</p>
              <p className="text-sm text-foreground leading-relaxed">{employee.exit_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Bilgi Kartı */}
      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">Çalışan Bilgileri</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employee.email && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">E-posta</p>
                <p className="text-sm font-medium break-all">{employee.email}</p>
              </div>
            </div>
          )}
          {employee.phone && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Telefon</p>
                <p className="text-sm font-medium">{employee.phone}</p>
              </div>
            </div>
          )}
          {employee.tc && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">TC Kimlik No</p>
                <p className="text-sm font-medium">{employee.tc}</p>
              </div>
            </div>
          )}
          {employee.department && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Departman</p>
                <p className="text-sm font-medium">{getDeptLabel(employee.department)}</p>
              </div>
            </div>
          )}
          {employee.position && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Pozisyon</p>
                <p className="text-sm font-medium">{getPosLabel(employee.position)}</p>
              </div>
            </div>
          )}
          {employee.hire_date && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-teal-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">İşe Giriş Tarihi</p>
                <p className="text-sm font-medium">{format(new Date(employee.hire_date), "d MMMM yyyy", { locale: tr })}</p>
              </div>
            </div>
          )}
          {employee.birth_date && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-rose-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Doğum Tarihi</p>
                <p className="text-sm font-medium">{format(new Date(employee.birth_date), "d MMMM yyyy", { locale: tr })}</p>
              </div>
            </div>
          )}
          {employee.gender && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
                <User2 className="w-4 h-4 text-pink-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Cinsiyet</p>
                <p className="text-sm font-medium capitalize">
                  {employee.gender === "erkek" ? "Erkek" : "Kadın"}
                </p>
              </div>
            </div>
          )}
          {employee.education_level && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Eğitim Durumu</p>
                <p className="text-sm font-medium capitalize">{employee.education_level.replace(/_/g, " ")}</p>
              </div>
            </div>
          )}
          {employee.manager_name && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Bağlı Olduğu Yönetici</p>
                <p className="text-sm font-medium">{employee.manager_name}</p>
              </div>
            </div>
          )}

        </div>

        {/* Mezuniyet Bilgileri */}
        {(() => {
          const history = employee.education_history?.length
            ? employee.education_history
            : (employee.university ? [{ university: employee.university, department: employee.education_department, graduation_date: employee.graduation_date }] : []);
          if (!history.length) return null;
          return (
            <div className="mt-5 pt-5 border-t border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                <h4 className="text-sm font-semibold text-foreground">Üniversite Bilgileri</h4>
              </div>
              <div className="space-y-3">
                {history.map((edu, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-xl">
                    {edu.university && (
                      <div>
                        <p className="text-[11px] text-muted-foreground">Üniversite</p>
                        <p className="text-sm font-medium">{edu.university}</p>
                      </div>
                    )}
                    {edu.department && (
                      <div>
                        <p className="text-[11px] text-muted-foreground">Bölüm</p>
                        <p className="text-sm font-medium">{edu.department}</p>
                      </div>
                    )}
                    {edu.graduation_date && (
                      <div>
                        <p className="text-[11px] text-muted-foreground">Mezuniyet Tarihi</p>
                        <p className="text-sm font-medium">{format(new Date(edu.graduation_date), "d MMMM yyyy", { locale: tr })}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Belgeler */}
        {employee.education_documents?.length > 0 && (
          <div className="mt-5 pt-5 border-t border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-foreground">Belgeler</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {employee.education_documents.map((doc, idx) => (
                <a
                  key={idx}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs bg-muted/60 hover:bg-muted rounded-lg px-3 py-1.5 text-foreground transition-colors border border-border/50"
                >
                  <Paperclip className="w-3 h-3 text-muted-foreground" />
                  {doc.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* İzin Bilgileri */}
      {isPrivileged && employee.hire_date && (
        <>
        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Umbrella className="w-4 h-4 text-teal-500" />
              <h3 className="text-sm font-semibold text-foreground">İzin Bilgileri</h3>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => setShowReconciliation(true)}>
              <FileSignature className="w-3.5 h-3.5" /> Mutabakat Formu
            </Button>
          </div>

          {/* Özet Kartlar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {/* Bakiye */}
            <div className="bg-muted/40 rounded-xl p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">İzin Bakiyesi</p>
              {hasLeaveBalanceData ? (
                <div>
                  <p className={`text-2xl font-bold ${leaveBalance < 0 ? "text-red-600" : leaveBalance <= 3 ? "text-orange-500" : "text-green-600"}`}>
                    {leaveBalance} gün
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hak: {entitledTotal} · Kullanılan: {totalUsedDays}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">İşe giriş tarihi gerekli</p>
              )}
            </div>

            {/* Sonraki Hak Ediş */}
            <div className="bg-muted/40 rounded-xl p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Sonraki Hak Ediş Tarihi</p>
              {nextEligibilityDate ? (
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {format(nextEligibilityDate, "d MMM yyyy", { locale: tr })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hak edilecek: <span className="font-semibold text-foreground">{entitledDays} gün</span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">İşe giriş tarihi gerekli</p>
              )}
            </div>

            {/* Kıdem */}
            <div className="bg-muted/40 rounded-xl p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Kıdem</p>
              {seniority !== null ? (
                <div>
                  <p className="text-2xl font-bold text-foreground">{seniority} yıl</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {seniority >= 15 ? "15+ yıl → 26 gün hakkı" : seniority >= 6 ? "6-14 yıl → 20 gün hakkı" : "1-5 yıl → 14 gün hakkı"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">İşe giriş tarihi gerekli</p>
              )}
            </div>
          </div>

          {/* Kıdem Yıldönümlerine Göre Hak Edilen Günler */}
          {(breakdown?.length > 0 || (employee?.leave_carryover || employee?.leave_used_before)) && (
            <div className="border-t border-border/50 pt-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Kıdem Yıldönümlerine Göre Hak Edilen Günler</h4>
              <div className="space-y-2">
                {!!employee?.leave_carryover && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-foreground">Devir (2020 öncesi)</span>
                    <span className="text-sm font-bold text-foreground">+{employee.leave_carryover} gün</span>
                  </div>
                )}
                {breakdown?.map((b) => (
                  <div key={b.year} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className="text-sm text-foreground">{b.year} — {b.seniority}. yıl kıdem</span>
                    <span className="text-sm font-bold text-green-600">+{b.gained} gün</span>
                  </div>
                ))}
                {!!employee?.leave_used_before && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-foreground">Önceden Kullanılan (Turkonix öncesi)</span>
                    <span className="text-sm font-bold text-red-600">-{employee.leave_used_before} gün</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Hareketler */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden mt-6">
          <div className="flex items-center gap-2 p-6 pb-4">
            <FileText className="w-4 h-4 text-teal-500" />
            <h3 className="text-sm font-semibold text-foreground">Hareketler</h3>
          </div>
          {loadingLeaveMovements ? (
            <div className="text-center py-10 text-sm text-muted-foreground">Yükleniyor...</div>
          ) : leaveMovements.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">Onaylanmış izin hareketi bulunmuyor.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Başlangıç</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Bitiş</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Süre</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">İzin Türü</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Açıklama</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Oluşturulma Tarihi</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground">İmzalandı</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {leaveMovements.map((leave) => (
                  <tr key={leave.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(leave.start_date), "d MMM yyyy", { locale: tr })}</td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(leave.end_date), "d MMM yyyy", { locale: tr })}</td>
                    <td className="px-4 py-3 font-semibold">{leave.day_count} gün</td>
                    <td className="px-4 py-3">{LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate" title={leave.reason || ""}>{leave.reason || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(leave.created_date), "d MMM yyyy HH:mm", { locale: tr })}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" /> Onaylandı
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSignedMutation.mutate({ id: leave.id, next: !leave.is_signed })}
                        disabled={toggleSignedMutation.isPending}
                        className="inline-flex items-center justify-center disabled:opacity-50"
                        title={leave.is_signed ? "İmzalandı — kaldırmak için tıklayın" : "İmzalanmadı — işaretlemek için tıklayın"}
                      >
                        {leave.is_signed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground/40" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setFormPrintLeave(leave)}>
                            <FileText className="w-4 h-4" /> Formu Görüntüle
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        </>
      )}

    </div>
  );
}
