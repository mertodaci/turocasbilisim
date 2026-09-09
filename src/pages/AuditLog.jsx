import { useState, useEffect } from "react";
import { ScrollText, ShieldCheck, UserCog } from "lucide-react";

const ACTION_CONFIG = {
  yetki_degisikligi: { label: "Yetki Değişikliği", icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  rol_degisikligi: { label: "Rol Değişikliği", icon: UserCog, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
};

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/audit-log?limit=300", { credentials: "include" });
        if (!res.ok) throw new Error("Yüklenemedi");
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmtDate = (d) => {
    if (!d) return "-";
    try {
      return new Date(d + (d.includes("Z") ? "" : "Z")).toLocaleString("tr-TR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return d; }
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.action === filter);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <ScrollText className="w-7 h-7 text-indigo-500" />
        <h1 className="text-2xl font-bold">Denetim Kaydı</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Yetki ve rol değişikliklerinin kaydı. Kim, neyi, ne zaman değiştirdi.
      </p>

      {/* Filtre */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          Tümü ({rows.length})
        </button>
        {Object.entries(ACTION_CONFIG).map(([key, cfg]) => {
          const count = rows.filter((r) => r.action === key).length;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === key ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Kayıt yok.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((row) => {
              const cfg = ACTION_CONFIG[row.action] || { label: row.action, icon: ScrollText, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" };
              const Icon = cfg.icon;
              return (
                <div key={row.id} className="px-4 py-3 hover:bg-muted/20">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-lg ${cfg.bg} ${cfg.border} border shrink-0`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-sm font-medium">{row.target}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-mono bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded">{row.old_value}</span>
                        {" → "}
                        <span className="font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{row.new_value}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {row.actor_email} · {fmtDate(row.created_date)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
