import { useState, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  Upload, LogIn, LogOut, Clock, AlertTriangle, Search, Calendar, FileSpreadsheet, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");

// Kimlik dogrulama httpOnly cookie ile yapiliyor; credentials:"include" yeterli.
async function pdksFetch(path, opts = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...opts,
    headers: { ...(opts.body ? { "Content-Type": "application/json" } : {}), ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `İstek başarısız (${res.status})`);
  return data;
}

// "2026-08-06 20:08:03" -> Date
function parseEventTime(s) {
  if (!s) return null;
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}
function fmtTime(s) {
  const d = parseEventTime(s);
  if (!d) return "—";
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtDateOnly(s) {
  if (!s) return "";
  return s.slice(0, 10); // YYYY-MM-DD
}
function fmtDuration(ms) {
  if (ms == null || ms < 0) return "—";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h} sa ${m} dk`;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function PersonnelMovements() {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState("rapor"); // rapor | ham
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [employeeFilter, setEmployeeFilter] = useState(""); // "" = tumu
  const [deptFilter, setDeptFilter] = useState(""); // "" = tumu
  const [search, setSearch] = useState("");
  const [dirFilter, setDirFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["card-logs"],
    queryFn: () => flowApi.entities.CardLog.list(),
    refetchInterval: 5000, // PDKS canli sync ile yeni kayitlar otomatik gorunsun
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-cardmap"],
    queryFn: () => flowApi.entities.Employee.list(),
  });
  const { data: departmentDefs = [] } = useQuery({
    queryKey: ["definitions", "departman"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "departman" }),
  });
  const getDeptLabel = (val) => departmentDefs.find((d) => d.value === val)?.label || val || "-";

  // Kart Yonetimi'ndeki kayitlar (uid -> employee_id) -- Calisanlar.card_uid ile
  // senkron kopmasi ihtimaline karsi YEDEK eslesme kaynagi.
  const { data: pdksCards = [] } = useQuery({
    queryKey: ["pdks-cards-for-match"],
    queryFn: async () => {
      try { return await pdksFetch("/api/pdks/cards"); } catch { return []; }
    },
    staleTime: 30000,
    retry: false,
  });
  const pdksCardEmpMap = useMemo(() => {
    const m = {};
    for (const c of pdksCards) {
      const key = String(c.uid || "").trim().toUpperCase();
      if (key && c.employee_id) m[key] = c.employee_id;
    }
    return m;
  }, [pdksCards]);
  const empById = useMemo(() => {
    const m = {};
    for (const e of employees) m[e.id] = e;
    return m;
  }, [employees]);

  // card_uid -> calisan (canli eslesme; kart ID sonradan girilse de gecmis eslesir)
  const empByCard = useMemo(() => {
    const m = {};
    for (const e of employees) {
      const key = String(e.card_uid || "").trim().toUpperCase();
      if (key) m[key] = e;
    }
    return m;
  }, [employees]);

  // Calisan secim listesi (isim + departman ile)
  const employeeOptions = useMemo(() => {
    const sorted = [...employees].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "tr"));
    const opts = sorted.map((e) => ({
      value: e.id,
      label: e.full_name + (e.department ? ` (${getDeptLabel(e.department)})` : ""),
    }));
    opts.unshift({ value: "", label: "Tüm çalışanlar" });
    return opts;
  }, [employees, departmentDefs]);

  // Departman secim listesi
  const departmentOptions = useMemo(() => {
    const uniq = [...new Set(employees.map((e) => e.department).filter(Boolean))];
    const opts = uniq
      .map((d) => ({ value: d, label: getDeptLabel(d) }))
      .sort((a, b) => a.label.localeCompare(b.label, "tr"));
    opts.unshift({ value: "", label: "Tüm departmanlar" });
    return opts;
  }, [employees, departmentDefs]);

  // Loglari canli eslesme ile zenginlestir (calisan + departman).
  // Once Calisanlar.card_uid'e bakilir; bulunamazsa Kart Yonetimi'ndeki
  // pdks_cards.employee_id YEDEK kaynak olarak kullanilir (iki taraf
  // senkron kopsa bile hareketler "eslesmeyen" gorunmesin diye).
  const logsMatched = useMemo(() => logs.map((l) => {
    const uidKey = String(l.card_uid || "").trim().toUpperCase();
    let emp = empByCard[uidKey];
    if (!emp) {
      const fallbackEmpId = pdksCardEmpMap[uidKey];
      if (fallbackEmpId) emp = empById[fallbackEmpId];
    }
    return emp
      ? { ...l, employee_id: emp.id, employee_name: emp.full_name, employee_department: emp.department || null }
      : { ...l, employee_id: null, employee_name: null, employee_department: null };
  }), [logs, empByCard, pdksCardEmpMap, empById]);

  // Secili tarih araligi + calisan + departman filtresine gore loglar
  const dayLogs = useMemo(() => {
    return logsMatched
      .filter((l) => {
        const d = fmtDateOnly(l.event_time);
        return d && d >= startDate && d <= endDate;
      })
      .filter((l) => (employeeFilter ? l.employee_id === employeeFilter : true))
      .filter((l) => (deptFilter ? l.employee_department === deptFilter : true));
  }, [logsMatched, startDate, endDate, employeeFilter, deptFilter]);

  // Ham liste filtreleri (yon + serbest arama)
  const filteredRaw = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dayLogs
      .filter((l) => (dirFilter === "all" ? true : l.direction === dirFilter))
      .filter((l) => {
        if (!q) return true;
        return (
          (l.person_name || "").toLowerCase().includes(q) ||
          (l.employee_name || "").toLowerCase().includes(q) ||
          (l.card_uid || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.event_time < b.event_time ? 1 : -1));
  }, [dayLogs, dirFilter, search]);

  // Gunluk rapor: kisi + gun basina ilk giris / son cikis / toplam sure
  // (tarih araligi birden fazla gunu kapsayabildigi icin gun bazinda ayri satirlar)
  const dailyReport = useMemo(() => {
    const byKey = {};
    for (const l of dayLogs) {
      const day = fmtDateOnly(l.event_time);
      const personKey = l.employee_id || `card:${l.card_uid}`;
      const key = `${personKey}__${day}`;
      if (!byKey[key]) {
        byKey[key] = {
          key,
          date: day,
          name: l.employee_name || l.person_name || l.card_uid,
          card_uid: l.card_uid,
          matched: !!l.employee_id,
          girisler: [],
          cikislar: [],
        };
      }
      const d = parseEventTime(l.event_time);
      if (!d) continue;
      if (l.direction === "GIRIS") byKey[key].girisler.push(d);
      else if (l.direction === "CIKIS") byKey[key].cikislar.push(d);
    }
    return Object.values(byKey)
      .map((p) => {
        const ilkGiris = p.girisler.length ? new Date(Math.min(...p.girisler)) : null;
        const sonCikis = p.cikislar.length ? new Date(Math.max(...p.cikislar)) : null;
        const sure = ilkGiris && sonCikis ? sonCikis - ilkGiris : null;
        return { ...p, ilkGiris, sonCikis, sure };
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1; // yeni tarih once
        return (a.name || "").localeCompare(b.name || "", "tr");
      });
  }, [dayLogs]);

  // Ozet sayaclar (secili filtreler)
  const girisCount = dayLogs.filter((l) => l.direction === "GIRIS").length;
  const cikisCount = dayLogs.filter((l) => l.direction === "CIKIS").length;
  const eslesmeyenCount = dayLogs.filter((l) => !l.employee_id).length;

  const handleUploadClick = () => fileRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const res = await fetch(`${BASE_URL}/api/card-logs/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İçe aktarma başarısız");
      toast.success(
        `İçe aktarıldı: ${data.eklenen} yeni, ${data.atlanan} tekrar, ${data.eslesmeyen} eşleşmeyen (toplam ${data.toplam})`
      );
      queryClient.invalidateQueries({ queryKey: ["card-logs"] });
    } catch (err) {
      toast.error(err.message || "İçe aktarma hatası");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = dailyReport.map((p) => ({
      "Tarih": p.date,
      "Çalışan": p.name,
      "Kart ID": p.card_uid,
      "Eşleşme": p.matched ? "Evet" : "Hayır",
      "İlk Giriş": p.ilkGiris ? p.ilkGiris.toLocaleTimeString("tr-TR") : "—",
      "Son Çıkış": p.sonCikis ? p.sonCikis.toLocaleTimeString("tr-TR") : "—",
      "Toplam Süre": fmtDuration(p.sure),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gunluk Rapor");
    XLSX.writeFile(wb, `personel-hareketleri-${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Başlık */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Personel Hareketleri</h1>
          <p className="text-sm text-muted-foreground">Kartlı geçiş sistemi giriş/çıkış kayıtları</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/kart-yonetimi">
            <Button variant="outline">
              <CreditCard className="w-4 h-4 mr-1.5" /> Kart Yönetimi
            </Button>
          </Link>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          <Button onClick={handleUploadClick} disabled={uploading}>
            <Upload className="w-4 h-4 mr-1.5" />
            {uploading ? "Yükleniyor..." : "CSV Yükle"}
          </Button>
        </div>
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <LogIn className="w-4 h-4" />
            <span className="text-sm font-medium">Giriş</span>
          </div>
          <p className="text-3xl font-bold">{girisCount}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Çıkış</span>
          </div>
          <p className="text-3xl font-bold">{cikisCount}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Eşleşmeyen kart</span>
          </div>
          <p className="text-3xl font-bold">{eslesmeyenCount}</p>
        </div>
      </div>

      {/* Kontrol çubuğu */}
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground mb-2" />
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-muted-foreground">Başlangıç</label>
            <Input type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} className="w-auto" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-muted-foreground">Bitiş</label>
            <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="w-auto" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted-foreground">Çalışan</label>
          <SearchableSelect
            value={employeeFilter}
            onChange={setEmployeeFilter}
            options={employeeOptions}
            placeholder="Tüm çalışanlar"
            searchPlaceholder="Çalışan ara..."
            emptyText="Çalışan bulunamadı"
            sort={false}
            className="w-56"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted-foreground">Departman</label>
          <SearchableSelect
            value={deptFilter}
            onChange={setDeptFilter}
            options={departmentOptions}
            placeholder="Tüm departmanlar"
            searchPlaceholder="Departman ara..."
            emptyText="Departman bulunamadı"
            sort={false}
            className="w-48"
          />
        </div>
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab("rapor")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === "rapor" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
          >
            Günlük Rapor
          </button>
          <button
            onClick={() => setTab("ham")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === "ham" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
          >
            Ham Hareketler
          </button>
        </div>
        {tab === "rapor" && dailyReport.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportExcel} className="ml-auto">
            <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Excel
          </Button>
        )}
      </div>

      {/* İçerik */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Yükleniyor...</div>
      ) : dayLogs.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
          <Clock className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Bu tarih aralığında (ve seçili filtrelerde) hareket kaydı yok.</p>
          <p className="text-xs text-muted-foreground mt-1">CSV yükleyerek kayıtları içe aktarın.</p>
        </div>
      ) : tab === "rapor" ? (
        /* GÜNLÜK RAPOR */
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tarih</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Çalışan</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Kart ID</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">İlk Giriş</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Son Çıkış</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Toplam Süre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {dailyReport.map((p) => (
                <tr key={p.key} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground">{p.date}</td>
                  <td className="px-4 py-3 font-medium">
                    {p.name}
                    {!p.matched && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 align-middle">eşleşmeyen</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.card_uid}</td>
                  <td className="px-4 py-3 text-emerald-600">{p.ilkGiris ? p.ilkGiris.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td className="px-4 py-3 text-orange-600">{p.sonCikis ? p.sonCikis.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td className="px-4 py-3 font-semibold">{fmtDuration(p.sure)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* HAM HAREKETLER */
        <>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="İsim veya kart ID ara..." className="pl-9" />
            </div>
            <Select value={dirFilter} onValueChange={setDirFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm hareketler</SelectItem>
                <SelectItem value="GIRIS">Sadece Giriş</SelectItem>
                <SelectItem value="CIKIS">Sadece Çıkış</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tarih</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Yön</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Çalışan</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Kart ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Kart İsmi</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Saat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredRaw.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground">{fmtDateOnly(l.event_time)}</td>
                    <td className="px-4 py-3">
                      {l.direction === "GIRIS" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><LogIn className="w-3 h-3" /> Giriş</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600"><LogOut className="w-3 h-3" /> Çıkış</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {l.employee_name || <span className="text-red-600">— eşleşmeyen —</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{l.card_uid}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.person_name}</td>
                    <td className="px-4 py-3">{fmtTime(l.event_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
