import { FileSignature } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";

const CATEGORIES = [
  { key: "ebys_evrak_turu", label: "Evrak Türleri", group: "Evrak Yönetimi" },
];

const GROUPS = [
  { key: "Evrak Yönetimi", icon: FileSignature, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-200 dark:border-indigo-800" },
];

export default function EbysTanimlar() {
  return (
    <DefinitionsScreen
      groups={GROUPS}
      categories={CATEGORIES}
      title="Evrak Tanımları"
      subtitle="Gelen/giden evrak oluştururken seçilebilecek türleri yönetin"
    />
  );
}
