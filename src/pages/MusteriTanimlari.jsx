import { Building2 } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";

const CATEGORIES = [
  { key: "musteri_tipi",   label: "Müşteri Tipleri",   group: "Müşteri" },
  { key: "musteri_detayi", label: "Müşteri Detayları", group: "Müşteri" },
  { key: "sehir",          label: "Şehirler",           group: "Müşteri" },
];

const GROUPS = [
  { key: "Müşteri", icon: Building2, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800" },
];

export default function MusteriTanimlari() {
  return (
    <DefinitionsScreen
      groups={GROUPS}
      categories={CATEGORIES}
      title="Genel Tanımlar"
      subtitle="Müşteri tiplerini, detaylarını ve şehirleri yönetin"
    />
  );
}
