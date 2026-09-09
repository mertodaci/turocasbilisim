import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { X, CheckCircle, XCircle, User, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_ICONS = {
  approve: CheckCircle,
  reject: XCircle,
  submit: Clock,
};

const STATUS_LABELS = {
  approve: "Onaylandı",
  reject: "Reddedildi",
  submit: "Talep Oluşturuldu",
};

const STATUS_COLORS = {
  approve: "text-green-600 bg-green-50 border-green-200",
  reject: "text-red-600 bg-red-50 border-red-200",
  submit: "text-blue-600 bg-blue-50 border-blue-200",
};

export default function LeaveApprovalHistoryDialog({ leave, onClose }) {
  const approvalHistory = leave.approval_history || [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold">İzin Talebi İşlem Geçmişi</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {leave.employee_full_name} · {{yillik_izin:"Yillik Izin",hastalik_izni:"Hastalik Izni",mazeret_izni:"Mazeret Izni",ucretsiz_izin:"Ucretsiz Izni",dogum_izni:"Dogum Izni",babalik_izni:"Babalik Izni",egitim_izni:"Egitim Izni",dugun_izni:"Dugun Izni",olum_izni:"Olum Izni"}[leave.leave_type] || leave.leave_type}
            </p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Request Info */}
          <div className="bg-muted/40 rounded-xl p-4 mb-6 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>
                {format(new Date(leave.start_date), "d MMMM yyyy", { locale: tr })} -{" "}
                {format(new Date(leave.end_date), "d MMMM yyyy", { locale: tr })}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium">Toplam Süre: </span>
              <span className="text-muted-foreground">{leave.day_count || 0} gün</span>
            </div>
            {leave.reason && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-muted-foreground italic">"{leave.reason}"</span>
              </div>
            )}
            <div className="text-sm">
              <span className="font-medium">Mevcut Durum: </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                leave.status === "onaylandi" ? "bg-green-100 text-green-700" :
                leave.status === "reddedildi" ? "bg-red-100 text-red-700" :
                leave.status === "iptal_edildi" ? "bg-gray-100 text-gray-600" :
                leave.status === "ik_onayi_bekliyor" ? "bg-orange-100 text-orange-700" :
                "bg-blue-100 text-blue-700"
              }`}>
                {leave.status === "onaylandi" ? "Onaylandı" :
                 leave.status === "reddedildi" ? "Reddedildi" :
                 leave.status === "iptal_edildi" ? "İptal Edildi" :
                 leave.status === "ik_onayi_bekliyor" ? "İK Onayı Bekliyor" :
                 "Yönetici Onayı Bekliyor"}
              </span>
            </div>
          </div>

          {/* Timeline */}
          {approvalHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Henüz işlem geçmişi bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvalHistory.map((log, index) => {
                const Icon = STATUS_ICONS[log.action] || Clock;
                const colorClass = STATUS_COLORS[log.action] || STATUS_COLORS.submit;
                const label = STATUS_LABELS[log.action] || "İşlem";

                return (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {index < approvalHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold">{label}</h3>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), "d MMMM yyyy HH:mm", { locale: tr })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <User className="w-3.5 h-3.5" />
                        <span>{log.approver_name || "Sistem"}</span>
                      </div>
                      {log.note && (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground italic">
                          "{log.note}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-muted/30">
          <Button onClick={onClose} variant="outline" className="w-full">
            Kapat
          </Button>
        </div>
      </div>
    </div>
  );
}