// Yönetim Merkezi'ndeki her widget'ın kimliği + görünen adı + varsayılan
// sütunu. Yalnızca metadata -- gerçek JSX AdminDashboard.jsx içinde,
// `widgetNodes` haritasında tanımlı. Bu dosya hem sayfa hem de "Widget'ları
// Düzenle" arayüzü tarafından paylaşılan tek doğruluk kaynağıdır.
//
// İki tür widget var:
// - Üst-seviye (topLevel: true, column dolu) — sütun dizilerinde yer alır,
//   sürükle-bırak ile taşınabilir, tek blok olarak kaldırılıp eklenebilir.
// - Alt-öğe (bir "parent" bileşik widget'a ait) — kendi başına sürüklenemez,
//   yalnızca göster/gizle (hidden dizisi) ile açılıp kapatılabilir; ait
//   olduğu bileşik widget'ın içinde sabit konumda render edilir.

export const WIDGET_DEFS = [
  // Sol sütun
  { id: "profil_karti", label: "Profil Kartı", column: "sol", topLevel: true },
  { id: "favoriler", label: "Favoriler", column: "sol", topLevel: true },
  { id: "hizli_islemler", label: "Hızlı İşlemler", column: "sol", topLevel: true },
  { id: "son_kullanilanlar", label: "Son Kullanılanlar", column: "sol", topLevel: true },
  // Orta sütun — üst-seviye (sürüklenebilir) bloklar
  { id: "duyuru", label: "Duyuru", column: "orta", topLevel: true },
  { id: "gorevlerim_pair", label: "Görevlerim + Benim İşlerim", column: "orta", topLevel: true },
  { id: "kpi_banner", label: "KPI Kartları", column: "orta", topLevel: true },
  { id: "sozlesme_bilet_pair", label: "Yaklaşan Sözleşme + Bilet Hareketi", column: "orta", topLevel: true },
  { id: "son_acik_biletler", label: "Son Açık Biletler", column: "orta", topLevel: true },
  // "gorevlerim_pair" alt-öğeleri
  { id: "gorevlerim", label: "Görevlerim", parent: "gorevlerim_pair" },
  { id: "benim_islerim", label: "Benim İşlerim", parent: "gorevlerim_pair" },
  // "kpi_banner" alt-öğeleri
  { id: "kpi_aktif_sozlesme", label: "Aktif Sözleşme (KPI)", parent: "kpi_banner" },
  { id: "kpi_toplam_musteri", label: "Toplam Müşteri (KPI)", parent: "kpi_banner" },
  { id: "kpi_aktif_personel", label: "Aktif Personel (KPI)", parent: "kpi_banner" },
  { id: "kpi_bordro_donemi", label: "Bordro Dönemi (KPI)", parent: "kpi_banner" },
  { id: "kpi_kritik_stok", label: "Kritik Stok (KPI)", parent: "kpi_banner" },
  { id: "kpi_acik_bilet", label: "Açık Bilet (KPI)", parent: "kpi_banner" },
  // "sozlesme_bilet_pair" alt-öğeleri
  { id: "yaklasan_sozlesme_bitisleri", label: "Yaklaşan Sözleşme Bitişleri", parent: "sozlesme_bilet_pair" },
  { id: "bilet_hareketi", label: "Son 7 Gün · Bilet Hareketi", parent: "sozlesme_bilet_pair" },
  // Sağ sütun
  { id: "hava_durumu", label: "Hava Durumu", column: "sag", topLevel: true },
  { id: "takvim", label: "Takvim", column: "sag", topLevel: true },
  { id: "yaklasan_takvim", label: "Yaklaşan Takvim", column: "sag", topLevel: true },
  { id: "ekip_bugun", label: "Ekip Bugün", column: "sag", topLevel: true },
  { id: "son_islemler", label: "Son İşlemler", column: "sag", topLevel: true },
];

export const DEFAULT_LAYOUT = {
  hidden: [],
  columns: {
    sol: ["profil_karti", "favoriler", "hizli_islemler", "son_kullanilanlar"],
    orta: ["duyuru", "gorevlerim_pair", "kpi_banner", "sozlesme_bilet_pair", "son_acik_biletler"],
    sag: ["hava_durumu", "takvim", "yaklasan_takvim", "ekip_bugun", "son_islemler"],
  },
};

const TOP_LEVEL_IDS = new Set(WIDGET_DEFS.filter((w) => w.topLevel).map((w) => w.id));
const ALL_IDS = new Set(WIDGET_DEFS.map((w) => w.id));

// Sunucudan gelen (varsa eski/eksik) düzeni bugünkü WIDGET_DEFS ile uzlaştırır:
// yeni eklenen üst-seviye widget id'leri varsayılan sütununa eklenir, artık
// var olmayan/üst-seviye olmaktan çıkmış id'ler sütun dizilerinden sessizce
// elenir. `hidden` yalnızca hâlâ bilinen id'lere göre süzülür (alt-öğe olsun
// üst-seviye olsun fark etmez).
export function reconcileLayout(saved) {
  if (!saved || !saved.columns) return DEFAULT_LAYOUT;
  const seen = new Set();
  const columns = { sol: [], orta: [], sag: [] };
  for (const col of ["sol", "orta", "sag"]) {
    for (const id of saved.columns[col] || []) {
      if (TOP_LEVEL_IDS.has(id) && !seen.has(id)) { columns[col].push(id); seen.add(id); }
    }
  }
  for (const def of WIDGET_DEFS) {
    if (def.topLevel && !seen.has(def.id)) columns[def.column].push(def.id);
  }
  const hidden = (saved.hidden || []).filter((id) => ALL_IDS.has(id));
  return { hidden, columns };
}

export function widgetLabel(id) {
  return WIDGET_DEFS.find((w) => w.id === id)?.label || id;
}

export function isTopLevelWidget(id) {
  return TOP_LEVEL_IDS.has(id);
}
