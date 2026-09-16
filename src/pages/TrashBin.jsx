import { useState, useEffect, useMemo } from "react";
import { Trash2, RotateCcw, Building2, Boxes, Users2 } from "lucide-react";

// Backend'deki TRASH_TABLES (backend/src/index.js) ile hizalı — generic
// entityRouter soft-delete'in kapsadığı 25 tablonun hepsi burada. Grup
// başına küçük bir üst sekme + içinde tablo çipleri (25 düz sekme yerine).
const TABLES = [
  { key: "customers", label: "Müşteriler", nameField: "company_name", group: "Genel" },
  { key: "job_tickets", label: "Biletler", nameField: "title", group: "Genel" },
  { key: "job_projects", label: "Projeler", nameField: "name", group: "Genel" },
  { key: "job_kanban_boards", label: "Panolar", nameField: "name", group: "Genel" },
  { key: "employees", label: "Çalışanlar", nameField: "full_name", group: "Genel" },
  { key: "stok_urunler", label: "Ürünler", nameField: "ad", group: "Stok" },
  { key: "stok_depolar", label: "Depolar", nameField: "ad", group: "Stok" },
  { key: "stok_raflar", label: "Raflar", nameField: "ad", group: "Stok" },
  { key: "stok_sahalar", label: "Sahalar", nameField: "ad", group: "Stok" },
  { key: "stok_fisler", label: "Stok Fişleri", nameField: "fis_no", group: "Stok" },
  { key: "stok_sayimlar", label: "Sayımlar", nameField: "sayim_no", group: "Stok" },
  { key: "stok_personeller", label: "Stok Personelleri", nameField: "ad_soyad", group: "Stok" },
  { key: "stok_demirbaslar", label: "Demirbaşlar", nameField: "urun_adi", group: "Stok" },
  { key: "stok_rezervasyonlar", label: "Rezervasyonlar", nameField: "urun_adi", group: "Stok" },
  { key: "ik_subeler", label: "Şubeler", nameField: "ad", group: "İnsan Kaynakları" },
  { key: "ik_bolumler", label: "Bölümler", nameField: "ad", group: "İnsan Kaynakları" },
  { key: "ik_vardiyalar", label: "Vardiyalar", nameField: "ad", group: "İnsan Kaynakları" },
  { key: "ik_vardiya_planlari", label: "Vardiya Planları", nameField: "ad", group: "İnsan Kaynakları" },
  { key: "ik_mesai_kayitlari", label: "Mesai Kayıtları", nameField: "personel_adi", group: "İnsan Kaynakları" },
  { key: "ik_kesinti_planlari", label: "Kesinti Planları", nameField: "personel_adi", group: "İnsan Kaynakları" },
  { key: "ik_kesintiler", label: "Kesintiler", nameField: "personel_adi", group: "İnsan Kaynakları" },
  { key: "ik_ic_borclar", label: "İç Borçlar", nameField: "personel_adi", group: "İnsan Kaynakları" },
  { key: "ik_personel_masraf", label: "Personel Masrafları", nameField: "personel_adi", group: "İnsan Kaynakları" },
  { key: "ik_ozluk_evraklari", label: "Özlük Evrakları", nameField: "personel_adi", group: "İnsan Kaynakları" },
  { key: "ik_tutanaklar", label: "Tutanaklar", nameField: "personel_adi", group: "İnsan Kaynakları" },
  { key: "ik_izin_evraklari", label: "İzin Evrakları", nameField: "personel_adi", group: "İnsan Kaynakları" },
  { key: "ik_bordro_satirlari", label: "Bordro Satırları", nameField: "personel_adi", group: "İnsan Kaynakları" },
];
const GROUPS = [
  { key: "Genel", icon: Building2 },
  { key: "Stok", icon: Boxes },
  { key: "İnsan Kaynakları", icon: Users2 },
];

export default function TrashBin() {
  const [group, setGroup] = useState("Genel");
  const [active, setActive] = useState("customers");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const current = TABLES.find((t) => t.key === active);
  const groupTables = TABLES.filter((t) => t.group === group);

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

  // Grup değişince o gruptaki ilk tabloya geç.
  useEffect(() => {
    if (!groupTables.some((t) => t.key === active)) setActive(groupTables[0]?.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

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

  const filteredRows = useMemo(() => {
    if (!dateFrom && !dateTo) return rows;
    return rows.filter((r) => {
      const d = (r.deleted_at || r.updated_date || "").slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [rows, dateFrom, dateTo]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Trash2 className="w-7 h-7 text-rose-500" />
        <h1 className="text-2xl font-bold">Çöp Kutusu</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Silinen kayıtlar burada tutulur ve geri getirilebilir.
      </p>

      {/* Grup sekmeleri */}
      <div className="flex gap-2 mb-3">
        {GROUPS.map((g) => {
          const Icon = g.icon;
          return (
            <button
              key={g.key}
              onClick={() => setGroup(g.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                group === g.key
                  ? "bg-foreground text-background"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              {g.key}
            </button>
          );
        })}
      </div>

      {/* Tablo çipleri (seçili grup içinde) */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {groupTables.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              active === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tarih aralığı filtresi */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <label className="text-xs text-muted-foreground">Silinme tarihi:</label>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-2 py-1 rounded-lg border border-border/50 bg-card text-xs" />
        <span className="text-muted-foreground">—</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-2 py-1 rounded-lg border border-border/50 bg-card text-xs" />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-primary hover:underline">Temizle</button>
        )}
      </div>

      {/* Liste */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Yükleniyor...</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center">
            <Trash2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {current?.label} çöp kutusu boş.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredRows.map((row) => (
              <div key={row.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {row[current?.nameField] || "(isimsiz)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Silinme: {fmtDate(row.deleted_at || row.updated_date)}
                    {row.deleted_by && <> · Silen: <span className="font-medium text-foreground">{row.deleted_by}</span></>}
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
