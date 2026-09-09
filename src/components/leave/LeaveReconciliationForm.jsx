import { X, Printer } from "lucide-react";
import { format } from "date-fns";
import { useLeaveBalance } from "@/hooks/useLeaveBalance";

const LEAVE_TYPE_LABELS = {
  yillik_izin: "Yıllık İzin", hastalik_izni: "Hastalık İzni", mazeret_izni: "Mazeret İzni",
  ucretsiz_izin: "Ücretsiz İzin", dogum_izni: "Doğum İzni", babalik_izni: "Babalık İzni",
  egitim_izni: "Eğitim İzni", dugun_izni: "Düğün İzni", olum_izni: "Ölüm İzni",
};

function fmtDate(d) {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yyyy"); } catch { return "—"; }
}

const Row = ({ label, value }) => (
  <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", padding: "8px 0" }}>
    <div style={{ width: 170, fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{label}</div>
    <div style={{ flex: 1, fontSize: 13, color: "#334155" }}>{value ?? "—"}</div>
  </div>
);

const StatBox = ({ label, value }) => (
  <div style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px" }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{value} gün</div>
  </div>
);

export default function LeaveReconciliationForm({ employee, leaveMovements, deptLabel, posLabel, onClose }) {
  const { entitled, used, remaining, breakdown } = useLeaveBalance(employee);
  const lastGained = breakdown?.length > 0 ? breakdown[breakdown.length - 1].gained : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:bg-white print:p-0 print:static">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto print:shadow-none print:max-h-none print:rounded-none">
        {/* Ekran kontrolleri - yazdirmada gizli */}
        <div className="flex items-center justify-between p-4 border-b print:hidden">
          <h2 className="text-lg font-semibold">İzin Mutabakat Formu</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700">
              <Printer className="w-4 h-4" /> Yazdır
            </button>
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
        </div>

        {/* YAZDIRILAN ALAN */}
        <div id="leave-reconciliation-print" style={{ padding: 32, fontFamily: "Arial, sans-serif", color: "#0f172a" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#4f46e5" }}>Turocas Bilişim</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{fmtDate(new Date())}</div>
          </div>

          <div style={{ fontSize: 18, fontWeight: 800, textAlign: "center", marginBottom: 24 }}>İZİN MUTABAKAT FORMU</div>

          <Row label="Adı Soyadı" value={employee?.full_name} />
          <Row label="Kimlik Numarası" value={employee?.tc} />
          <Row label="İşe Giriş Tarihi" value={fmtDate(employee?.hire_date)} />
          <Row label="Birimler" value={`Turocas Bilişim > ${deptLabel || "—"} > ${posLabel || "—"}`} />

          <div style={{ fontWeight: 700, fontSize: 14, margin: "24px 0 10px", color: "#1e293b" }}>
            {fmtDate(new Date())} itibariyle İzin Hakkı Detayları - Yıllık İzin
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <StatBox label="Bir Önceki Dönemden Devreden" value={employee?.leave_carryover ?? 0} />
            <StatBox label="Son Dönemde Kazanılan" value={lastGained} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <StatBox label="Toplam Hak Edilen" value={entitled} />
            <StatBox label="Kullanılan" value={used} />
            <StatBox label="Kalan" value={remaining} />
          </div>

          <div style={{ fontWeight: 700, fontSize: 14, margin: "26px 0 4px", color: "#1e293b" }}>
            {fmtDate(employee?.hire_date)} - {fmtDate(new Date())} Tarihleri Arasında Kullandığım İzinler
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>Tüm İzinler</div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Başlama Tarihi", "Bitiş Tarihi", "İzin Türü", "Gün Sayısı"].map((h) => (
                  <th key={h} style={{ textAlign: "left", border: "1px solid #e5e7eb", padding: "6px 8px", background: "#f8fafc", fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(leaveMovements || []).length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "14px 8px", border: "1px solid #e5e7eb", color: "#64748b" }}>
                    Onaylanmış izin bulunmuyor.
                  </td>
                </tr>
              ) : (
                leaveMovements.map((l) => (
                  <tr key={l.id}>
                    <td style={{ border: "1px solid #e5e7eb", padding: "6px 8px" }}>{fmtDate(l.start_date)}</td>
                    <td style={{ border: "1px solid #e5e7eb", padding: "6px 8px" }}>{fmtDate(l.end_date)}</td>
                    <td style={{ border: "1px solid #e5e7eb", padding: "6px 8px" }}>{LEAVE_TYPE_LABELS[l.leave_type] || l.leave_type}</td>
                    <td style={{ border: "1px solid #e5e7eb", padding: "6px 8px" }}>{String(l.day_count).replace(".", ",")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <p style={{ fontSize: 12, color: "#475569", margin: "24px 0 36px", lineHeight: 1.6 }}>
            Yukarıda belirtilen kalan izin günümün doğru olduğunu ve listede yer alan tüm izinleri kullandığımı kabul ve taahhüt ediyorum.
          </p>

          <div style={{ fontSize: 12, marginBottom: 30 }}>Adı Soyadı: {employee?.full_name || ""}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: "#64748b" }}>İmza:</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Tarih: {format(new Date(), "d MMMM yyyy")}</div>
          </div>
          <div style={{ borderBottom: "1px solid #94a3b8", marginTop: 20 }}></div>
        </div>
      </div>

      {/* Print CSS: sadece formu bas */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #leave-reconciliation-print, #leave-reconciliation-print * { visibility: visible; }
          #leave-reconciliation-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
