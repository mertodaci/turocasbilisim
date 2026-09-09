import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, XCircle, Clock, Calendar, Pencil, Trash2, Eye, FileText } from "lucide-react";
import LeaveRequestForm from "@/components/leave/LeaveRequestForm";
import LeaveApprovalHistoryDialog from "@/components/leave/LeaveApprovalHistoryDialog";
import LeaveFormPrint from "@/components/leave/LeaveFormPrint";
import { format, differenceInCalendarDays } from "date-fns";
import { useLeaveBalance } from "@/hooks/useLeaveBalance";
import { tr } from "date-fns/locale";

const LEAVE_TYPE_LABELS = {
  yillik_izin: "Yıllık İzin",
  hastalik_izni: "Hastalık İzni",
  mazeret_izni: "Mazeret İzni",
  ucretsiz_izin: "Ücretsiz İzin",
  dogum_izni: "Doğum İzni",
  babalik_izni: "Babalık İzni",
  egitim_izni: "Eğitim İzni",
  dugun_izni: "Düğün İzni",
  olum_izni: "Ölüm İzni",
};

const STATUS_CONFIG = {
  ik_onayi_bekliyor: { label: "IK Onayı Bekliyor", color: "bg-orange-100 text-orange-800", icon: Clock },
  yonetici_onayi_bekliyor: { label: "Yönetici Onayı Bekliyor", color: "bg-blue-100 text-blue-800", icon: Clock },
  onaylandi: { label: "Onaylandı", color: "bg-green-100 text-green-800", icon: Clock },
  reddedildi: { label: "Reddedildi", color: "bg-red-100 text-red-800", icon: XCircle },
  iptal_edildi: { label: "İptal Edildi", color: "bg-gray-100 text-gray-600", icon: XCircle },
};

