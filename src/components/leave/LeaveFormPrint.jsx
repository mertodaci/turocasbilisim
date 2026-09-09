import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { X, Printer } from "lucide-react";
import { format } from "date-fns";
import { nextBusinessDay } from "@/lib/leaveCalc";
import { useLeaveBalance } from "@/hooks/useLeaveBalance";

const LEAVE_TYPE_LABELS = {
  yillik_izin: "Yıllık İzin", hastalik_izni: "Hastalık İzni", mazeret_izni: "Mazeret İzni",
  ucretsiz_izin: "Ücretsiz İzin", dogum_izni: "Doğum İzni", babalik_izni: "Babalık İzni",
  egitim_izni: "Eğitim İzni", dugun_izni: "Düğün İzni", olum_izni: "Ölüm İzni",
};

function fmtDate(d, withTime) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return withTime ? format(dt, "dd/MM/yyyy HH:mm") : format(dt, "dd/MM/yyyy");
  } catch { return "—"; }
}

export default function LeaveFormPrint({ leave, onClose }) {
  // Calisan detayi (TC, telefon, ise baslama)
  const { data: employee } = useQuery({
    queryKey: ["employee-for-form", leave?.employee_email],
    queryFn: () => flowApi.entities.Employee.filter({ email: leave.employee_email }),
    enabled: !!leave?.employee_email,
    select: (d) => d[0],
  });

  // Departman etiketleri (idari_isler -> Idari Isler)
  const { data: departments = [] } = useQuery({
    queryKey: ["definitions", "departman"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "departman" }),
  });
  const deptLabel = (v) => departments.find((d) => d.value === v)?.label || (v || "—");

  // Kalan izin (kidem-bazli, tek dogru kaynak)
  const { remaining } = useLeaveBalance(employee);

  const { data: allEmps = [] } = useQuery({
    queryKey: ["employees-for-form-names"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });
  const realName = (val) => {
    if (!val) return "";
    const v = String(val).trim().toLowerCase();
    const hit = allEmps.find((e) =>
      (e.email && e.email.toLowerCase().split("@")[0] === v) ||
      (e.email && e.email.toLowerCase() === v) ||
      (e.full_name && e.full_name.toLowerCase() === v)
    );
    return hit?.full_name || val;
  };
  const typeLabel = LEAVE_TYPE_LABELS[leave?.leave_type] || leave?.leave_type || "—";
  const days = leave?.day_count
    ? String(leave.day_count).replace(".", ",") +
      (leave.half_day_period
        ? leave.half_day_period === "ogleden_once"
          ? " (öğleden önce)"
          : " (öğleden sonra)"
        : "")
    : "—";
  const returnDate = nextBusinessDay(leave?.end_date);

  const Row = ({ label, value }) => (
    <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", padding: "8px 0" }}>
      <div style={{ width: 170, fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13, color: "#334155" }}>{value ?? "—"}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:bg-white print:p-0 print:static">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto print:shadow-none print:max-h-none print:rounded-none">
        {/* Ekran kontrolleri - yazdirmada gizli */}
        <div className="flex items-center justify-between p-4 border-b print:hidden">
          <h2 className="text-lg font-semibold">İzin Formu</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700">
              <Printer className="w-4 h-4" /> Yazdır
            </button>
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
        </div>

        {/* YAZDIRILAN ALAN */}
        <div id="leave-form-print" style={{ padding: 32, fontFamily: "Arial, sans-serif", color: "#0f172a" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#4f46e5" }}>FlowMetrics</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{fmtDate(new Date())}</div>
          </div>

          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>İzin Formu №: {leave?.id?.slice(0, 8)?.toUpperCase() || "—"}</div>

          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: "#1e293b" }}>Çalışan Bilgileri</div>
          <Row label="Adı Soyadı" value={leave?.employee_full_name} />
          <Row label="Birim Bilgisi" value={deptLabel(employee?.department || leave?.employee_department)} />
          <Row label="TC Kimlik No" value={employee?.tc} />
          <Row label="İşe Başlama Tarihi" value={fmtDate(employee?.hire_date)} />
          <Row label="Telefon Numarası" value={employee?.phone} />

          <div style={{ fontWeight: 700, fontSize: 14, margin: "22px 0 6px", color: "#1e293b" }}>İzin Detayları</div>
          <Row label="İzin Türü" value={typeLabel} />
          <Row label="Kullanılan Gün Sayısı" value={days} />
          <Row label="Başlangıç Tarihi" value={fmtDate(leave?.start_date)} />
          <Row label="Bitiş Tarihi" value={fmtDate(leave?.end_date)} />
          <Row label="İşe Dönüş Tarihi" value={returnDate ? fmtDate(returnDate) : "—"} />
          <Row label="Toplam Kalan İzin" value={remaining !== null ? remaining : "—"} />
          <Row label="Mesaj" value={leave?.reason} />

          <p style={{ fontSize: 12, color: "#475569", margin: "24px 0 36px", lineHeight: 1.6 }}>
            Yukarıda belirttiğim tarihler arasında izin haklarımı kullanacağımı bildirdiğimi beyan ederim.
          </p>

          {/* Imza alanlari */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginBottom: 24 }}>
            {["Çalışan", "Müdür Onayı", "İnsan Kaynakları Onayı"].map((t, idx) => (
              <div key={idx} style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 30 }}>{t}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {idx === 0 && `Adı Soyadı: ${leave?.employee_full_name || ""}`}
                  {idx === 1 && `${realName(leave?.manager_approver_name)}`}
                  {idx === 2 && `${realName(leave?.ik_approver_name)}`}
                </div>
                <div style={{ borderBottom: "1px solid #94a3b8", marginTop: 4 }}></div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>İmza</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
            Yukarıda bilgileri bulunan çalışan, izin hakkını {fmtDate(leave?.end_date)} tarihinde bitirecek ve {returnDate ? fmtDate(returnDate) : "…"} tarihinde işe başlayacaktır.
          </p>
        </div>
      </div>

      {/* Print CSS: sadece formu bas */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #leave-form-print, #leave-form-print * { visibility: visible; }
          #leave-form-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
