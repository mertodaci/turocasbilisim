import { FileText } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";

const CATEGORIES = [
  { key: "sozlesme_turu", label: "Sözleşme Türleri", group: "Sözleşme" },
];

const GROUPS = [
  { key: "Sözleşme", icon: FileText, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800" },
];

// Sözleşme Yönetimi > Tanım — tek konsolide ekran. Eski ayrı sayfalar
// (SozlesmeTurleri/SozlesmeUrunler/SozlesmeModuller.jsx) route/yetki
// anahtarlarıyla birlikte dokunulmadan duruyor, yalnızca nav'dan kaldırıldı.
// Ürün-Modül grubu İş Takip Yönetimi > Tanım'a taşındı (JobTrackingGenelTanimlar.jsx).
export default function SozlesmeGenelTanimlar() {
  return (
    <DefinitionsScreen
      groups={GROUPS}
      categories={CATEGORIES}
      title="Genel Tanımlar"
      subtitle="Sözleşme türü tanımlarını yönetin"
    />
  );
}
