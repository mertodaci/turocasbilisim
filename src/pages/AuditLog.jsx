import { useState, useEffect, useMemo } from "react";
import { ScrollText, ShieldCheck, UserCog, Plus, Pencil, Trash2, RotateCcw } from "lucide-react";

// Eski, sonek taşımayan özel aksiyonlar — sabit etiket/renk.
const SPECIAL_ACTIONS = {
  yetki_degisikligi: { label: "Yetki Değişikliği", icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  rol_degisikligi: { label: "Rol Değişikliği", icon: UserCog, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  bordro_donem_kapatildi: { label: "Bordro Dönemi Kapatıldı", icon: ScrollText, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
  bordro_donem_geri_acildi: { label: "Bordro Dönemi Geri Açıldı", icon: ScrollText, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  bordro_donem_onay_geri_alindi: { label: "Bordro Onayı Geri Alındı", icon: ScrollText, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
};
// Generic aksiyonlar (<tablo>_olusturuldu/guncellendi/silindi/geri_alindi)
// sonek bazlı renk/ikon alır — 25 tablo × 4 aksiyon için ayrı ayrı sabit
// tanımlamak yerine tek kural.
const SUFFIX_CONFIG = {
  olusturuldu: { label: "Oluşturuldu", icon: Plus, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  guncellendi: { label: "Güncellendi", icon: Pencil, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  silindi: { label: "Silindi", icon: Trash2, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
  geri_alindi: { label: "Geri Alındı", icon: RotateCcw, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
};
const TABLE_LABELS = {
  customers: "Müşteriler", job_tickets: "Biletler", job_projects: "Projeler",
  job_kanban_boards: "Panolar", employees: "Çalışanlar", users: "Kullanıcılar",
  role_permissions: "Yetkilendirme",
  stok_urunler: "Ürünler", stok_depolar: "Depolar", stok_raflar: "Raflar",
  stok_sahalar: "Sahalar", stok_fisler: "Stok Fişleri", stok_sayimlar: "Sayımlar",
  stok_personeller: "Stok Personelleri", stok_demirbaslar: "Demirbaşlar",
  stok_rezervasyonlar: "Rezervasyonlar",
  ik_subeler: "Şubeler", ik_bolumler: "Bölümler", ik_vardiyalar: "Vardiyalar",
  ik_vardiya_planlari: "Vardiya Planları", ik_mesai_kayitlari: "Mesai Kayıtları",
  ik_kesinti_planlari: "Kesinti Planları", ik_kesintiler: "Kesintiler",
  ik_ic_borclar: "İç Borçlar", ik_personel_masraf: "Personel Masrafları",
  ik_ozluk_evraklari: "Özlük Evrakları", ik_tutanaklar: "Tutanaklar",
  ik_izin_evraklari: "İzin Evrakları", ik_bordro_satirlari: "Bordro Satırları",
};
const tableLabel = (key) => TABLE_LABELS[key] || key;
const actionConfig = (action) => {
  if (SPECIAL_ACTIONS[action]) return SPECIAL_ACTIONS[action];
  const suffix = Object.keys(SUFFIX_CONFIG).find((s) => action.endsWith(`_${s}`));
  if (suffix) return SUFFIX_CONFIG[suffix];
  return { label: action, icon: ScrollText, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" };
};
// old_value/new_value artık JSON (tüm satır ya da değişen alanların diff'i)
// olabilir — okunur bir anahtar:değer listesine çevrilir, JSON değilse ham
// metin olarak kalır (eski yetki/rol kayıtları hâlâ düz string).
function renderValue(raw) {
  if (raw == null) return <span className="text-muted-foreground/50">—</span>;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") {
      const entries = Object.entries(obj);
      if (entries.length === 0) return <span className="text-muted-foreground/50">—</span>;
      return (
        <span className="inline-flex flex-wrap gap-1">
          {entries.slice(0, 6).map(([k, v]) => (
            <span key={k} className="font-mono text-[11px]">{k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
          ))}
          {entries.length > 6 && <span className="text-[11px] text-muted-foreground">+{entries.length - 6} alan</span>}
        </span>
      );
    }
  } catch { /* JSON değil, ham göster */ }
  return <span className="font-mono text-[11px]">{String(raw)}</span>;
}

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "300" });
      if (actorFilter) params.set("actor", actorFilter);
      if (tableFilter) params.set("table", tableFilter);
      if (actionTypeFilter !== "all" && actionTypeFilter !== "ozel") params.set("action_type", actionTypeFilter);
      const res = await fetch(`/api/audit-log?${params.toString()}`, { credentials: "include" });
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorFilter, tableFilter, actionTypeFilter]);

  const fmtDate = (d) => {
    if (!d) return "-";
    try {
      return new Date(d + (d.includes("Z") ? "" : "Z")).toLocaleString("tr-TR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return d; }
  };

  // "Özel" filtresi (role/bordro gibi sonek taşımayan eski aksiyonlar)
  // backend'de bir action_type karşılığı olmadığı için istemci tarafında süzülür.
  const displayed = actionTypeFilter === "ozel"
    ? rows.filter((r) => SPECIAL_ACTIONS[r.action])
    : rows;

  const actorOptions = useMemo(() => [...new Set(rows.map((r) => r.actor_email).filter(Boolean))].sort(), [rows]);
  const tableOptions = useMemo(() => [...new Set(rows.map((r) => r.target?.split(":")[0]).filter(Boolean))].sort(), [rows]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <ScrollText className="w-7 h-7 text-indigo-500" />
        <h1 className="text-2xl font-bold">Denetim Kaydı</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Kim, hangi ekranda, neyi (oluşturma/güncelleme/silme/geri alma) ne zaman değiştirdi.
      </p>

      {/* Filtreler */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {[
          { key: "all", label: "Tümü" },
          { key: "olusturuldu", label: "Oluşturuldu" },
          { key: "guncellendi", label: "Güncellendi" },
          { key: "silindi", label: "Silindi" },
          { key: "geri_alindi", label: "Geri Alındı" },
          { key: "ozel", label: "Özel (Rol/Bordro)" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setActionTypeFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              actionTypeFilter === f.key ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
        <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} className="ml-2 px-2 py-1.5 rounded-lg border border-border/50 bg-card text-xs">
          <option value="">Tüm kullanıcılar</option>
          {actorOptions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} className="px-2 py-1.5 rounded-lg border border-border/50 bg-card text-xs">
          <option value="">Tüm ekranlar</option>
          {tableOptions.map((t) => <option key={t} value={t}>{tableLabel(t)}</option>)}
        </select>
        {(actorFilter || tableFilter || actionTypeFilter !== "all") && (
          <button onClick={() => { setActorFilter(""); setTableFilter(""); setActionTypeFilter("all"); }} className="text-xs text-primary hover:underline">Filtreleri Temizle</button>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Yükleniyor...</div>
        ) : displayed.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Kayıt yok.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {displayed.map((row) => {
              const cfg = actionConfig(row.action);
              const Icon = cfg.icon;
              const [tableKey, targetId] = (row.target || "").split(":");
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
                        <span className="text-sm font-medium">
                          {SPECIAL_ACTIONS[row.action] ? row.target : `${tableLabel(tableKey)}${targetId ? ` · ${targetId.slice(0, 8)}` : ""}`}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                        {renderValue(row.old_value)}
                        {(row.old_value || row.new_value) && <span>→</span>}
                        {renderValue(row.new_value)}
                      </div>
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
