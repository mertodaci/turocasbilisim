import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, User, Eye, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import LeaveApprovalDialog from "@/components/leave/LeaveApprovalDialog";
import LeaveApprovalHistoryDialog from "@/components/leave/LeaveApprovalHistoryDialog";
import { format, differenceInCalendarDays } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  reddedildi: { label: "Reddedildi", color: "bg-red-100 text-red-800", icon: Clock },
  iptal_edildi: { label: "İptal Edildi", color: "bg-gray-100 text-gray-600", icon: Clock },
};

export default function IKLeaveRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [toCancel, setToCancel] = useState(null);
  const canCancelLeave = user?.role === "admin" || user?.role === "ik";
  const cancelLeaveMutation = useMutation({
    mutationFn: (leave) =>
      flowApi.entities.LeaveRequest.update(leave.id, {
        status: "iptal_edildi",
        approval_note: "IK tarafindan iptal edildi",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-allowance-form"] });
      setToCancel(null);
    },
  });
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showHistory, setShowHistory] = useState(null);
  const [filterStatus, setFilterStatus] = useState("tumu");
  const [filterDepartment, setFilterDepartment] = useState("tumu");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data: departmentDefs = [] } = useQuery({
    queryKey: ["definitions", "departman"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "departman" }),
  });
  const deptLabel = (v) => departmentDefs.find((d) => d.value === v)?.label || v || "—";
  const [searchQuery, setSearchQuery] = useState("");

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["all-leave-requests"],
    queryFn: () => flowApi.entities.LeaveRequest.list("-created_date", 500),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const filtered = leaves.filter(leave => {
    const statusMatch = filterStatus === "tumu" || leave.status === filterStatus;
    const deptMatch = filterDepartment === "tumu" || leave.employee_department === filterDepartment;
    const searchMatch = searchQuery === "" || 
      leave.employee_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leave.employee_email?.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && deptMatch && searchMatch;
  });

  const statusCounts = {
    ik_onayi_bekliyor: leaves.filter(l => l.status === "ik_onayi_bekliyor").length,
    yonetici_onayi_bekliyor: leaves.filter(l => l.status === "yonetici_onayi_bekliyor").length,
    onaylandi: leaves.filter(l => l.status === "onaylandi").length,
    reddedildi: leaves.filter(l => l.status === "reddedildi").length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">İzin Yönetimi (IK)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tüm çalışan izin taleplerini görüntüleyin ve yönetin.
        </p>
      </div>

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

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex gap-2 flex-wrap">
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

        <Select value={filterDepartment} onValueChange={(v) => { setFilterDepartment(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Departman" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tumu">Tüm Departmanlar</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>{deptLabel(dept)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Çalışan ara..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-10"
          />
        </div>
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
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Çalışan</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Departman</th>
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
              {filtered
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((leave, i) => {
                const cfg = STATUS_CONFIG[leave.status] || STATUS_CONFIG.ik_onayi_bekliyor;
                const StatusIcon = cfg.icon;
                const days = leave.day_count || (differenceInCalendarDays(new Date(leave.end_date), new Date(leave.start_date)) + 1);
                return (
                  <tr key={leave.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium">{leave.employee_full_name}</p>
                          <p className="text-xs text-muted-foreground">{leave.employee_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{deptLabel(leave.employee_department)}</td>
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
                      {canCancelLeave &&
                        (leave.status === "onaylandi" || leave.status === "reddedildi") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setToCancel(leave)}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            İptal Et
                          </Button>
                        )}
                      {(leave.status === "ik_onayi_bekliyor" || leave.status === "yonetici_onayi_bekliyor") && (
                        <Button size="sm" variant="outline" onClick={() => setSelectedLeave(leave)}>
                          <Eye className="w-3 h-3 mr-1" />
                          İncele
                        </Button>
                      )}
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

        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Sayfa başına:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-border/50 rounded-lg px-2 py-1 text-xs bg-background"
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>{filtered.length} kayıt</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-border/50 disabled:opacity-30 hover:bg-muted transition-colors text-xs font-medium"
              >
                ← Önceki
              </button>
              <span className="text-xs text-muted-foreground font-medium">
                {currentPage} / {Math.max(1, Math.ceil(filtered.length / pageSize))}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(Math.max(1, Math.ceil(filtered.length / pageSize)), p + 1)
                  )
                }
                disabled={currentPage >= Math.ceil(filtered.length / pageSize)}
                className="px-3 py-1.5 rounded-lg border border-border/50 disabled:opacity-30 hover:bg-muted transition-colors text-xs font-medium"
              >
                Sonraki →
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedLeave && (
        <LeaveApprovalDialog
          leave={selectedLeave}
          onClose={() => setSelectedLeave(null)}
          onSuccess={() => {
            setSelectedLeave(null);
            queryClient.invalidateQueries({ queryKey: ["all-leave-requests"] });
          }}
        />
      )}
      {showHistory && (
        <LeaveApprovalHistoryDialog
          leave={showHistory}
          onClose={() => setShowHistory(null)}
        />
      )}

      <AlertDialog open={!!toCancel} onOpenChange={(v) => !v && setToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İzin iptal edilsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{toCancel?.employee_full_name || "-"}</strong> adlı çalışanın
              {" "}{toCancel?.start_date} - {toCancel?.end_date} tarihli izni
              {" "}<strong>İptal Edildi</strong> durumuna alınacak.
              Kayıt silinmez, geçmişte görünür ve izin bakiyesine geri eklenir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelLeaveMutation.mutate(toCancel)}
              className="bg-red-600 hover:bg-red-700"
            >
              İptal Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}