// Yönetim Merkezi'ndeki her widget'ın kimliği + görünen adı + varsayılan
// sütunu. Yalnızca metadata -- gerçek JSX AdminDashboard.jsx içinde,
// `widgetNodes` haritasında tanımlı. Bu dosya hem sayfa hem de "Widget'ları
// Düzenle" arayüzü tarafından paylaşılan tek doğruluk kaynağıdır.

export const WIDGET_DEFS = [
  // Sol sütun
  { id: "favoriler", label: "Favoriler", column: "sol" },
  { id: "hizli_islemler", label: "Hızlı İşlemler", column: "sol" },
  { id: "son_kullanilanlar", label: "Son Kullanılanlar", column: "sol" },
  // Orta sütun
  { id: "duyuru", label: "Duyuru", column: "orta" },
  { id: "gorevlerim", label: "Görevlerim", column: "orta" },
  { id: "benim_islerim", label: "Benim İşlerim", column: "orta" },
  { id: "kpi_aktif_sozlesme", label: "Aktif Sözleşme", column: "orta" },
  { id: "kpi_toplam_musteri", label: "Toplam Müşteri", column: "orta" },
  { id: "kpi_aktif_personel", label: "Aktif Personel", column: "orta" },
  { id: "kpi_bordro_donemi", label: "Bordro Dönemi", column: "orta" },
  { id: "kpi_kritik_stok", label: "Kritik Stok", column: "orta" },
  { id: "kpi_acik_bilet", label: "Açık Bilet", column: "orta" },
  { id: "yaklasan_sozlesme_bitisleri", label: "Yaklaşan Sözleşme Bitişleri", column: "orta" },
  { id: "bilet_hareketi", label: "Son 7 Gün · Bilet Hareketi", column: "orta" },
  { id: "son_acik_biletler", label: "Son Açık Biletler", column: "orta" },
  // Sağ sütun
  { id: "takvim", label: "Takvim", column: "sag" },
  { id: "yaklasan_takvim", label: "Yaklaşan Takvim", column: "sag" },
  { id: "ekip_bugun", label: "Ekip Bugün", column: "sag" },
  { id: "son_islemler", label: "Son İşlemler", column: "sag" },
];

export const DEFAULT_LAYOUT = {
  hidden: [],
  columns: {
    sol: ["favoriler", "hizli_islemler", "son_kullanilanlar"],
    orta: [
      "duyuru", "gorevlerim", "benim_islerim",
      "kpi_aktif_sozlesme", "kpi_toplam_musteri",
      "kpi_aktif_personel", "kpi_bordro_donemi", "kpi_kritik_stok", "kpi_acik_bilet",
      "yaklasan_sozlesme_bitisleri", "bilet_hareketi", "son_acik_biletler",
    ],
    sag: ["takvim", "yaklasan_takvim", "ekip_bugun", "son_islemler"],
  },
};

const ALL_IDS = WIDGET_DEFS.map((w) => w.id);

// Sunucudan gelen (varsa eski/eksik) düzeni bugünkü WIDGET_DEFS ile uzlaştırır:
// yeni eklenen widget id'leri varsayılan sütununa eklenir, artık var olmayan
// id'ler (ör. eski bir sürümden kalan) sessizce atlanır.
export function reconcileLayout(saved) {
  if (!saved || !saved.columns) return DEFAULT_LAYOUT;
  const known = new Set(ALL_IDS);
  const seen = new Set();
  const columns = { sol: [], orta: [], sag: [] };
  for (const col of ["sol", "orta", "sag"]) {
    for (const id of saved.columns[col] || []) {
      if (known.has(id) && !seen.has(id)) { columns[col].push(id); seen.add(id); }
    }
  }
  const hidden = (saved.hidden || []).filter((id) => known.has(id) && !seen.has(id));
  hidden.forEach((id) => seen.add(id));
  // Bu düzende hiç görünmeyen (yeni eklenmiş) widget'lar varsayılan sütununa eklenir.
  for (const def of WIDGET_DEFS) {
    if (!seen.has(def.id)) columns[def.column].push(def.id);
  }
  return { hidden, columns };
}

export function widgetLabel(id) {
  return WIDGET_DEFS.find((w) => w.id === id)?.label || id;
}
