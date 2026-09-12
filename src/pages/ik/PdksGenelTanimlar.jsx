import { Clock } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";
import IkVardiyalar from "@/pages/ik/IkVardiyalar";
import IkVardiyaPlanlari from "@/pages/ik/IkVardiyaPlanlari";

const CATEGORIES = [
  { key: "vardiyalar",      label: "Vardiya Tanımları",          group: "Vardiya", component: IkVardiyalar },
  { key: "vardiya_planlari",label: "Döngüsel Vardiya Planları",  group: "Vardiya", component: IkVardiyaPlanlari },
];

const GROUPS = [
  { key: "Vardiya", icon: Clock, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800" },
];

// Pdks Yönetimi > Tanım — tek konsolide ekran. Eski ayrı sayfalar
// (IkVardiyalar/IkVardiyaPlanlari.jsx) route/yetki anahtarlarıyla birlikte
// dokunulmadan duruyor, yalnızca nav'dan kaldırıldı.
export default function PdksGenelTanimlar() {
  return (
    <DefinitionsScreen
      groups={GROUPS}
      categories={CATEGORIES}
      title="Genel Tanımlar"
      subtitle="Vardiya tanımlarını ve döngüsel planlarını yönetin"
    />
  );
}
