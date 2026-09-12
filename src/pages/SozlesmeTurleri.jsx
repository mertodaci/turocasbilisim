import { FileText } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";

const CATEGORIES = [
  { key: "sozlesme_turu", label: "Sözleşme Türleri", group: "Sözleşme" },
];

const GROUPS = [
  { key: "Sözleşme", icon: FileText, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800" },
];

export default function SozlesmeTurleri() {
  return (
    <DefinitionsScreen
      groups={GROUPS}
      categories={CATEGORIES}
      title="Sözleşme Türleri"
      subtitle="Sözleşme oluştururken seçilebilecek türleri yönetin"
    />
  );
}
