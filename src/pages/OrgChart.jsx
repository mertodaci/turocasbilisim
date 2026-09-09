import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Users, ChevronDown, ChevronRight, Building2 } from "lucide-react";

const POSITION_LABELS = {
  genel_mudur: "Genel Müdür",
  yonetici: "Yönetici",
  mudur: "Müdür",
  is_analisti_yoneticisi: "İş Analisti Yöneticisi",
  is_analisti: "İş Analisti",
  proje_yoneticisi: "Proje Yöneticisi",
  yazilim_gelistirici: "Yazılım Geliştirici",
  muhasebe_sorumlusu: "Muhasebe Sorumlusu",
  muhasebeci: "Muhasebeci",
  ofis_asistani: "Ofis Asistanı",
  mutfak_gorevlisi: "Mutfak Görevlisi",
  zabita: "Zabıta",
  tekniker: "Tekniker",
  ux_tasarimci: "UX Tasarımcı",
  insan_kaynaklari: "İnsan Kaynakları",
  satis_temsilcisi: "Satış Temsilcisi",
};

const DEPT_COLORS = {
  sirket_yonetimi: { bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-300 dark:border-purple-700", dot: "bg-purple-500", text: "text-purple-700 dark:text-purple-300" },
  merkez_analiz_ekibi: { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-300 dark:border-blue-700", dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-300" },
  yazilim: { bg: "bg-teal-100 dark:bg-teal-900/30", border: "border-teal-300 dark:border-teal-700", dot: "bg-teal-500", text: "text-teal-700 dark:text-teal-300" },
  insan_kaynaklari: { bg: "bg-pink-100 dark:bg-pink-900/30", border: "border-pink-300 dark:border-pink-700", dot: "bg-pink-500", text: "text-pink-700 dark:text-pink-300" },
  muhasebe: { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-300 dark:border-amber-700", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300" },
  default: { bg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-300 dark:border-slate-600", dot: "bg-slate-400", text: "text-slate-600 dark:text-slate-400" },
};

function getInitials(name) {
  return name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function EmployeeCard({ employee, isRoot = false, isExpanded, hasChildren, onToggle, childCount }) {
  const colors = DEPT_COLORS[employee.department] || DEPT_COLORS.default;
  const posLabel = POSITION_LABELS[employee.position] || (employee.position ? employee.position.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '—');

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative group cursor-pointer transition-all duration-200 ${
          isRoot ? "w-52" : "w-44"
        }`}
        onClick={hasChildren ? onToggle : undefined}
      >
        {/* Kart */}
        <div className={`rounded-2xl border-2 ${colors.border} ${colors.bg} p-4 text-center shadow-sm hover:shadow-lg transition-all duration-200 ${hasChildren ? "hover:-translate-y-1" : ""}`}>
          {/* Avatar */}
          <div className="flex justify-center mb-3">
            {employee.avatar_url ? (
              <img
                src={employee.avatar_url}
                alt={employee.full_name}
                className={`rounded-full object-cover ring-4 ring-white dark:ring-gray-800 shadow-md ${isRoot ? "w-20 h-20" : "w-16 h-16"}`}
              />
            ) : (
              <div className={`rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800 shadow-md font-bold text-white ${isRoot ? "w-20 h-20 text-2xl" : "w-16 h-16 text-xl"} ${colors.dot}`}>
                {getInitials(employee.full_name)}
              </div>
            )}
          </div>

          {/* İsim */}
          <p className={`font-bold text-foreground leading-tight ${isRoot ? "text-base" : "text-sm"}`}>
            {employee.full_name}
          </p>

          {/* Pozisyon */}
          <p className={`mt-1 text-xs font-medium ${colors.text}`}>
            {posLabel}
          </p>

          {/* Çalışan sayısı badge */}
          {hasChildren && (
            <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
              <Users className="w-3 h-3" />
              {childCount} kişi
              {isExpanded
                ? <ChevronDown className="w-3 h-3" />
                : <ChevronRight className="w-3 h-3" />
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrgNode({ employee, employees, level = 0, expandedIds, onToggle }) {
  const children = employees.filter(e => e.manager_id === employee.id);
  const isExpanded = expandedIds.has(employee.id);
  const hasChildren = children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <EmployeeCard
        employee={employee}
        isRoot={level === 0}
        isExpanded={isExpanded}
        hasChildren={hasChildren}
        childCount={children.length}
        onToggle={() => onToggle(employee.id)}
      />

      {hasChildren && isExpanded && (
        <div className="flex flex-col items-center mt-0">
          {/* Dikey çizgi aşağı */}
          <div className="w-0.5 h-8 bg-border" />

          {/* Yatay çizgi + alt nodlar */}
          <div className="relative flex items-start gap-0">
            {children.length > 1 && (
              <div
                className="absolute top-0 bg-border h-0.5"
                style={{
                  left: `calc(50% / ${children.length})`,
                  right: `calc(50% / ${children.length})`,
                }}
              />
            )}
            {children.map((child, i) => (
              <div key={child.id} className="flex flex-col items-center px-3">
                {/* Dikey çizgi yukarı */}
                <div className="w-0.5 h-8 bg-border" />
                <OrgNode
                  employee={child}
                  employees={employees}
                  level={level + 1}
                  expandedIds={expandedIds}
                  onToggle={onToggle}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgChart() {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [search, setSearch] = useState("");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees-org"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });

  // Kök nodları bul (manager_id boş olanlar)
  const roots = useMemo(() =>
    employees.filter(e => !e.manager_id || e.manager_id === ""),
    [employees]
  );

  // Arama sonuçları
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return employees.filter(e =>
      e.full_name?.toLowerCase().includes(q) ||
      e.position?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(employees.map(e => e.id)));
  const collapseAll = () => setExpandedIds(new Set());

  // Departman istatistikleri
  const deptStats = useMemo(() => {
    const stats = {};
    employees.forEach(e => {
      const d = e.department || "Diğer";
      stats[d] = (stats[d] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [employees]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full">
      {/* Başlık */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Organizasyon Şeması
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{employees.length} aktif çalışan</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Çalışan ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring w-48"
          />
          <button onClick={expandAll} className="text-xs px-3 py-2 rounded-xl border border-border hover:bg-muted transition-colors">Tümünü Aç</button>
          <button onClick={collapseAll} className="text-xs px-3 py-2 rounded-xl border border-border hover:bg-muted transition-colors">Tümünü Kapat</button>
        </div>
      </div>

      {/* Departman özeti */}
      <div className="flex flex-wrap gap-2">
        {deptStats.map(([dept, count]) => {
          const colors = DEPT_COLORS[dept] || DEPT_COLORS.default;
          return (
            <div key={dept} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${colors.bg} ${colors.border} ${colors.text}`}>
              <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
              {dept.replace(/_/g, " ")} ({count})
            </div>
          );
        })}
      </div>

      {/* Arama sonuçları */}
      {search.trim() && (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3">{searchResults.length} sonuç</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {searchResults.map(e => {
              const colors = DEPT_COLORS[e.department] || DEPT_COLORS.default;
              return (
                <div key={e.id} className={`flex items-center gap-3 p-3 rounded-xl border ${colors.border} ${colors.bg}`}>
                  {e.avatar_url ? (
                    <img src={e.avatar_url} alt={e.full_name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${colors.dot}`}>
                      {getInitials(e.full_name)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{e.full_name}</p>
                    <p className={`text-xs ${colors.text}`}>{POSITION_LABELS[e.position] || e.position}</p>
                    {e.manager_name && <p className="text-xs text-muted-foreground">→ {e.manager_name}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Org tree */}
      {!search.trim() && (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-8 overflow-x-auto">
          <div className="flex gap-16 justify-center min-w-max">
            {roots.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Çalışan bulunamadı</p>
              </div>
            ) : (
              roots.map(root => (
                <OrgNode
                  key={root.id}
                  employee={root}
                  employees={employees}
                  level={0}
                  expandedIds={expandedIds}
                  onToggle={toggleExpand}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
