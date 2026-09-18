import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Ban } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Clock, Receipt, User, Eye, Search, Download, Printer, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import ExpenseApprovalDialog from "@/components/expenses/ExpenseApprovalDialog";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import * as XLSX from "xlsx";
import { raporYazdir } from "@/lib/raporYazdir";
import { para } from "@/lib/ikFormat";



const STATUS_CONFIG = {
  taslak: { label: "Taslak", color: "bg-gray-100 text-gray-700" },
  yonetici_onayi_bekliyor: { label: "Yönetici Onayı Bekliyor", color: "bg-blue-100 text-blue-800" },
  ik_onayi_bekliyor: { label: "IK Onayı Bekliyor", color: "bg-orange-100 text-orange-800" },
  onaylandi: { label: "Onaylandı", color: "bg-green-100 text-green-800" },
  reddedildi: { label: "Reddedildi", color: "bg-red-100 text-red-800" },
  iptal_edildi: { label: "İptal Edildi", color: "bg-gray-100 text-gray-600" },
};

export default function IKExpenseRequests() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState(null);
  const [toCancel, setToCancel] = useState(null);
  const canCancelExpense = user?.role === "admin" || user?.role === "ik";
  const cancelExpenseMutation = useMutation({
    mutationFn: (report) =>
      flowApi.entities.ExpenseReport.update(report.id, {
        status: "iptal_edildi",
        approval_note: "IK tarafindan iptal edildi",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-expense-reports"] });
      setToCancel(null);
    },
  });
  const [filterStatus, setFilterStatus] = useState("tumu");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]); // [] = tümü
  const [empSearch, setEmpSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["all-expense-reports"],
    queryFn: () => flowApi.entities.ExpenseReport.list(),
  });
  const { data: allItems = [] } = useQuery({
    queryKey: ["expense-items-all-ik"],
    queryFn: () => flowApi.entities.ExpenseItem.list(),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["ik_personel_full"],
    queryFn: () => flowApi.entities.Employee.list("full_name", 8000),
  });
  const totalsByReport = {};
  for (const it of allItems) {
    const sum = (it.accommodation||0)+(it.transport||0)+(it.fuel||0)+(it.meal||0)+(it.other||0)+(it.amount||0);
    totalsByReport[it.report_id] = (totalsByReport[it.report_id] || 0) + sum;
  }
  const fmtAyYil = (v) => {
    if (!v) return "—";
    try { return format(new Date(v.length === 7 ? v + "-01" : v), "MMMM yyyy", { locale: tr }); }
    catch { return v; }
  };

  const filtered = reports.filter((r) => {
    const statusMatch = filterStatus === "tumu" || r.status === filterStatus;
    const searchMatch =
      searchQuery === "" ||
      r.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employee_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const empMatch = selectedEmployeeIds.length === 0 || selectedEmployeeIds.includes(r.employee_id);
    const total = totalsByReport[r.id] || 0;
    const dateMatch =
      (!dateFrom || (r.trip_end_date || r.trip_start_date || "") >= dateFrom) &&
      (!dateTo || (r.trip_start_date || r.trip_end_date || "") <= dateTo);
    const amountMatch =
      (amountMin === "" || total >= Number(amountMin)) &&
      (amountMax === "" || total <= Number(amountMax));
    return statusMatch && searchMatch && empMatch && dateMatch && amountMatch;
  });

  const fmtToplam = (r) => (totalsByReport[r.id] || 0);
  const KOLONLAR = [
    { key: "employee_name", label: "Çalışan" },
    { key: "employee_email", label: "E-posta" },
    { key: "project_name", label: "Proje / Müşteri" },
    { key: "tarih_araligi", label: "Tarih Aralığı" },
    { key: "advance_amount", label: "Avans", align: "right" },
    { key: "toplam", label: "Toplam Harcama", align: "right" },
    { key: "durum", label: "Durum" },
  ];
  const toRow = (r) => ({
    employee_name: r.employee_name || "",
    employee_email: r.employee_email || "",
    project_name: r.project_name || "—",
    tarih_araligi: `${fmtAyYil(r.trip_start_date)}${r.trip_end_date ? " → " + fmtAyYil(r.trip_end_date) : ""}`,
    advance_amount: r.advance_amount || 0,
    toplam: fmtToplam(r),
    durum: (STATUS_CONFIG[r.status] || STATUS_CONFIG.taslak).label,
  });

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((r) => Object.fromEntries(KOLONLAR.map((k) => [k.label, toRow(r)[k.key]])))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Harcamalar");
    XLSX.writeFile(wb, `harcama-yonetimi-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };
  const handleExportPdf = () => {
    raporYazdir({
      baslik: "Harcama Yönetimi (IK)",
      altBaslik: `${filtered.length} kayıt`,
      kolonlar: KOLONLAR,
      satirlar: filtered.map((r) => {
        const row = toRow(r);
        return { ...row, advance_amount: para(row.advance_amount), toplam: para(row.toplam) };
      }),
    });
  };

  const filteredEmployeeOptions = employees.filter((e) =>
    !empSearch || e.full_name?.toLowerCase().includes(empSearch.toLowerCase())
  );
  const toggleEmployee = (id) => {
    setSelectedEmployeeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setCurrentPage(1);
  };

  const statusCounts = {
    ik_onayi_bekliyor: reports.filter((r) => r.status === "ik_onayi_bekliyor").length,
    yonetici_onayi_bekliyor: reports.filter((r) => r.status === "yonetici_onayi_bekliyor").length,
    onaylandi: reports.filter((r) => r.status === "onaylandi").length,
    reddedildi: reports.filter((r) => r.status === "reddedildi").length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Harcama Yönetimi (IK)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tüm çalışan harcama raporlarını görüntüleyin ve yönetin.
        </p>
      </div>

      {/* İstatistik Kartları */}
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

      {/* Filtreler */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "tumu", label: "Tümü" },
            { key: "yonetici_onayi_bekliyor", label: "Yönetici Onayı Bekleyen" },
            { key: "ik_onayi_bekliyor", label: "IK Onayı Bekleyen" },
            { key: "onaylandi", label: "Onaylandı" },
            { key: "reddedildi", label: "Reddedildi" },
            { key: "iptal_edildi", label: "İptal Edildi" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setFilterStatus(key); setCurrentPage(1); }}
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
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Çalışan ara..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-10"
          />
        </div>

        <DropdownMenu onOpenChange={(v) => !v && setEmpSearch("")}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {selectedEmployeeIds.length > 0 ? `${selectedEmployeeIds.length} çalışan seçili` : "Çalışan Seç"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
            <DropdownMenuLabel>Çalışan Filtrele</DropdownMenuLabel>
            <div className="px-2 pb-1.5">
              <Input
                placeholder="Ara..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="h-8 text-xs"
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <DropdownMenuSeparator />
            {selectedEmployeeIds.length > 0 && (
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelectedEmployeeIds([]); setCurrentPage(1); }}>
                Temizle
              </DropdownMenuItem>
            )}
            {filteredEmployeeOptions.slice(0, 200).map((emp) => (
              <DropdownMenuCheckboxItem
                key={emp.id}
                checked={selectedEmployeeIds.includes(emp.id)}
                onCheckedChange={() => toggleEmployee(emp.id)}
                onSelect={(e) => e.preventDefault()}
              >
                {emp.full_name}
              </DropdownMenuCheckboxItem>
            ))}
            {filteredEmployeeOptions.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">Çalışan bulunamadı</p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1.5">
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} className="w-36 h-9" />
          <span className="text-muted-foreground text-sm">→</span>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} className="w-36 h-9" />
        </div>

        <div className="flex items-center gap-1.5">
          <Input type="number" placeholder="Min ₺" value={amountMin} onChange={(e) => { setAmountMin(e.target.value); setCurrentPage(1); }} className="w-24 h-9" />
          <span className="text-muted-foreground text-sm">–</span>
          <Input type="number" placeholder="Max ₺" value={amountMax} onChange={(e) => { setAmountMax(e.target.value); setCurrentPage(1); }} className="w-24 h-9" />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filtered.length === 0} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Excel İndir
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={filtered.length === 0} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> PDF İndir
          </Button>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <Receipt className="w-8 h-8 opacity-40" />
            <p>Kayıt bulunamadı.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Çalışan</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Proje / Müşteri</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tarih Aralığı</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Avans</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Toplam Harcama</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((r, i) => {
                const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.taslak;
                return (
                  <tr key={r.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium">{r.employee_name}</p>
                          <p className="text-xs text-muted-foreground">{r.employee_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.project_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {fmtAyYil(r.trip_start_date)}
                      {r.trip_end_date && ` → ${fmtAyYil(r.trip_end_date)}`}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {para(r.advance_amount || 0)}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {para(totalsByReport[r.id] || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        <Clock className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(r.status === "yonetici_onayi_bekliyor" || r.status === "ik_onayi_bekliyor") && (
                          <Button size="sm" variant="outline" onClick={() => setSelectedReport(r)}>
                            <Eye className="w-3 h-3 mr-1" />
                            İncele
                          </Button>
                        )}
                        {canCancelExpense && r.status !== "iptal_edildi" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setToCancel(r)}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            İptal Et
                          </Button>
                        )}
                      </div>
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

      {selectedReport && (
        <ExpenseApprovalDialog
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onSuccess={() => {
            setSelectedReport(null);
            queryClient.invalidateQueries({ queryKey: ["all-expense-reports"] });
          }}
        />
      )}

      <AlertDialog open={!!toCancel} onOpenChange={(v) => !v && setToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Harcama talebi iptal edilsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{toCancel?.employee_name || "-"}</strong> adlı çalışanın
              {toCancel?.project_name ? ` "${toCancel.project_name}" ` : " "}
              harcama talebi <strong>İptal Edildi</strong> durumuna alınacak.
              Kayıt silinmez, geçmişte görünür.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelExpenseMutation.mutate(toCancel)}
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
