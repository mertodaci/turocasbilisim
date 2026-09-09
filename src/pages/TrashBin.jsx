import { useState, useEffect } from "react";
import { Trash2, RotateCcw, Building2, Ticket, FolderKanban, Users, LayoutDashboard } from "lucide-react";

const TABLES = [
  { key: "customers", label: "Müşteriler", icon: Building2, nameField: "company_name" },
  { key: "job_tickets", label: "Biletler", icon: Ticket, nameField: "title" },
  { key: "job_projects", label: "Projeler", icon: FolderKanban, nameField: "name" },
  { key: "job_kanban_boards", label: "Panolar", icon: LayoutDashboard, nameField: "name" },
  { key: "employees", label: "Çalışanlar", icon: Users, nameField: "full_name" },
];

export default function TrashBin() {
  const [active, setActive] = useState("customers");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(null);

  const current = TABLES.find((t) => t.key === active);

  const load = async (table) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trash/${table}`, { credentials: "include" });
      if (!res.ok) throw new Error("Yüklenemedi");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(active);
  }, [active]);

  const restore = async (id) => {
    setRestoring(id);
    try {
      const res = await fetch(`/api/trash/${active}/${id}/restore`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Geri getirilemedi");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert("Geri getirme başarısız: " + e.message);
    } finally {
      setRestoring(null);
    }
  };

  const fmtDate = (d) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleString("tr-TR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return d; }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Trash2 className="w-7 h-7 text-rose-500" />
        <h1 className="text-2xl font-bold">Çöp Kutusu</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Silinen kayıtlar burada tutulur ve geri getirilebilir.
      </p>

      {/* Tablo sekmeleri */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {TABLES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                active === t.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Yükleniyor...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <Trash2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {current.label} çöp kutusu boş.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {row[current.nameField] || "(isimsiz)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Silinme: {fmtDate(row.updated_date)}
                  </p>
                </div>
                <button
                  onClick={() => restore(row.id)}
                  disabled={restoring === row.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {restoring === row.id ? "Getiriliyor..." : "Geri Getir"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
