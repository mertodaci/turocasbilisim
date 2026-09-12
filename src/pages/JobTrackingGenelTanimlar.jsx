import { Tags } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";
import JobTrackingTicketStatuses from "@/pages/JobTrackingTicketStatuses";

const CATEGORIES = [
  { key: "bilet_tipi",       label: "Bilet Tipleri",    group: "Bilet" },
  { key: "bilet_durumlari",  label: "Bilet Durumları",  group: "Bilet", component: JobTrackingTicketStatuses },
];

const GROUPS = [
  { key: "Bilet", icon: Tags, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-200 dark:border-indigo-800" },
];

// İş Takip Yönetimi > Tanım — tek konsolide ekran. Eski ayrı sayfalar
// (JobTrackingTicketStatuses/JobTrackingTicketTypes.jsx) route/yetki
// anahtarlarıyla birlikte dokunulmadan duruyor, yalnızca nav'dan kaldırıldı.
export default function JobTrackingGenelTanimlar() {
  return (
    <DefinitionsScreen
      groups={GROUPS}
      categories={CATEGORIES}
      title="Genel Tanımlar"
      subtitle="Bilet tip ve durum tanımlarını yönetin"
    />
  );
}
