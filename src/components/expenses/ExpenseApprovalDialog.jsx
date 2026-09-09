import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  yonetici_onayi_bekliyor: { label: "Yönetici Onayı Bekliyor", color: "bg-blue-100 text-blue-700" },
  ik_onayi_bekliyor: { label: "IK Onayı Bekliyor", color: "bg-orange-100 text-orange-700" },
  onaylandi: { label: "Onaylandı", color: "bg-green-100 text-green-700" },
  reddedildi: { label: "Reddedildi", color: "bg-red-100 text-red-700" },
  taslak: { label: "Taslak", color: "bg-slate-100 text-slate-700" },
};

export default function ExpenseApprovalDialog({ report, onClose, onSuccess }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const { data: items = [] } = useQuery({
    queryKey: ["expense-items", report?.id],
    queryFn: () => flowApi.entities.ExpenseItem.filter({ report_id: report.id }),
    enabled: !!report?.id,
  });
  const catLabel = { accommodation: "Konaklama", transport: "Ulaşım", fuel: "Yakıt", meal: "Yemek", other: "Diğer" };
  const rowSum = (it) => (it.accommodation||0)+(it.transport||0)+(it.fuel||0)+(it.meal||0)+(it.other||0)+(it.amount||0);
  const grandTotal = items.reduce((a,it)=>a+rowSum(it),0);

  const isManager = user?.role === "admin" || user?.role === "yonetici";
  const isIK = user?.role === "admin" || user?.role === "ik";

  const currentStep = report?.status === "yonetici_onayi_bekliyor" ? "yonetici"
    : report?.status === "ik_onayi_bekliyor" ? "ik" : null;

  const canApprove = (currentStep === "yonetici" && isManager) || (currentStep === "ik" && isIK);

  const mutation = useMutation({
    mutationFn: async (action) => {
      const timestamp = new Date().toISOString();
      if (currentStep === "yonetici") {
        await flowApi.entities.ExpenseReport.update(report.id, {
          status: action === "approve" ? "ik_onayi_bekliyor" : "reddedildi",
          manager_approver_name: user?.full_name,
          manager_approval_note: note,
          manager_approval_date: timestamp,
        });
      } else {
        await flowApi.entities.ExpenseReport.update(report.id, {
          status: action === "approve" ? "onaylandi" : "reddedildi",
          ik_approver_name: user?.full_name,
          ik_approval_note: note,
          ik_approval_date: timestamp,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-reports"] });
      toast.success("Harcama raporu güncellendi");
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e?.message || "İşlem başarısız, kaydedilemedi"),
  });

  const statusCfg = STATUS_CONFIG[report?.status] || STATUS_CONFIG.taslak;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Harcama Raporu Onayı</h2>
            <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{report?.employee_name}</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Proje/Müşteri</p>
              <p className="font-medium">{report?.project_name || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Avans</p>
              <p className="font-medium">{(report?.advance_amount || 0).toLocaleString("tr-TR")} ₺</p>
            </div>
            <div>
              <p className="text-muted-foreground">Gidiş</p>
              <p className="font-medium">{report?.trip_start_date || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dönüş</p>
              <p className="font-medium">{report?.trip_end_date || "—"}</p>
            </div>
          </div>

          {/* Harcama Kalemleri */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">Harcama Kalemleri</p>
              <p className="text-sm font-bold text-foreground">{grandTotal.toLocaleString("tr-TR")} ₺</p>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-xl">Kalem bulunamadı</p>
            ) : (
              <div className="max-h-[320px] overflow-auto border border-border/60 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/50">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-semibold">Tarih</th>
                      <th className="px-3 py-2 font-semibold">Açıklama</th>
                      <th className="px-3 py-2 font-semibold text-right">Konaklama</th>
                      <th className="px-3 py-2 font-semibold text-right">Ulaşım</th>
                      <th className="px-3 py-2 font-semibold text-right">Yakıt</th>
                      <th className="px-3 py-2 font-semibold text-right">Yemek</th>
                      <th className="px-3 py-2 font-semibold text-right">Diğer</th>
                      <th className="px-3 py-2 font-semibold text-right">Toplam</th>
                      <th className="px-3 py-2 font-semibold text-center">Fiş</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const cell = (v) => (v||0) > 0 ? (v).toLocaleString("tr-TR") : "";
                      return (
                        <tr key={it.id} className="border-t border-border/40">
                          <td className="px-3 py-2 whitespace-nowrap">{it.date || "—"}</td>
                          <td className="px-3 py-2">{it.description || ""}</td>
                          <td className="px-3 py-2 text-right">{cell(it.accommodation)}</td>
                          <td className="px-3 py-2 text-right">{cell(it.transport)}</td>
                          <td className="px-3 py-2 text-right">{cell(it.fuel)}</td>
                          <td className="px-3 py-2 text-right">{cell(it.meal)}</td>
                          <td className="px-3 py-2 text-right">{cell((it.other||0)+(it.amount||0))}</td>
                          <td className="px-3 py-2 text-right font-semibold">{rowSum(it).toLocaleString("tr-TR")}</td>
                          <td className="px-3 py-2 text-center">
                            {it.receipt_url
                              ? <a href={it.receipt_url} target="_blank" rel="noreferrer" className="text-indigo-600 inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5"/></a>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30 font-bold">
                      <td className="px-3 py-2" colSpan={7}>TOPLAM</td>
                      <td className="px-3 py-2 text-right">{grandTotal.toLocaleString("tr-TR")} ₺</td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {report?.manager_approval_date && (
            <div className="bg-muted/30 rounded-xl p-3 text-sm">
              <p className="font-medium text-green-700">✅ Yönetici Onayı: {report.manager_approver_name}</p>
              {report.manager_approval_note && <p className="text-muted-foreground mt-1">{report.manager_approval_note}</p>}
            </div>
          )}

          {canApprove && (
            <div className="space-y-2">
              <Label>{currentStep === "yonetici" ? "Yönetici" : "IK"} Notu</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Onay/red notu (opsiyonel)"
                className="min-h-[80px]"
              />
            </div>
          )}

          {!canApprove && currentStep && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700">
              Bu adımda onay yetkiniz bulunmuyor.
            </div>
          )}

          {!currentStep && (
            <div className="bg-muted/30 rounded-xl p-3 text-sm text-muted-foreground text-center">
              Bu rapor için onay süreci tamamlanmış.
            </div>
          )}
        </div>

        <div className="p-6 border-t flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Kapat</Button>
          {canApprove && (
            <>
              <Button
                variant="destructive"
                onClick={() => mutation.mutate("reject")}
                disabled={mutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-1" /> Reddet
              </Button>
              <Button
                onClick={() => mutation.mutate("approve")}
                disabled={mutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" /> Onayla
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
