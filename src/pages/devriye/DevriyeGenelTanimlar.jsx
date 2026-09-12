import { Radar } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";
import DevriyeLokasyon from "@/pages/devriye/DevriyeLokasyon";
import DevriyeVardiyaTanim from "@/pages/devriye/DevriyeVardiyaTanim";

const CATEGORIES = [
  { key: "lokasyon", label: "Lokasyon & Checkpoint",  group: "Devriye", component: DevriyeLokasyon },
  { key: "vardiya",  label: "Vardiya Tanımları",      group: "Devriye", component: DevriyeVardiyaTanim },
];

const GROUPS = [
  { key: "Devriye", icon: Radar, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800" },
];

// Devriye Yönetimi > Tanım — tek konsolide ekran. Eski ayrı sayfalar
// (DevriyeLokasyon/DevriyeVardiyaTanim.jsx) route/yetki anahtarlarıyla
// birlikte dokunulmadan duruyor, yalnızca nav'dan kaldırıldı.
export default function DevriyeGenelTanimlar() {
  return (
    <DefinitionsScreen
      groups={GROUPS}
      categories={CATEGORIES}
      title="Genel Tanımlar"
      subtitle="Lokasyon, checkpoint ve vardiya tanımlarını yönetin"
    />
  );
}
