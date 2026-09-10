import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { FileDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

const departmentLabels = {
  satis: "Satış", pazarlama: "Pazarlama", musteri_hizmetleri: "Müşteri Hizmetleri",
  teknik: "Teknik", yonetim: "Yönetim", insan_kaynaklari: "İnsan Kaynakları", finans: "Finans",
};

const educationLabels = {
  ilkokul: "İlkokul",
  ortaokul: "Ortaokul",
  lise: "Lise",
  on_lisans: "Ön Lisans",
  lisans: "Lisans",
  yuksek_lisans: "Yüksek Lisans",
  doktora: "Doktora",
};

const genderLabels = { erkek: "Erkek", kadin: "Kadın" };

const fmtDate = (d) => {
  if (!d) return "-";
  try { return format(new Date(d), "dd.MM.yyyy", { locale: tr }); } catch { return d; }
};

export default function EmployeeReport() {
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees-report"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }, "-created_date", 500),
  });
  const { data: pozisyonlar = [] } = useQuery({
    queryKey: ["definitions", "pozisyon"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "pozisyon", is_active: true }),
  });
  const getPozisyonLabel = (value) => pozisyonlar.find(p => p.value === value)?.label || value || "-";
  const handleExportExcel = () => {
    const rows = employees.map((e) => ({
      "TC Kimlik No": e.tc || "",
      "Doğum Tarihi": fmtDate(e.birth_date),
      "İşe Başlama Tarihi": fmtDate(e.hire_date),
      "Ünvan / Pozisyon": getPozisyonLabel(e.position),
      "Cinsiyet": genderLabels[e.gender] || "",
      "E-posta": e.email || "",
      "Telefon": e.phone || "",
      "Departman": departmentLabels[e.department] || e.department || "",
      "Eğitim Durumu": educationLabels[e.education_level] || "",
      "En Yüksek Eğitim Seviyesi": educationLabels[e.highest_education] || "",
      "Üniversite": e.university || "",
      "Bölüm": e.education_department || "",
      "Mezuniyet Tarihi": fmtDate(e.graduation_date),
      "Durum": e.status === "pasif" ? "Pasif" : "Aktif",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Çalışanlar");
    XLSX.writeFile(wb, `calisan-raporu-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const handleExportCSV = () => {
    const headers = [
      "Ad Soyad", "TC Kimlik No", "Doğum Tarihi", "İşe Başlama Tarihi", "Ünvan / Pozisyon",
      "Cinsiyet", "E-posta", "Telefon", "Departman",
      "Eğitim Durumu", "En Yüksek Eğitim Seviyesi",
      "Üniversite", "Bölüm", "Mezuniyet Tarihi", "Durum"
    ];
    const rows = employees.map((e) => [
      e.full_name || "",
      e.tc || "",
      fmtDate(e.birth_date),
      fmtDate(e.hire_date),
      getPozisyonLabel(e.position),
      genderLabels[e.gender] || "",
      e.email || "",
      e.phone || "",
      departmentLabels[e.department] || e.department || "",
      educationLabels[e.education_level] || "",
      educationLabels[e.highest_education] || "",
      e.university || "",
      e.education_department || "",
      fmtDate(e.graduation_date),
      e.status === "pasif" ? "Pasif" : "Aktif",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calisan-raporu-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Çalışan Raporu
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{employees.length} çalışan listeleniyor</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="outline" className="gap-2 shrink-0">
            <FileDown className="w-4 h-4" />
            Excel İndir
          </Button>
          <Button onClick={handleExportCSV} className="gap-2 shrink-0">
            <FileDown className="w-4 h-4" />
            CSV İndir
          </Button>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs">
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Ad Soyad</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">TC No</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Doğum Tarihi</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">İşe Başlama</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Ünvan</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Cinsiyet</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">E-posta</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Telefon</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Eğitim</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">En Yüksek</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Üniversite</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Bölüm</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Mezuniyet</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Durum</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {employees.map((emp, i) => (
                <tr key={emp.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {emp.avatar_url ? (
                        <img src={emp.avatar_url} alt={emp.full_name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">
                          {emp.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {emp.full_name}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{emp.tc || "-"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(emp.birth_date)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(emp.hire_date)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{getPozisyonLabel(emp.position)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{genderLabels[emp.gender] || "-"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{emp.email || "-"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{emp.phone || "-"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{educationLabels[emp.education_level] || "-"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{educationLabels[emp.highest_education] || "-"}</td>
                  <td className="px-3 py-2">{emp.university || "-"}</td>
                  <td className="px-3 py-2">{emp.education_department || "-"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(emp.graduation_date)}</td>
                  <td className="px-3 py-2">
                    <Badge className={emp.status === "pasif" ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"} variant="outline">
                      {emp.status === "pasif" ? "Pasif" : "Aktif"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={14} className="px-4 py-12 text-center text-muted-foreground">Çalışan bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}