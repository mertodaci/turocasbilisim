import { Receipt } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";

const CATEGORIES = [
  { key: "abone_turu", label: "Abone Türleri", group: "Fatura" },
  { key: "fatura_tarife_turu", label: "Fatura Tarife Türleri", group: "Fatura" },
  { key: "tesisat_kullanim_yeri", label: "Tesisat Kullanım Yeri", group: "Fatura" },
];

const GROUPS = [
  { key: "Fatura", icon: Receipt, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800" },
];

export default function FaturaGenelTanimlar() {
  return (
    <DefinitionsScreen
      groups={GROUPS}
      categories={CATEGORIES}
      title="Genel Tanımlar"
      subtitle="Abone türü, fatura tarife türü ve tesisat kullanım yeri tanımlarını yönetin"
    />
  );
}