export default function MyLeaveRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [showHistory, setShowHistory] = useState(null);
  const [filterStatus, setFilterStatus] = useState("tumu");
  const [formPrintLeave, setFormPrintLeave] = useState(null);

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["my-leave-requests", user?.id],
    queryFn: async () => {
      const all = await flowApi.entities.LeaveRequest.list("-created_date", 200);
      return all.filter(l => l.employee_email === user?.email || l.created_by === user?.email);
    },
  });

  const { data: myEmployee = null } = useQuery({
    queryKey: ["my-employee-record", user?.email],
    queryFn: async () => {
      const emps = await flowApi.entities.Employee.filter({ email: user?.email, status: "aktif" });
      if (!emps || emps.length === 0) return null;
      // Birden fazla aktif kayit olabilir (mukerrer). Asil calisan EN KIDEMLI olandir:
      // ise giris tarihi dolu olanlar arasindan EN ESKI hire_date'i sec.
      const withHire = emps.filter(e => e.hire_date);
      if (withHire.length > 0) {
        withHire.sort((a, b) => new Date(a.hire_date) - new Date(b.hire_date));
        return withHire[0];
      }
      return emps[0];
    },
    enabled: !!user?.email,
  });
  const { entitled: myEntitled, used: myUsed, remaining: myRemaining } = useLeaveBalance(myEmployee);

  const cancelMutation = useMutation({
    mutationFn: (id) => flowApi.entities.LeaveRequest.update(id, { status: "iptal_edildi" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.LeaveRequest.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] }),
  });

  const filtered = filterStatus === "tumu" ? leaves : leaves.filter(l => l.status === filterStatus);

  const statusCounts = {
    ik_onayi_bekliyor: leaves.filter(l => l.status === "ik_onayi_bekliyor").length,
    yonetici_onayi_bekliyor: leaves.filter(l => l.status === "yonetici_onayi_bekliyor").length,
    onaylandi: leaves.filter(l => l.status === "onaylandi").length,
    reddedildi: leaves.filter(l => l.status === "reddedildi").length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">İzinlerim</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kişisel izin taleplerinizi oluşturun ve takip edin.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          İzin Talebi Oluştur
        </Button>
      </div>

      {myEmployee && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            İzin Durumum
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col gap-1">
              <p className="text-xs text-blue-600 font-medium">Hak Edilen</p>
              <p className="text-3xl font-bold text-blue-700">{myEntitled}</p>
              <p className="text-xs text-blue-500">gün</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col gap-1">
              <p className="text-xs text-orange-600 font-medium">Kullanılan</p>
              <p className="text-3xl font-bold text-orange-700">{myUsed || 0}</p>
              <p className="text-xs text-orange-500">gün</p>
            </div>
            <div className={`rounded-xl p-4 flex flex-col gap-1 border ${
              myRemaining <= 0
                ? "bg-red-50 border-red-200"
                : myRemaining <= 3
                ? "bg-yellow-50 border-yellow-200"
                : "bg-green-50 border-green-200"
            }`}>
              <p className={`text-xs font-medium ${myRemaining <= 0 ? "text-red-600" : myRemaining <= 3 ? "text-yellow-600" : "text-green-600"}`}>Kalan</p>
              <p className={`text-3xl font-bold ${myRemaining <= 0 ? "text-red-700" : myRemaining <= 3 ? "text-yellow-700" : "text-green-700"}`}>{myRemaining}</p>
              <p className={`text-xs ${myRemaining <= 0 ? "text-red-500" : myRemaining <= 3 ? "text-yellow-500" : "text-green-500"}`}>gün</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { key: "ik_onayi_bekliyor", label: "IK Bekleyen", color: "border-orange-300 bg-orange-50", textColor: "text-orange-700" },
          { key: "yonetici_onayi_bekliyor", label: "Yönetici Bekleyen", color: "border-blue-300 bg-blue-50", textColor: "text-blue-700" },
          { key: "onaylandi", label: "Onaylanan", color: "border-green-300 bg-green-50", textColor: "text-green-700" },
          { key: "reddedildi", label: "Reddedilen", color: "border-red-300 bg-red-50", textColor: "text-red-700" },
        ].map(({ key, label, color, textColor }) => (
          <div key={key} className={`rounded-xl border-2 ${color} p-4`}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-3xl font-bold ${textColor}`}>{statusCounts[key]}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: "tumu", label: "Tümü" },
          { key: "ik_onayi_bekliyor", label: "IK Onayı Bekleyen" },
          { key: "yonetici_onayi_bekliyor", label: "Yönetici Onayı Bekleyen" },
          { key: "onaylandi", label: "Onaylandı" },
          { key: "reddedildi", label: "Reddedildi" },
          { key: "iptal_edildi", label: "İptal Edildi" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filterStatus === key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <Calendar className="w-8 h-8 opacity-40" />
            <p>Kayıt bulunamadı.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">İzin Tipi</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Başlangıç</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Bitiş</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Gün</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">İşlem</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Geçmiş</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((leave, i) => {
                const cfg = STATUS_CONFIG[leave.status] || STATUS_CONFIG.ik_onayi_bekliyor;
                const StatusIcon = cfg.icon;
                const days = leave.day_count || (differenceInCalendarDays(new Date(leave.end_date), new Date(leave.start_date)) + 1);
                return (
                  <tr key={leave.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-4 py-3 font-medium">{LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(leave.start_date), "d MMM yyyy", { locale: tr })}</td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(leave.end_date), "d MMM yyyy", { locale: tr })}</td>
                    <td className="px-4 py-3 font-semibold">{days}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => setFormPrintLeave(leave)}
                        >
                          <FileText className="w-3 h-3" />
                          Form
                        </Button>
                        {(["ik_onayi_bekliyor", "beklemede", "yonetici_onayi_bekliyor"].includes(leave.status) || user?.role === "admin" || user?.role === "yonetici") && leave.status !== "onaylandi" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => setEditingLeave(leave)}
                            >
                              <Pencil className="w-3 h-3" />
                              Düzenle
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive gap-1"
                              onClick={() => {
                                if (confirm("Bu izin talebini silmek istediğinizden emin misiniz?")) {
                                  deleteMutation.mutate(leave.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                              Sil
                            </Button>
                          </>
                        )}
                        {(leave.status === "ik_onayi_bekliyor" || leave.status === "beklemede") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Bu izin talebini iptal etmek istediğinizden emin misiniz?")) {
                                cancelMutation.mutate(leave.id);
                              }
                            }}
                          >
                            İptal
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowHistory(leave)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowHistory(leave)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        Geçmiş
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {formPrintLeave && (
        <LeaveFormPrint leave={formPrintLeave} onClose={() => setFormPrintLeave(null)} />
      )}
      {(showForm || editingLeave) && (
        <LeaveRequestForm
          leave={editingLeave}
          onClose={() => { setShowForm(false); setEditingLeave(null); }}
          onSuccess={() => {
            setShowForm(false);
            setEditingLeave(null);
            queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
          }}
        />
      )}
      {showHistory && (
        <LeaveApprovalHistoryDialog
          leave={showHistory}
          onClose={() => setShowHistory(null)}
        />
      )}
    </div>
  );
}