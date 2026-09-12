import { Package, Warehouse, Building2 } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";
import StokUrunler from "@/pages/stok/StokUrunler";
import StokGruplar from "@/pages/stok/StokGruplar";
import StokUrunRaf from "@/pages/stok/StokUrunRaf";
import StokDepolar from "@/pages/stok/StokDepolar";
import StokRaflar from "@/pages/stok/StokRaflar";
import StokSahalar from "@/pages/stok/StokSahalar";
import StokZimmetYerleri from "@/pages/stok/StokZimmetYerleri";
import StokTedarikciler from "@/pages/stok/StokTedarikciler";

const CATEGORIES = [
  { key: "urunler",      label: "Malzeme Tanımı",       group: "Ürün", component: StokUrunler },
  { key: "gruplar",      label: "Ürün Grupları",        group: "Ürün", component: StokGruplar },
  { key: "urun_raf",     label: "Ürün - Raf Atama",     group: "Ürün", component: StokUrunRaf },
  { key: "depolar",      label: "Depolar",              group: "Depo & Konum", component: StokDepolar },
  { key: "raflar",       label: "Raf Tanımları",        group: "Depo & Konum", component: StokRaflar },
  { key: "sahalar",      label: "Sahalar / Projeler",   group: "Depo & Konum", component: StokSahalar },
  { key: "zimmet_yerleri", label: "Zimmet Yeri Tanımları", group: "Depo & Konum", component: StokZimmetYerleri },
  { key: "tedarikciler", label: "Tedarikçiler",         group: "Tedarik", component: StokTedarikciler },
];

const GROUPS = [
  { key: "Ürün",          icon: Package,   color: "text-blue-500",  bg: "bg-blue-50 dark:bg-blue-950/30",  border: "border-blue-200 dark:border-blue-800" },
  { key: "Depo & Konum",  icon: Warehouse, color: "text-teal-500",  bg: "bg-teal-50 dark:bg-teal-950/30",  border: "border-teal-200 dark:border-teal-800" },
  { key: "Tedarik",       icon: Building2, color: "text-purple-500",bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800" },
];

// Stok / Depo Yönetimi > Tanım — tek konsolide ekran. Eski ayrı sayfalar
// (StokUrunler/StokGruplar/StokDepolar/StokRaflar/StokUrunRaf/StokSahalar/
// StokZimmetYerleri/StokTedarikciler.jsx) route/yetki anahtarlarıyla
// birlikte dokunulmadan duruyor, yalnızca nav'dan kaldırıldı.
export default function StokGenelTanimlar() {
  return (
    <DefinitionsScreen
      groups={GROUPS}
      categories={CATEGORIES}
      title="Genel Tanımlar"
      subtitle="Ürün, depo/konum ve tedarikçi tanımlarını yönetin"
    />
  );
}
