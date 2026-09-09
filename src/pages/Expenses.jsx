import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Plus, FileSpreadsheet, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import ExpenseReportDialog from "@/components/expenses/ExpenseReportDialog";
import ExpenseDetailDialog from "@/components/expenses/ExpenseDetailDialog";
import { createPortal } from "react-dom";
import ExpenseApprovalDialog from "@/components/expenses/ExpenseApprovalDialog";

const statusMap = {
  taslak: { label: "Taslak", className: "bg-slate-100 text-slate-600" },
  onay_bekliyor: { label: "Onay Bekliyor", className: "bg-orange-100 text-orange-700" },
  onaylandi: { label: "Onaylandı", className: "bg-green-100 text-green-700" },
  yonetici_onayi_bekliyor: { label: "Yönetici Onayı Bekliyor", className: "bg-blue-100 text-blue-700" },
  ik_onayi_bekliyor: { label: "IK Onayı Bekliyor", className: "bg-orange-100 text-orange-700" },
  reddedildi: { label: "Reddedildi", className: "bg-red-100 text-red-700" },
};

export default function Expenses() {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailReport, setDetailReport] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [editReport, setEditReport] = useState(null);
  const [approvalReport, setApprovalReport] = useState(null);

  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["expense-reports"],
    queryFn: () => flowApi.entities.ExpenseReport.filter({ employee_email: user?.email }, "-created_date", 100),
    enabled: !!user?.email,
  });
  // Tum masraf kalemleri -> rapor basina toplam (total_amount guvenilmez, kalemlerden hesapla)
  const { data: allItems = [] } = useQuery({
    queryKey: ["expense-items-all"],
    queryFn: () => flowApi.entities.ExpenseItem.list(),
  });
  const totalsByReport = {};
  for (const it of allItems) {
    const sum = (it.accommodation||0)+(it.transport||0)+(it.fuel||0)+(it.meal||0)+(it.other||0)+(it.amount||0);
    totalsByReport[it.report_id] = (totalsByReport[it.report_id] || 0) + sum;
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.ExpenseReport.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expense-reports"] }),
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Harcamalar</h1>
          <p className="text-sm text-muted-foreground mt-1">Saha ziyareti masraf raporları</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Yeni Rapor
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Henüz masraf raporu oluşturulmadı.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Çalışan</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Proje / Müşteri</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Gidiş</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Dönüş</th>
                <th className="text-right px-5 py-3 font-semibold text-muted-foreground">Avans</th>
                <th className="text-right px-5 py-3 font-semibold text-muted-foreground">Toplam Harcama</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const st = statusMap[r.status] || statusMap.taslak;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setDetailReport(r)}
                  >
                    <td className="px-5 py-3 font-medium">{r.employee_name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.project_name || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {r.trip_start_date ? format(new Date(r.trip_start_date), "d MMM yyyy", { locale: tr }) : "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {r.trip_end_date ? format(new Date(r.trip_end_date), "d MMM yyyy", { locale: tr }) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-medium">
                      {r.advance_amount ? r.advance_amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : "0,00"} ₺
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">
                      {(totalsByReport[r.id] || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.className}`}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">

                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditReport(r)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm("Bu rapor silinsin mi?")) deleteMutation.mutate(r.id); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ExpenseReportDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["expense-reports"] })}
      />

      {editReport && (
        <ExpenseReportDialog
          open={!!editReport}
          onOpenChange={(v) => { if (!v) setEditReport(null); }}
          report={editReport}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["expense-reports"] });
            setEditReport(null);
          }}
        />
      )}

      {detailReport && (
        <ExpenseDetailDialog
          report={detailReport}
          onClose={() => setDetailReport(null)}
          onPreview={(url) => setPreviewUrl(url)}
        />
      )}
      {approvalReport && (
        <ExpenseApprovalDialog
          report={approvalReport}
          onClose={() => setApprovalReport(null)}
          onSuccess={() => setApprovalReport(null)}
        />
      )}
      {previewUrl && createPortal(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:99999,display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'white',borderBottom:'1px solid #e5e7eb'}}>
            <span style={{fontWeight:600,fontSize:14}}>Dosya Önizleme</span>
            <div style={{display:'flex',gap:8}}>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:12,background:'#2563eb',color:'white',padding:'6px 12px',borderRadius:8,textDecoration:'none'}}>Yeni Sekmede Aç</a>
              <button onClick={() => setPreviewUrl(null)} style={{fontSize:12,border:'1px solid #e5e7eb',padding:'6px 12px',borderRadius:8,cursor:'pointer',background:'white'}}>Kapat</button>
            </div>
          </div>
          <div style={{flex:1,overflow:'auto',padding:16}}>
            {previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)
              ? <img src={previewUrl} alt="önizleme" style={{maxWidth:'100%',margin:'0 auto',display:'block',borderRadius:8}} />
              : previewUrl.match(/\.pdf$/i)
              ? <iframe src={previewUrl} style={{width:'100%',height:'100%',minHeight:'80vh',border:'none',borderRadius:8}} title="PDF" />
              : <div style={{textAlign:'center',paddingTop:48,color:'white'}}>
                  <p style={{marginBottom:16}}>Bu dosya önizlenemiyor.</p>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{color:'#60a5fa'}}>Dosyayı Aç</a>
                </div>
            }
          </div>
        </div>
      , document.body)}
    </div>
  );
}