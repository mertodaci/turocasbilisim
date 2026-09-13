import { Tags, Package } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";
import JobTrackingTicketStatuses from "@/pages/JobTrackingTicketStatuses";

const CATEGORIES = [
  { key: "bilet_tipi",       label: "Bilet Tipleri",    group: "Bilet" },
  { key: "bilet_durumlari",  label: "Bilet Durumları",  group: "Bilet", component: JobTrackingTicketStatuses },
  { key: "urun",             label: "Ürünler",          group: "Ürün-Modül" },
  { key: "modul",            label: "Modüller",         group: "Ürün-Modül" },
];

const GROUPS = [
  { key: "Bilet",      icon: Tags,    color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-200 dark:border-indigo-800" },
  { key: "Ürün-Modül", icon: Package, color: "text-teal-500",   bg: "bg-teal-50 dark:bg-teal-950/30",     border: "border-teal-200 dark:border-teal-800" },
];

// İş Takip Yönetimi > Tanım — tek konsolide ekran. Eski ayrı sayfalar
// (JobTrackingTicketStatuses/JobTrackingTicketTypes.jsx) route/yetki
// anahtarlarıyla birlikte dokunulmadan duruyor, yalnızca nav'dan kaldırıldı.
// Ürün-Modül grubu Sözleşme Yönetimi > Tanım'dan buraya taşındı
// (SozlesmeGenelTanimlar.jsx) — aynı "definitions" tablosu/kategori adları,
// yalnızca hangi sayfanın gösterdiği değişti.
export default function JobTrackingGenelTanimlar() {
  return (
    <DefinitionsScreen
      groups={GROUPS}
      categories={CATEGORIES}
      title="Genel Tanımlar"
      subtitle="Bilet tip/durum, ürün ve modül tanımlarını yönetin"
    />
  );
}
