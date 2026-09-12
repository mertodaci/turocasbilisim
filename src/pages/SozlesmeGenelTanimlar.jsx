import { FileText, Package } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";

const CATEGORIES = [
  { key: "sozlesme_turu", label: "Sözleşme Türleri", group: "Sözleşme" },
  { key: "urun",          label: "Ürünler",          group: "Ürün-Modül" },
  { key: "modul",         label: "Modüller",         group: "Ürün-Modül" },
];

const GROUPS = [
  { key: "Sözleşme",   icon: FileText, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800" },
  { key: "Ürün-Modül", icon: Package,  color: "text-teal-500",   bg: "bg-teal-50 dark:bg-teal-950/30",   border: "border-teal-200 dark:border-teal-800" },
];

// Sözleşme Yönetimi > Tanım — tek konsolide ekran. Eski ayrı sayfalar
// (SozlesmeTurleri/SozlesmeUrunler/SozlesmeModuller.jsx) route/yetki
// anahtarlarıyla birlikte dokunulmadan duruyor, yalnızca nav'dan kaldırıldı.
export default function SozlesmeGenelTanimlar() {
  return (
    <DefinitionsScreen
      groups={GROUPS}
      categories={CATEGORIES}
      title="Genel Tanımlar"
      subtitle="Sözleşme türü, ürün ve modül tanımlarını yönetin"
    />
  );
}
