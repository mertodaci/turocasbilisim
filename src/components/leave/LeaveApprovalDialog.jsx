import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { useLeave } from "@/lib/NotificationContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, CheckCircle, XCircle, User, Calendar, FileText, AlertTriangle, Briefcase } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { tr } from "date-fns/locale";
import { isAnnualLeaveType } from "@/lib/leaveCalc";
import { useLeaveBalance } from "@/hooks/useLeaveBalance";

export default function LeaveApprovalDialog({ leave, onClose, onSuccess }) {
  const { user } = useAuth();
  const { fetchPendingCount } = useLeave();
  const [note, setNote] = useState("");

  const days = leave.day_count || (differenceInCalendarDays(new Date(leave.end_date), new Date(leave.start_date)) + 1);

  const { data: employeeRecord } = useQuery({
    queryKey: ["employee-by-email", leave.employee_email],
    queryFn: () => flowApi.entities.Employee.filter({ email: leave.employee_email }),
    enabled: !!leave.employee_email,
    select: (data) => data[0],
  });

  const { data: currentUserEmployee } = useQuery({
    queryKey: ["employee-by-email", user?.email],
    queryFn: () => flowApi.entities.Employee.filter({ email: user?.email }),
    enabled: !!user?.email,
    select: (data) => data[0],
  });

  const isIK = user?.role === "admin" || user?.role === "ik" || (user?.role === "yonetici" && currentUserEmployee?.department === "insan_kaynaklari");
  // Yonetici adimini calisanin gercek yoneticisi onaylar; IK/admin de onaylayabilir
  // (uygulamayi kullanamayan calisanlar adina IK surec yurutebilsin diye)
  const isRealManager = !!(employeeRecord?.manager_id && employeeRecord.manager_id === currentUserEmployee?.id);
  const isManager = isRealManager || isIK;
  const currentStep = leave.status === "yonetici_onayi_bekliyor" ? "yonetici" : leave.status === "ik_onayi_bekliyor" ? "ik" : null;

  const { remaining, hasHireDate, leaveTypes } = useLeaveBalance(employeeRecord);
  // Yalnizca "yillik" tipli izinler yillik haktan duser (ucretsiz/rapor/dogum vb. dusmez)
  const deductsFromBalance = isAnnualLeaveType(leave.leave_type, leaveTypes);
  const willExceed = hasHireDate && deductsFromBalance && days > remaining;

  const mutation = useMutation({
    mutationFn: async (action) => {
      const timestamp = new Date().toISOString();
      const historyEntry = {
        step: currentStep === "ik" ? "ik_onayi" : "yonetici_onayi",
        action: action,
        approver_id: user?.id,
        approver_name: user?.full_name,
        note: note,
        timestamp: timestamp,
      };
      const existingHistory = leave.approval_history || [];
      const updatedHistory = [...existingHistory, historyEntry];

      if (currentStep === "ik") {
        const updateData = {
          ik_approval_note: note,
          ik_approver_name: user?.full_name,
          ik_approval_date: timestamp,
          status: action === "approve" ? "onaylandi" : "reddedildi",
          approval_history: updatedHistory,
        };
        await flowApi.entities.LeaveRequest.update(leave.id, updateData);
      } else {
        const updateData = {
          manager_approval_note: note,
          manager_approver_name: user?.full_name,
          manager_approval_date: timestamp,
          status: action === "approve" ? "ik_onayi_bekliyor" : "reddedildi",
          approval_history: updatedHistory,
        };
        await flowApi.entities.LeaveRequest.update(leave.id, updateData);
      }
    },
    onSuccess: () => {
      fetchPendingCount();
      if (onSuccess) onSuccess();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold">Izin Talebi Inceleme</h2>
            <div className="flex items-center gap-2 mt-1">
              {currentStep === "ik" && (
                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> IK Onayi
                </span>
              )}
              {currentStep === "yonetici" && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                  <User className="w-3 h-3" /> Yonetici Onayi
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-muted/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">{leave.employee_full_name}</span>
              {leave.employee_department && (
                <span className="text-xs text-muted-foreground">. {leave.employee_department}</span>
              )}
            </div>
            {employeeRecord?.manager_name && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <User className="w-3 h-3" />
                <span>Yonetici: {employeeRecord.manager_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(leave.start_date), "d MMM yyyy", { locale: tr })} -{" "}
                {format(new Date(leave.end_date), "d MMM yyyy", { locale: tr })}
                <span className="ml-2 font-semibold text-foreground">({days} gun)</span>
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium">Izin Tipi: </span>
              <span className="text-muted-foreground">{{yillik_izin:"Yillik Izin",hastalik_izni:"Hastalik Izni",mazeret_izni:"Mazeret Izni",ucretsiz_izin:"Ucretsiz Izin",dogum_izni:"Dogum Izni",babalik_izni:"Babalik Izni",egitim_izni:"Egitim Izni",dugun_izni:"Dugun Izni",olum_izni:"Olum Izni"}[leave.leave_type] || leave.leave_type}</span>
            </div>
            {leave.reason && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-muted-foreground italic">"{leave.reason}"</span>
              </div>
            )}
          </div>

          {hasHireDate && (
            <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${willExceed ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
              {willExceed ? (
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
              )}
              <div className="text-sm">
                <p className={willExceed ? "font-semibold text-red-700" : "font-semibold text-green-700"}>
                  Izin Bakiyesi
                </p>
                <p className={willExceed ? "text-red-600" : "text-green-600"}>
                  Kalan: <b>{remaining} gun</b> . Talep: <b>{days} gun</b>
                  {willExceed && <span className="ml-1">- Bakiye yetersiz!</span>}
                </p>
              </div>
            </div>
          )}

          <div>
            <Label>{currentStep === "ik" ? "IK Onay/Red Notu" : "Yonetici Onay/Red Notu"}</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Notunuzu buraya yazin..."
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
              disabled={mutation.isPending || (currentStep === "ik" && !isIK) || (currentStep === "yonetici" && !isManager)}
              onClick={() => mutation.mutate("reject")}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reddet
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              disabled={mutation.isPending || (currentStep === "ik" && !isIK) || (currentStep === "yonetici" && !isManager)}
              onClick={() => mutation.mutate("approve")}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {currentStep === "ik" ? "IK Onayla" : "Yonetici Onayla"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
