import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { FileSpreadsheet, FileText, X, ChevronDown, ChevronUp, Search, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

// ── Alan anahtarı → definitions kategorisi eşlemesi ───────────────────────────
// Bir alanın ham DB değeri (value) yerine definitions.label gösterilsin diye.
const FIELD_TO_CATEGORY = {
  department: "departman",
  position: "pozisyon",
  education_level: "egitim_seviyesi",
  activity_type: "aktivite_tipi",
  location: "lokasyon",
  contract_type: "sozlesme_turu",
  type: "bilet_tipi",
  customer_type: "musteri_tipi",
  customer_detail: "musteri_detayi",
  city: "sehir",
  district: "sehir",
  municipality_type: "belediye_tipi",
  population_range: "nufus_araligi",
};

// ── Modül tanımları ──────────────────────────────────────────────────────────
const MODULES = [
  {
    key: "employees",
    label: "Çalışanlar",
    icon: "👥",
    color: "bg-blue-50 border-blue-200 text-blue-700",
    activeColor: "bg-blue-600 text-white border-blue-600",
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
    groups: [
      {
        label: "Genel Bilgiler",
        fields: [
          { key: "full_name", label: "Ad Soyad" },
          { key: "email", label: "E-posta" },
          { key: "phone", label: "Telefon" },
          { key: "hire_date", label: "İşe Başlama" },
          { key: "status", label: "Durum" },
        ],
      },
      {
        label: "Pozisyon",
        fields: [
          { key: "department", label: "Departman" },
          { key: "position", label: "Pozisyon" },
          { key: "manager_name", label: "Yönetici" },
        ],
      },
      {
        label: "Kişisel Bilgiler",
        fields: [
          { key: "birth_date", label: "Doğum Tarihi" },
          { key: "gender", label: "Cinsiyet" },
          { key: "tc", label: "TC Kimlik No" },
        ],
      },
      {
        label: "Eğitim",
        fields: [
          { key: "education_level", label: "Eğitim Seviyesi" },
          { key: "university", label: "Üniversite" },
          { key: "education_department", label: "Bölüm" },
        ],
      },
    ],
  },
  {
    key: "activities",
    label: "Aktiviteler",
    icon: "📋",
    color: "bg-green-50 border-green-200 text-green-700",
    activeColor: "bg-green-600 text-white border-green-600",
    queryFn: () => flowApi.entities.Activity.list("-created_date", 500),
    groups: [
      {
        label: "Aktivite Bilgileri",
        fields: [
          { key: "employee_name", label: "Çalışan" },
          { key: "activity_type", label: "Aktivite Tipi" },
          { key: "date", label: "Tarih" },
          { key: "duration_minutes", label: "Süre (dk)" },
          { key: "status", label: "Durum" },
        ],
      },
      {
        label: "Müşteri",
        fields: [
          { key: "customer_name", label: "Müşteri" },
          { key: "contract_type", label: "Sözleşme Türü" },
        ],
      },
      {
        label: "Detay",
        fields: [
          { key: "notes", label: "Notlar" },
          { key: "location", label: "Lokasyon" },
        ],
      },
    ],
  },
  {
    key: "leave_requests",
    label: "İzinler",
    icon: "🏖️",
    color: "bg-orange-50 border-orange-200 text-orange-700",
    activeColor: "bg-orange-600 text-white border-orange-600",
    queryFn: () => flowApi.entities.LeaveRequest.list(),
    groups: [
      {
        label: "İzin Bilgileri",
        fields: [
          { key: "employee_full_name", label: "Çalışan" },
          { key: "leave_type", label: "İzin Türü" },
          { key: "start_date", label: "Başlangıç" },
          { key: "end_date", label: "Bitiş" },
          { key: "day_count", label: "Gün Sayısı" },
          { key: "status", label: "Durum" },
        ],
      },
      {
        label: "Onay",
        fields: [
          { key: "manager_approver_name", label: "Yönetici Onaylayan" },
          { key: "ik_approver_name", label: "IK Onaylayan" },
          { key: "reason", label: "Açıklama" },
        ],
      },
    ],
  },
  {
    key: "expense_reports",
    label: "Harcamalar",
    icon: "💳",
    color: "bg-amber-50 border-amber-200 text-amber-700",
    activeColor: "bg-amber-600 text-white border-amber-600",
    queryFn: () => flowApi.entities.ExpenseReport.list(),
    groups: [
      {
        label: "Harcama Bilgileri",
        fields: [
          { key: "employee_name", label: "Çalışan" },
          { key: "title", label: "Başlık" },
          { key: "total_amount", label: "Toplam Tutar" },
          { key: "currency", label: "Para Birimi" },
          { key: "status", label: "Durum" },
          { key: "created_date", label: "Oluşturma Tarihi" },
        ],
      },
      {
        label: "Proje / Müşteri",
        fields: [
          { key: "customer_name", label: "Müşteri" },
          { key: "project_name", label: "Proje" },
        ],
      },
    ],
  },
  {
    key: "tq_tickets",
    label: "TaskQube Biletleri",
    icon: "🎫",
    color: "bg-teal-50 border-teal-200 text-teal-700",
    activeColor: "bg-teal-600 text-white border-teal-600",
    queryFn: () => flowApi.entities.TQTicket.filter({ exclude_archived: 1 }),
    groups: [
      {
        label: "Bilet Bilgileri",
        fields: [
          { key: "ticket_number", label: "Bilet No" },
          { key: "title", label: "Başlık" },
          { key: "status", label: "Durum" },
          { key: "priority", label: "Öncelik" },
          { key: "type", label: "Tip" },
          { key: "created_date", label: "Oluşturma Tarihi" },
        ],
      },
      {
        label: "Atama",
        fields: [
          { key: "assigned_to_name", label: "Atanan" },
          { key: "customer_name", label: "Müşteri" },
          { key: "project_name", label: "Proje" },
          { key: "due_date", label: "Son Tarih" },
        ],
      },
    ],
  },
  {
    key: "customers",
    label: "Müşteriler",
    icon: "🏢",
    color: "bg-purple-50 border-purple-200 text-purple-700",
    activeColor: "bg-purple-600 text-white border-purple-600",
    queryFn: () => flowApi.entities.Customer.list(),
    groups: [
      {
        label: "Firma Bilgileri",
        fields: [
          { key: "company_name", label: "Firma Adı" },
          { key: "customer_type", label: "Müşteri Tipi" },
          { key: "status", label: "Durum" },
          { key: "city", label: "Şehir" },
          { key: "district", label: "İlçe" },
        ],
      },
      {
        label: "İletişim",
        fields: [
          { key: "contact_name", label: "İletişim Kişisi" },
          { key: "contact_email", label: "E-posta" },
          { key: "contact_phone", label: "Telefon" },
        ],
      },
      {
        label: "Detay",
        fields: [
          { key: "population_range", label: "Nüfus Aralığı" },
          { key: "municipality_type", label: "Belediye Tipi" },
          { key: "notes", label: "Notlar" },
        ],
      },
    ],
  },
];

function formatValue(val, key, labelMap = {}) {
  if (val === null || val === undefined || val === "") return "—";
  if (key.includes("date") || key.includes("_at")) {
    try { return format(new Date(val), "dd.MM.yyyy", { locale: tr }); } catch { return val; }
  }
  if (key === "duration_minutes") return `${Math.floor(val / 60)}sa ${val % 60}dk`;
  if (typeof val === "boolean") return val ? "Evet" : "Hayır";
  // Tanım (definitions) label eşlemesi: ham value yerine okunabilir label göster
  const cat = FIELD_TO_CATEGORY[key];
  if (cat && labelMap[cat] && labelMap[cat][val]) return labelMap[cat][val];
  return String(val);
}

export default function QuickReport() {
  const { user } = useAuth();
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const tableRef = useRef();

  const module = MODULES.find(m => m.key === selectedModule);

  // Tüm tanımları çek → value→label eşleme haritası kur
  const { data: definitions = [] } = useQuery({
    queryKey: ["definitions-all"],
    queryFn: () => flowApi.entities.Definition.list(),
  });

  const labelMap = useMemo(() => {
    const map = {};
    for (const d of definitions) {
      if (!d?.category) continue;
      if (!map[d.category]) map[d.category] = {};
      map[d.category][d.value] = d.label;
    }
    return map;
  }, [definitions]);

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ["quick-report", selectedModule],
    queryFn: () => module?.queryFn(),
    enabled: !!module,
  });

  // Filtrele
  const filteredData = useMemo(() => {
    if (!rawData.length) return [];
    return rawData.filter(row => {
      if (search) {
        const q = search.toLowerCase();
        return selectedFields.some(f => formatValue(row[f], f, labelMap).toLowerCase().includes(q));
      }
      return true;
    });
  }, [rawData, search, selectedFields, labelMap]);

  const toggleField = (fieldKey) => {
    setSelectedFields(prev =>
      prev.includes(fieldKey) ? prev.filter(f => f !== fieldKey) : [...prev, fieldKey]
    );
  };

  const toggleGroup = (groupLabel) => {
    setExpandedGroups(prev => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  const handleModuleSelect = (key) => {
    setSelectedModule(key);
    setSelectedFields([]);
    setSearch("");
  };

  // Excel export
  const exportCSV = () => {
    if (!selectedFields.length || !filteredData.length) return;
    const headers = selectedFields.map(f => {
      const field = module?.groups.flatMap(g => g.fields).find(x => x.key === f);
      return field?.label || f;
    });
    const rows = filteredData.map(row => selectedFields.map(f => formatValue(row[f], f, labelMap)));
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Kolon genişlikleri
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    // Başlık stili
    headers.forEach((_, i) => {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
      if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: "1e40af" } } };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, module?.label || "Rapor");
    XLSX.writeFile(wb, `${module?.label || "rapor"}_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  // PDF export
  const exportPDF = () => {
    if (!selectedFields.length || !filteredData.length) return;
    const headers = selectedFields.map(f => {
      const field = module?.groups.flatMap(g => g.fields).find(x => x.key === f);
      return field?.label || f;
    });
    const win = window.open("", "_blank");
    const rows = filteredData.map(row =>
      `<tr>${selectedFields.map(f => `<td style="border:1px solid #ddd;padding:6px 10px;font-size:12px">${formatValue(row[f], f, labelMap)}</td>`).join("")}</tr>`
    ).join("");
    win.document.write(`
      <html><head><title>${module?.label} Raporu</title>
      <style>body{font-family:Arial,sans-serif;padding:20px} table{border-collapse:collapse;width:100%} th{background:#1e40af;color:white;padding:8px 10px;text-align:left;font-size:12px} td{font-size:12px} tr:nth-child(even){background:#f8fafc} h2{color:#1e40af;margin-bottom:4px} p{color:#64748b;font-size:12px;margin:0 0 16px}</style>
      </head><body>
      <h2>${module?.label} Raporu</h2>
      <p>Oluşturulma: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: tr })} • ${filteredData.length} kayıt</p>
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const allFields = module?.groups.flatMap(g => g.fields) || [];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hızlı Raporlama</h1>
          <p className="text-sm text-muted-foreground mt-1">Modül seçin, alanları belirleyin, raporunuzu oluşturun</p>
        </div>
        {selectedFields.length > 0 && filteredData.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
              <FileSpreadsheet className="w-4 h-4 text-green-600" /> Excel / CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportPDF}>
              <FileText className="w-4 h-4 text-red-600" /> PDF
            </Button>
          </div>
        )}
      </div>

      {/* Modül seçimi */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {MODULES.map(m => (
          <button
            key={m.key}
            onClick={() => handleModuleSelect(m.key)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all font-medium text-xs ${
              selectedModule === m.key ? m.activeColor : m.color + " hover:opacity-80"
            }`}
          >
            <span className="text-2xl">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {module && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sol panel — alan seçici */}
          <div className="lg:col-span-1 bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alanları Seç</p>
              {selectedFields.length > 0 && (
                <button onClick={() => setSelectedFields([])} className="text-xs text-destructive hover:underline mt-1">
                  Temizle ({selectedFields.length})
                </button>
              )}
            </div>

            {/* Seçili alanlar — tag'ler */}
            {selectedFields.length > 0 && (
              <div className="px-3 py-2 border-b flex flex-wrap gap-1.5">
                {selectedFields.map(f => {
                  const field = allFields.find(x => x.key === f);
                  return (
                    <span key={f} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {field?.label || f}
                      <button onClick={() => toggleField(f)}><X className="w-3 h-3" /></button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Gruplar */}
            <div className="divide-y">
              {module.groups.map(group => (
                <div key={group.label}>
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/30 transition-colors"
                  >
                    {group.label}
                    {expandedGroups[group.label] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {expandedGroups[group.label] !== false && (
                    <div className="pb-1">
                      {group.fields.map(field => (
                        <label key={field.key} className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-muted/30 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedFields.includes(field.key)}
                            onChange={() => toggleField(field.key)}
                            className="rounded"
                          />
                          <span className="text-xs">{field.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sağ panel — önizleme */}
          <div className="lg:col-span-3 space-y-4">
            {selectedFields.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-16 text-center text-muted-foreground">
                <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Sol panelden alanları seçin</p>
                <p className="text-xs mt-1 opacity-70">Seçtiğiniz alanlara göre tablo oluşacak</p>
              </div>
            ) : (
              <>
                {/* Arama + bilgi */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Tabloda ara..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-9 rounded-xl"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground shrink-0">
                    {isLoading ? "Yükleniyor..." : `${filteredData.length} kayıt`}
                  </span>
                </div>

                {/* Tablo */}
                <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto" ref={tableRef}>
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b border-border/50">
                        <tr>
                          {selectedFields.map(f => {
                            const field = allFields.find(x => x.key === f);
                            return (
                              <th key={f} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs whitespace-nowrap">
                                {field?.label || f}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {isLoading ? (
                          <tr><td colSpan={selectedFields.length} className="text-center py-10 text-muted-foreground">Yükleniyor...</td></tr>
                        ) : filteredData.length === 0 ? (
                          <tr><td colSpan={selectedFields.length} className="text-center py-10 text-muted-foreground">Kayıt bulunamadı</td></tr>
                        ) : filteredData.slice(0, 100).map((row, i) => (
                          <tr key={row.id || i} className="hover:bg-muted/20 transition-colors">
                            {selectedFields.map(f => (
                              <td key={f} className="px-4 py-2.5 text-xs max-w-xs truncate">
                                {formatValue(row[f], f, labelMap)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredData.length > 100 && (
                    <div className="px-4 py-2 border-t text-xs text-muted-foreground text-center">
                      İlk 100 kayıt gösteriliyor. Export ile tüm veriyi alabilirsiniz.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
