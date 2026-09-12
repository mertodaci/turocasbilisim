import { Package } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";

const CATEGORIES = [
  { key: "modul", label: "Modüller", group: "Modül" },
];

const GROUPS = [
  { key: "Modül", icon: Package, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950/30", border: "border-teal-200 dark:border-teal-800" },
];

export default function SozlesmeModuller() {
  return (
    <DefinitionsScreen
      groups={GROUPS}
      categories={CATEGORIES}
      title="Modüller"
      subtitle="Ürünlere bağlı modülleri ve destek panosu eşleşmelerini yönetin"
    />
  );
}
